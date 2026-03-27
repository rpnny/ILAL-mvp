import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePasswordStrength } from '@/lib/server/password';
import { signAccessToken, signRefreshToken } from '@/lib/server/jwt';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Invalid request data',
          details: parsed.error.errors.map(e => e.message),
        },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    const strengthErrors = validatePasswordStrength(password);
    if (strengthErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Password does not meet requirements',
          details: strengthErrors,
        },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Email already registered' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name: name || null },
      select: { id: true, email: true, name: true, plan: true, createdAt: true },
    });

    const accessToken = signAccessToken({ userId: user.id, email: user.email, plan: user.plan });
    const refreshToken = signRefreshToken({ userId: user.id });

    return NextResponse.json(
      { message: 'Registration successful', user, accessToken, refreshToken },
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
