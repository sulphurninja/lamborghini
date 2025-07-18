import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import { NextResponse } from 'next/server';

// GET - List all users
export async function GET(req: Request) {
  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    console.log('Admin users list request:', { page, limit, search, role });

    // Build query
    let query: any = {};
    if (search) {
      query.key = { $regex: search, $options: 'i' };
    }
    if (role) {
      query.role = role;
    }

    // Get total count
    const total = await User.countDocuments(query);

    // Get users with pagination
    const users = await User.find(query)
      .populate('createdBy', 'key role')
      .select('key plan_expiry role credits pricing createdBy createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Add computed fields
    const usersWithStatus = users.map(user => {
      const now = new Date();
      const isExpired = user.plan_expiry < now;
      const remainingDays = isExpired 
        ? Math.ceil((now.getTime() - user.plan_expiry.getTime()) / 86400000)
        : Math.ceil((user.plan_expiry.getTime() - now.getTime()) / 86400000);

      return {
        id: user._id,
        key: user.key,
        plan_expiry: user.plan_expiry,
        role: user.role,
        credits: user.credits,
        pricing: user.pricing,
        createdBy: user.createdBy,
        createdAt: user.createdAt,
        isExpired,
        remainingDays: isExpired ? -Math.abs(remainingDays) : remainingDays,
        status: isExpired ? 'expired' : 'active'
      };
    });

    return NextResponse.json({
      success: true,
      users: usersWithStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      debug: `Retrieved ${users.length} users out of ${total} total`
    });

  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve users',
        success: false,
        debug: 'Server error occurred while fetching users',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(req: Request) {
  await connectDB();

  try {
    const { key, plan_expiry, role, credits, pricing, createdBy } = await req.json();

    console.log('Admin create user request:', { 
      key: key?.substring(0, 10) + '...', 
      plan_expiry, 
      role, 
      credits,
      pricing
    });

    // Validate input
    if (!key || !plan_expiry || !role) {
      return NextResponse.json(
        { 
          error: 'Key, plan_expiry, and role are required',
          success: false,
          debug: 'Missing required fields'
        },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['admin', 'super-seller', 'seller', 'user'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { 
          error: 'Invalid role',
          success: false,
          debug: `Role must be one of: ${validRoles.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ key });
    if (existingUser) {
      return NextResponse.json(
        { 
          error: 'User with this key already exists',
          success: false,
          debug: 'A user with this key already exists in the database'
        },
        { status: 409 }
      );
    }

    // If createdBy is provided, check if creator has enough credits
    if (createdBy) {
      const creator = await User.findById(createdBy);
      if (!creator) {
        return NextResponse.json(
          { 
            error: 'Creator not found',
            success: false,
            debug: 'The specified creator does not exist'
          },
          { status: 404 }
        );
      }

      // Determine cost based on role being created
      let cost = 0;
      if (role === 'seller' && creator.pricing.seller_creation_cost) {
        cost = creator.pricing.seller_creation_cost;
      } else if (role === 'user' && creator.pricing.user_creation_cost) {
        cost = creator.pricing.user_creation_cost;
      }

      if (cost > 0 && creator.credits < cost) {
        return NextResponse.json(
          { 
            error: 'Insufficient credits',
            success: false,
            debug: `Creator has ${creator.credits} credits but needs ${cost} credits`
          },
          { status: 402 }
        );
      }

      // Deduct credits from creator
      if (cost > 0) {
        await User.findByIdAndUpdate(createdBy, { 
          $inc: { credits: -cost } 
        });
      }
    }

    // Create new user
    const newUser = new User({
      key,
      plan_expiry: new Date(plan_expiry),
      role,
      credits: credits || 0,
      pricing: pricing || { seller_creation_cost: 0, user_creation_cost: 0 },
      createdBy: createdBy || null
    });

    await newUser.save();

    const populatedUser = await User.findById(newUser._id).populate('createdBy', 'key role');

    console.log('User created successfully:', {
      id: newUser._id,
      key: newUser.key.substring(0, 10) + '...',
      role: newUser.role,
      credits: newUser.credits
    });

    // Return created user with status
    const now = new Date();
    const isExpired = newUser.plan_expiry < now;
    const remainingDays = isExpired 
      ? -Math.ceil((now.getTime() - newUser.plan_expiry.getTime()) / 86400000)
      : Math.ceil((newUser.plan_expiry.getTime() - now.getTime()) / 86400000);

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: populatedUser._id,
        key: populatedUser.key,
        plan_expiry: populatedUser.plan_expiry,
        role: populatedUser.role,
        credits: populatedUser.credits,
        pricing: populatedUser.pricing,
        createdBy: populatedUser.createdBy,
        createdAt: populatedUser.createdAt,
        isExpired,
        remainingDays,
        status: isExpired ? 'expired' : 'active'
      },
      debug: 'User created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Admin create user error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create user',
        success: false,
        debug: 'Server error occurred while creating user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}