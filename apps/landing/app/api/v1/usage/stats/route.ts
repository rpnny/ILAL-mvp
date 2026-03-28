import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/server/jwt';

const PLAN_LIMITS: Record<string, { monthlyCallLimit: number; maxApiKeys: number; rateLimit: number }> = {
  FREE:       { monthlyCallLimit: 1000,  maxApiKeys: 2,         rateLimit: 10  },
  PRO:        { monthlyCallLimit: 50000, maxApiKeys: 10,        rateLimit: 100 },
  ENTERPRISE: { monthlyCallLimit: -1,    maxApiKeys: Infinity,  rateLimit: 1000 },
};

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let payload: any;
  try {
    payload = verifyAccessToken(auth.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const plan = (payload.plan as string) || 'FREE';
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  return NextResponse.json({
    currentPeriod: {
      calls: 0,
      startDate: startOfMonth,
      endDate: endOfMonth,
    },
    limits: {
      monthlyCallLimit: limits.monthlyCallLimit,
      maxApiKeys: limits.maxApiKeys === Infinity ? -1 : limits.maxApiKeys,
      rateLimit: limits.rateLimit,
    },
    recentCalls: [],
    byDay: [],
    note: 'Usage tracking is not yet implemented. Call counts will be available in a future release.',
  });
}
