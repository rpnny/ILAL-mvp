import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/server/jwt';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Bearer token required' },
        { status: 401 }
      );
    }

    const token = auth.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, plan: true, walletAddress: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid token' },
      { status: 401 }
    );
  }
}
