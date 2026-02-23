/**
 * API client
 * Interacts with the apps/api backend service
 */

import type { ApiKeysResponse, CreateApiKeyResponse, UsageStats, User, Plan } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ── Helper ────────────────────────────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed with status ${res.status}`);
  }

  return res.json();
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ── Auth ──────────────────────────────────────────────────────
export async function register(
  email: string,
  password: string,
  name?: string,
  inviteCode?: string
): Promise<{ accessToken: string; refreshToken: string; user: User }> {
  return apiFetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, inviteCode }),
  });
}

export async function login(
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string; user: User }> {
  return apiFetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function refreshToken(
  refreshTokenValue: string
): Promise<{ accessToken: string; refreshToken: string }> {
  return apiFetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refreshTokenValue }),
  });
}

export async function getMe(token: string): Promise<{ user: User }> {
  return apiFetch(`${API_URL}/api/v1/auth/me`, {
    headers: authHeaders(token),
  });
}

export async function verifyEmail(
  email: string,
  code: string
): Promise<{ message: string; user: User; accessToken: string; refreshToken: string }> {
  return apiFetch(`${API_URL}/api/v1/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
}

export async function resendCode(
  email: string
): Promise<{ message: string }> {
  return apiFetch(`${API_URL}/api/v1/auth/resend-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

// ── API Key Management ────────────────────────────────────────
export async function getApiKeys(token: string): Promise<ApiKeysResponse> {
  return apiFetch(`${API_URL}/api/v1/apikeys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createApiKey(
  token: string,
  name: string,
  permissions?: string[],
  rateLimit?: number
): Promise<CreateApiKeyResponse> {
  return apiFetch(`${API_URL}/api/v1/apikeys`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name, permissions, rateLimit }),
  });
}

export async function deleteApiKey(
  token: string,
  keyId: string
): Promise<{ success: boolean }> {
  return apiFetch(`${API_URL}/api/v1/apikeys/${keyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Usage Stats ───────────────────────────────────────────────
export async function getUsageStats(token: string): Promise<UsageStats> {
  return apiFetch(`${API_URL}/api/v1/usage/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Billing / Plans ───────────────────────────────────────────
export async function getPlans(): Promise<{ plans: Plan[] }> {
  return apiFetch(`${API_URL}/api/v1/billing/plans`);
}
