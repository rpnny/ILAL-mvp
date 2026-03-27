import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    plans: [
      { id: 'FREE', name: 'Free', price: 0, monthlyQuota: 1000, rateLimit: 10, features: ['1,000 API calls/month', '10 req/min', '2 API keys'] },
      { id: 'PRO', name: 'Pro', price: 99, monthlyQuota: 50000, rateLimit: 100, features: ['50,000 API calls/month', '100 req/min', '10 API keys', 'Priority support'] },
      { id: 'ENTERPRISE', name: 'Enterprise', price: null, monthlyQuota: -1, rateLimit: 1000, features: ['Unlimited API calls', '1,000 req/min', 'Unlimited API keys', 'Dedicated support', 'SLA guarantee'] },
    ],
  });
}
