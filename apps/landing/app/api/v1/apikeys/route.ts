import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/server/jwt';
import { generateApiKey, hashApiKey, extractApiKeyPrefix } from '@/lib/server/apikey';

function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return verifyAccessToken(auth.slice(7));
  } catch {
    return null;
  }
}

// GET /api/v1/apikeys — list API keys
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKeys = await prisma.apiKey.findMany({
    where: { userId: user.userId, isActive: true },
    select: { id: true, name: true, keyPrefix: true, permissions: true, rateLimit: true, isActive: true, lastUsedAt: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ apiKeys });
}

// POST /api/v1/apikeys — create API key
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const schema = z.object({
    name: z.string().min(1).max(100),
    permissions: z.array(z.string()).default(['verify', 'session']),
    rateLimit: z.number().int().min(1).max(10000).optional(),
  });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad Request', message: 'Invalid request data', details: parsed.error.errors.map(e => e.message) }, { status: 400 });
  }

  const { name, permissions, rateLimit } = parsed.data;

  const existing = await prisma.apiKey.count({ where: { userId: user.userId, isActive: true } });
  const maxKeys = user.plan === 'FREE' ? 2 : user.plan === 'PRO' ? 10 : 100;
  if (existing >= maxKeys) {
    return NextResponse.json({ error: 'Forbidden', message: `Maximum ${maxKeys} API keys for ${user.plan} plan` }, { status: 403 });
  }

  const rawKey = generateApiKey('live');
  const keyHash = await hashApiKey(rawKey);
  const prefix = extractApiKeyPrefix(rawKey);

  const created = await prisma.apiKey.create({
    data: {
      userId: user.userId,
      key: keyHash,
      keyPrefix: prefix,
      name,
      permissions: permissions.join(','),
      rateLimit: rateLimit || 10,
    },
    select: { id: true, name: true, keyPrefix: true, permissions: true, rateLimit: true, createdAt: true, expiresAt: true },
  });

  return NextResponse.json({
    apiKey: rawKey,
    ...created,
    warning: 'Save this key now — it will not be shown again.',
  }, { status: 201 });
}
