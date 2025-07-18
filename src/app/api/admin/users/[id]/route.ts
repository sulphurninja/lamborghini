import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// GET - Get single user by ID
export async function GET(req: Request, { params }: { params: { id: string } }) {
  await connectDB();

  try {
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { 
          error: 'Invalid user ID format',
          success: false,
          debug: 'The provided ID is not a valid MongoDB ObjectId'
        },
        { status: 400 }
      );
    }

    const user = await User.findById(id).populate('createdBy', 'key role');

    if (!user) {
      return NextResponse.json(
        { 
          error: 'User not found',
          success: false,
          debug: 'No user found with the provided ID'
        },
        { status: 404 }
      );
    }

    const now = new Date();
    const isExpired = user.plan_expiry < now;
    const remainingDays = isExpired 
      ? -Math.ceil((now.getTime() - user.plan_expiry.getTime()) / 86400000)
      : Math.ceil((user.plan_expiry.getTime() - now.getTime()) / 86400000);

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        key: user.key,
        plan_expiry: user.plan_expiry,
        role: user.role,
        credits: user.credits,
        pricing: user.pricing,
        createdBy: user.createdBy,
        createdAt: user.createdAt,
        isExpired,
        remainingDays,
        status: isExpired ? 'expired' : 'active'
      },
      debug: 'User retrieved successfully'
    });

  } catch (error) {
    console.error('Admin get user error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve user',
        success: false,
        debug: 'Server error occurred while fetching user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// PUT - Update user by ID
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  await connectDB();

  try {
    const { id } = params;
    const { key, plan_expiry, role, credits, pricing } = await req.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { 
          error: 'Invalid user ID format',
          success: false,
          debug: 'The provided ID is not a valid MongoDB ObjectId'
        },
        { status: 400 }
      );
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { 
          error: 'User not found',
          success: false,
          debug: 'No user found with the provided ID'
        },
        { status: 404 }
      );
    }

    // Check if new key conflicts with existing user
    if (key && key !== user.key) {
      const existingUser = await User.findOne({ key, _id: { $ne: id } });
      if (existingUser) {
        return NextResponse.json(
          { 
            error: 'User with this key already exists',
            success: false,
            debug: 'Another user already has this key'
          },
          { status: 409 }
        );
      }
    }

    // Validate role if provided
    if (role) {
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
    }

    // Update user fields
    const updateData: any = {};
    if (key !== undefined) updateData.key = key;
    if (plan_expiry !== undefined) updateData.plan_expiry = new Date(plan_expiry);
    if (role !== undefined) updateData.role = role;
    if (credits !== undefined) updateData.credits = credits;
    if (pricing !== undefined) updateData.pricing = pricing;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'key role');

    const now = new Date();
    const isExpired = updatedUser.plan_expiry < now;
    const remainingDays = isExpired 
      ? -Math.ceil((now.getTime() - updatedUser.plan_expiry.getTime()) / 86400000)
      : Math.ceil((updatedUser.plan_expiry.getTime() - now.getTime()) / 86400000);

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser._id,
        key: updatedUser.key,
        plan_expiry: updatedUser.plan_expiry,
        role: updatedUser.role,
        credits: updatedUser.credits,
        pricing: updatedUser.pricing,
        createdBy: updatedUser.createdBy,
        createdAt: updatedUser.createdAt,
        isExpired,
        remainingDays,
        status: isExpired ? 'expired' : 'active'
      },
      debug: 'User updated successfully'
    });

  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update user',
        success: false,
        debug: 'Server error occurred while updating user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete user by ID  
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  await connectDB();

  try {
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { 
          error: 'Invalid user ID format',
          success: false,
          debug: 'The provided ID is not a valid MongoDB ObjectId'
        },
        { status: 400 }
      );
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return NextResponse.json(
        { 
          error: 'User not found',
          success: false,
          debug: 'No user found with the provided ID'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      deletedUser: {
        id: deletedUser._id,
        key: deletedUser.key,
        role: deletedUser.role,
        credits: deletedUser.credits
      },
      debug: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Admin delete user error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete user',
        success: false,
        debug: 'Server error occurred while deleting user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}