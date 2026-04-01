import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/server/password';
import { signAccessToken, signRefreshToken } from '@/lib/server/jwt';

const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  name: z.string().min(1).max(100).optional(),
  inviteCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: 'Validation Error', message: firstError?.message ?? 'Invalid request data' },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Conflict', message: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name ?? null,
        plan: 'free',
      },
    });

    const accessToken = signAccessToken({ userId: user.id, email: user.email, plan: user.plan });
    const refreshToken = signRefreshToken({ userId: user.id });

    return NextResponse.json(
      {
        message: 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          createdAt: user.createdAt,
        },
        accessToken,
        refreshToken,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Register error:', err.message);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Registration failed' },
      { status: 500 }
    );
  }
}
