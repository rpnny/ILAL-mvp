import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/server/password';
import { signAccessToken, signRefreshToken } from '@/lib/server/jwt';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const accessToken = signAccessToken({ userId: user.id, email: user.email, plan: user.plan });
    const refreshToken = signRefreshToken({ userId: user.id });

    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    console.error('Login error:', err.message);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Login failed' },
      { status: 500 }
    );
  }
}
