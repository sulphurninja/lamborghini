import connectDB from '@/lib/mongoose';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    await connectDB();

    try {
        const { key } = await req.json();

        if (!key) {
            return NextResponse.json(
                {
                    error: 'Key is required',
                    success: false,
                    debug: 'No key provided in request body'
                },
                { status: 400 }
            );
        }

        console.log('Web app login attempt for key:', key.substring(0, 10) + '...');

        const user = await User.findOne({ key }).populate('createdBy', 'key role');

        if (!user) {
            return NextResponse.json(
                {
                    error: 'Invalid key',
                    success: false,
                    debug: 'No user found with the provided key'
                },
                { status: 401 }
            );
        }

        // Check if plan has expired
        const now = new Date();
        const isExpired = user.plan_expiry < now;

        if (isExpired) {
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

        // Check if user has appropriate role for web app access
        const allowedRoles = ['admin', 'super-seller', 'seller'];
        if (!allowedRoles.includes(user.role)) {
            return NextResponse.json(
                {
                    error: 'Access denied',
                    success: false,
                    debug: 'User role does not have access to web application'
                },
                { status: 403 }
            );
        }

        const remainingMilliseconds = user.plan_expiry.getTime() - now.getTime();
        const remainingDays = Math.ceil(remainingMilliseconds / 86400000);

        console.log('Web app login successful for user:', user._id, 'Role:', user.role);

        return NextResponse.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                key: user.key,
                role: user.role,
                credits: user.credits,
                pricing: user.pricing,
                createdBy: user.createdBy,
                createdAt: user.createdAt
            },
            plan_expiry: user.plan_expiry,
            isActive: true,
            remainingDays,
            debug: `Login successful. Plan expires in ${remainingDays} days`
        });

    } catch (error: any) {
        console.error('Web app login error:', error);
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