import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://ilal-mvp-production.up.railway.app';

const FORWARDED_REQUEST_HEADERS = [
  'authorization',
  'x-api-key',
  'content-type',
  'accept',
] as const;

async function proxy(
  req: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const target = `${BACKEND_URL}/api/v1/${pathSegments.join('/')}`;
  const url = new URL(target);

  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = ['POST', 'PUT', 'PATCH'].includes(req.method);

  try {
    const upstream = await fetch(url.toString(), {
      method: req.method,
      headers,
      body: hasBody ? await req.text() : undefined,
    });

    const contentType = upstream.headers.get('content-type') || 'application/json';
    const body = await upstream.text();

    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'content-type': contentType },
    });
  } catch (err: any) {
    console.error(`[API Proxy] ${req.method} ${target} failed:`, err.message);
    return NextResponse.json(
      { error: 'Bad Gateway', message: 'Backend service unreachable' },
      { status: 502 },
    );
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxy(req, (await ctx.params).path);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return proxy(req, (await ctx.params).path);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return proxy(req, (await ctx.params).path);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return proxy(req, (await ctx.params).path);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return proxy(req, (await ctx.params).path);
}
