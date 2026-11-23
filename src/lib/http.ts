import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { roleSchema } from '@/lib/schemas';
import type { Role } from '@/lib/types';

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  issues?: Record<string, string[] | undefined>;
}

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code = 'REQUEST_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Standardized API response wrapper that guarantees consistent JSON envelopes
 * and prevents internal stack traces or database details from leaking.
 */
export async function respond<T>(fn: () => Promise<T>, status = 200): Promise<NextResponse<ApiEnvelope<T>>> {
  try {
    const data = await fn();
    return NextResponse.json({ success: true, data }, { status });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          code: 'VALIDATION_ERROR',
          error: 'Validation failed',
          issues: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    console.error('[API_INTERNAL_ERROR]', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, code: 'INTERNAL_ERROR', error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Server-side role gate validating `x-role` against canonical Role enums.
 * Note: Roles operate as simulated demo identities for competition evaluation.
 */
export function requireRole(req: Request, allowed: readonly Role[]): Role {
  const rawRole = (req.headers.get('x-role') ?? '').trim().toUpperCase();
  const parsed = roleSchema.safeParse(rawRole);

  if (!parsed.success) {
    throw new HttpError(401, 'Missing or invalid campus role identity', 'UNAUTHORIZED');
  }

  if (!allowed.includes(parsed.data)) {
    throw new HttpError(403, `Role ${parsed.data} is not authorized for this action`, 'FORBIDDEN');
  }

  return parsed.data;
}

/**
 * Bounded in-memory sliding-window rate limiter to protect booking mutations and AI endpoints
 * without unbounded memory growth in serverless environments.
 */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 500;

export function enforceRateLimit(
  req: Request,
  bucket: string,
  maxRequests = 15,
  windowMs = 60_000
): void {
  const now = Date.now();
  if (rateBuckets.size > MAX_BUCKETS) {
    for (const [k, v] of rateBuckets) {
      if (now > v.resetAt) rateBuckets.delete(k);
    }
  }

  const forwarded = req.headers.get('x-forwarded-for');
  const clientKey = forwarded ? forwarded.split(',')[0].trim() : 'local-client';
  const key = `${bucket}:${clientKey}`;
  const current = rateBuckets.get(key);

  if (!current || now > current.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= maxRequests) {
    throw new HttpError(429, 'Rate limit exceeded. Please wait a minute before retrying.', 'RATE_LIMITED');
  }

  current.count += 1;
}
