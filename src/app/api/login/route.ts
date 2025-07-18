import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  await connectDB();

  try {
    const { key } = await req.json();

    // Validate input
    if (!key) {
      console.log('Login attempt failed: No key provided');
      return NextResponse.json(
        {
          error: 'Key is required',
          success: false,
          debug: 'No key provided in request body'
        },
        { status: 400 }
      );
    }

    console.log('Login attempt for key:', key.substring(0, 10) + '...');

    // Find user by key
    const user = await User.findOne({ key });

    if (!user) {
      console.log('Login failed: User not found for key:', key.substring(0, 10) + '...');
      return NextResponse.json(
        {
          error: 'Invalid key',
          success: false,
          debug: 'No user found with the provided key'
        },
        { status: 401 }
      );
    }

    console.log('User found:', {
      id: user._id,
      key: user.key.substring(0, 10) + '...',
      plan_expiry: user.plan_expiry,
      isAdmin: user.isAdmin
    });

    // Check if plan has expired
    const now = new Date();
    const isExpired = user.plan_expiry < now;

    if (isExpired) {
      console.log('Login failed: Plan expired for user:', user._id);
      const expiredDays = Math.ceil((now.getTime() - user.plan_expiry.getTime()) / 86400000);
      return NextResponse.json(
        {
          error: 'Subscription expired',
          success: false,
          debug: `Plan expired ${expiredDays} days ago`,
          plan_expiry: user.plan_expiry,
          expired_days_ago: expiredDays
        },
        { status: 403 }
      );
    }

    // Calculate remaining days
    const remainingMilliseconds = user.plan_expiry.getTime() - now.getTime();
    const remainingDays = Math.ceil(remainingMilliseconds / 86400000);

    console.log('Login successful for user:', user._id, 'Remaining days:', remainingDays);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        key: user.key,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      },
      plan_expiry: user.plan_expiry,
      isActive: true,
      remainingDays,
      debug: `Login successful. Plan expires in ${remainingDays} days`
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        debug: 'Server error occurred during login process',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}