import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/server/jwt';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    verifyAccessToken(auth.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Return empty stats for now
  return NextResponse.json({
    stats: {
      totalRequests: 0,
      requestsThisMonth: 0,
      successRate: 100,
      avgResponseTime: 0,
      byEndpoint: [],
      byDay: [],
    },
  });
}
