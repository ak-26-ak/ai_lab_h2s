import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function respond<T>(fn: () => Promise<T>, status = 200): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn(), { status });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', issues: error.flatten().fieldErrors }, { status: 400 });
    }
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Demo-grade role gate: a real deployment would derive the role from a verified session. */
export function requireRole(req: Request, allowed: string[]): void {
  const role = req.headers.get('x-role') ?? '';
  if (!allowed.includes(role)) throw new HttpError(403, 'Only Faculty Advisors and Lab Admins can do this');
}
