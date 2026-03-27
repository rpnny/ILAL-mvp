import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRefreshToken, signAccessToken } from '@/lib/server/jwt';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Refresh token required' },
        { status: 400 }
      );
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not found' },
        { status: 401 }
      );
    }

    const accessToken = signAccessToken({ userId: user.id, email: user.email, plan: user.plan });
    return NextResponse.json({ accessToken });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid refresh token' },
      { status: 401 }
    );
  }
}
