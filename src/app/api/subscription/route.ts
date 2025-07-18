
import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const querySchema = z.object({
  username: z.string().min(3),
});

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const validation = querySchema.safeParse({
      username: searchParams.get('username'),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { username } = validation.data;

    const user = await User.findOne({ 'subs_credentials.user_name': username });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }


    // Critical fix: Handle missing/invalid expiry dates
    if (!user.plan_expiry || !(user.plan_expiry instanceof Date)) {
      return NextResponse.json({
        valid: false,
        error: "No active subscription",
        expiry: null,
        remaining_days: 0
      }, { status: 200 });
    }

    const currentDate = new Date();
    const expiryDate = new Date(user.plan_expiry);
    const isActive = expiryDate > currentDate;
    const remainingDays = isActive
      ? Math.ceil((expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return NextResponse.json({
      isActive: isActive,
      expiry: expiryDate.toISOString(),
      remaining_days: remainingDays
    });

  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message
      },
      { status: 500 }
    );
  }
}
