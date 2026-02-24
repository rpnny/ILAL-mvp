/**
 * Shared TypeScript type definitions for ILAL API Portal
 */

// ── Auth & User ───────────────────────────────────────────────
export interface User {
    id: string;
    email: string;
    walletAddress?: string;
    name?: string;
    plan: 'FREE' | 'PRO' | 'ENTERPRISE';
    createdAt?: string;
}

// ── API Key ───────────────────────────────────────────────────
export interface ApiKey {
    id: string;
    name: string;
    keyPrefix: string;
    key?: string; // Only returned on creation
    createdAt: string;
    lastUsedAt?: string;
    isActive: boolean;
    permissions?: string[];
}

export interface ApiKeyLimits {
    maxApiKeys: number;
}

export interface ApiKeysResponse {
    apiKeys: ApiKey[];
    limits: ApiKeyLimits;
}

export interface CreateApiKeyResponse {
    apiKey: string;
    id: string;
    name: string;
    keyPrefix: string;
    permissions: string;
    rateLimit: number;
    createdAt: string;
    expiresAt: string | null;
    warning: string;
}

// ── Usage Stats ───────────────────────────────────────────────
export interface UsagePeriod {
    calls: number;
    startDate: string;
    endDate: string;
}

export interface UsageLimits {
    monthlyCallLimit: number;
    rateLimit: number;
    maxApiKeys: number;
}

export interface RecentCall {
    endpoint: string;
    method: string;
    statusCode: number;
    success: boolean;
    timestamp: string;
    duration?: number;
    apiKeyPrefix?: string;
}

export interface UsageStats {
    currentPeriod: UsagePeriod;
    limits: UsageLimits;
    recentCalls?: RecentCall[];
}

// ── API Endpoint (for Playground) ─────────────────────────────
export interface EndpointParam {
    name: string;
    type: string;
    required: boolean;
    description: string;
}

export interface ApiEndpoint {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    description: string;
    auth: boolean;
    params?: Record<string, string>;
    body?: Record<string, string>;
    response: Record<string, string>;
}

// ── Activity Log ──────────────────────────────────────────────
export interface LogEntry {
    id: string;
    timestamp: string;
    method: string;
    endpoint: string;
    statusCode: number;
    duration: number;
    apiKeyPrefix: string;
    apiKeyName: string;
    requestBody?: string;
    responseBody?: string;
    ip?: string;
    userAgent?: string;
}

export type LogStatus = 'success' | 'error' | 'rate_limited';

// ── Plans / Billing ───────────────────────────────────────────
export interface Plan {
    id: string;
    name: string;
    price: number;
    features: string[];
    limits: UsageLimits;
}

// ── Chart Data ────────────────────────────────────────────────
export interface ChartDataPoint {
    date: string;
    calls: number;
}
