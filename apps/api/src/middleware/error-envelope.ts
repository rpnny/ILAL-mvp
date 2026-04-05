/**
 * Unified API Error Envelope
 *
 * All error responses follow this shape so consumers can programmatically
 * switch on `code` and show `hint` to the developer.
 */

import type { Request, Response } from 'express';

export interface APIErrorBody {
  error: string;
  code: string;
  message: string;
  hint?: string;
  phase?: 'validation' | 'auth' | 'preflight' | 'build' | 'broadcast';
  details?: unknown[];
  requestId?: string;
  retryable?: boolean;
}

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  412: 'Precondition Failed',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

export function sendError(
  res: Response,
  status: number,
  opts: Omit<APIErrorBody, 'error'>,
  req?: Request,
): void {
  const body: APIErrorBody = {
    error: STATUS_TEXT[status] ?? 'Error',
    ...opts,
  };
  if (req?.requestId) {
    body.requestId = req.requestId;
  }
  res.status(status).json(body);
}
