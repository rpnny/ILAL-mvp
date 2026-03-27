import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/server/jwt';

function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return verifyAccessToken(auth.slice(7));
  } catch {
    return null;
  }
}

// DELETE /api/v1/apikeys/:id — revoke API key
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = await prisma.apiKey.findFirst({
    where: { id: params.id, userId: user.userId },
  });

  if (!key) return NextResponse.json({ error: 'Not Found', message: 'API key not found' }, { status: 404 });

  await prisma.apiKey.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json({ message: 'API key revoked successfully' });
}
