import type { NextRequest } from 'next/server';
import { respond } from '@/lib/http';
import { bookingCreateSchema, bookingQuerySchema } from '@/lib/schemas';
import { createBooking, listBookings } from '@/services/bookingService';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest): Promise<Response> {
  return respond(async () => {
    const { status } = bookingQuerySchema.parse({ status: req.nextUrl.searchParams.get('status') ?? undefined });
    return listBookings(status);
  });
}

export function POST(req: NextRequest): Promise<Response> {
  return respond(async () => createBooking(bookingCreateSchema.parse(await req.json())), 201);
}
