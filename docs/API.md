# ILAL SaaS API Reference

This document is for **server/middle-office** integration: use **API Key + REST API** to call ILAL swap, liquidity, and related endpoints.  
For **on-chain / wallet** flows, use the [SDK + wallet](../packages/sdk/README.md).

## Base

- **Base URL (examples)**: `https://api.ilal.xyz` (production) / `http://localhost:3001` (local)
- **Authentication**: API Key sent in an HTTP header

## Authentication

Endpoints that require auth use an **API Key** in the format `ilal_live_xxx` or `ilal_test_xxx` (created in the dashboard and shown only once; store it securely).

- **Header name**: `X-API-Key`
- **Example**:
  ```http
  X-API-Key: ilal_live_1234567890abcdef1234567890abcdef
  ```

Missing or invalid key returns `401 Unauthorized`.

## Health check (no auth)

```http
GET /api/v1/health
```

**Example response** (200):
```json
{ "status": "ok", "timestamp": "2026-02-19T12:00:00.000Z" }
```

## Swap

**Endpoint**: `POST /api/v1/defi/swap`  
**Auth**: API Key (or JWT depending on server config)

**Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tokenIn | string | Yes | Input token contract address (0x...) |
| tokenOut | string | Yes | Output token contract address (0x...) |
| amount | string | Yes | Input amount as decimal string (e.g. "1000000") |
| zeroForOne | boolean | Yes | true if token0 → token1 in pool (currency0/currency1 order) |
| userAddress | string | Yes | User address initiating the swap (0x...) |

**Example request**:

```json
{
  "tokenIn": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "tokenOut": "0x4200000000000000000000000000000000000006",
  "amount": "1000000",
  "zeroForOne": true,
  "userAddress": "0x1234567890123456789012345678901234567890"
}
```

**Success** (200):

```json
{
  "success": true,
  "txHash": "0x...",
  "status": "submitted",
  "explorerUrl": "https://sepolia.basescan.org/tx/0x..."
}
```

**Failure** (400):

```json
{
  "success": false,
  "error": "Error message"
}
```

## Add liquidity

**Endpoint**: `POST /api/v1/defi/liquidity`  
**Auth**: API Key (or JWT)

**Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token0 | string | Yes | Token 0 contract address (0x...) |
| token1 | string | Yes | Token 1 contract address (0x...) |
| amount0 | string | Yes | Token 0 amount (decimal string) |
| amount1 | string | Yes | Token 1 amount (decimal string) |
| userAddress | string | Yes | User address initiating the action (0x...) |

**Example request**:

```json
{
  "token0": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "token1": "0x4200000000000000000000000000000000000006",
  "amount0": "1000000",
  "amount1": "50000000000000000",
  "userAddress": "0x1234567890123456789012345678901234567890"
}
```

**Success** (200):

```json
{
  "success": true,
  "txHash": "0x...",
  "status": "submitted",
  "explorerUrl": "https://sepolia.basescan.org/tx/0x..."
}
```

**Failure** (400):

```json
{
  "success": false,
  "error": "Error message"
}
```

## Session status (read-only)

**Endpoint**: `GET /api/v1/session/:address`  
**Auth**: Usually none (confirm in your deployment)

**Path**: `address` — user address

**Response**: Implementation-dependent; may include whether the session is active and remaining time.

## HTTP status codes

| Status | Meaning |
|--------|--------|
| 400 | Invalid request (e.g. format, missing fields) |
| 401 | Missing or invalid API Key (Missing/Invalid X-API-Key) |
| 403 | Forbidden (e.g. API Key lacks defi permission) |
| 404 | Not found |
| 429 | Rate limit exceeded |
| 500 | Server error |

---

Base URL and environment (test/live) depend on your deployment. API Keys are shown once when created in the dashboard; store them securely. Use **SDK + wallet** for on-chain flows; use **API Key + this REST API** for server/middle-office.
