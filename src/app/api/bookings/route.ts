import { NextRequest } from 'next/server';
import { enforceRateLimit, requireRole, respond } from '@/lib/http';
import { bookingCreateSchema, bookingQuerySchema } from '@/lib/schemas';
import { createBooking, listBookings } from '@/services/bookingService';

export function GET(req: NextRequest): Promise<Response> {
  return respond(async () => {
    enforceRateLimit(req, 'bookings-list', 60, 60_000);
    requireRole(req, ['STUDENT', 'FACULTY', 'ADMIN']);

    const { searchParams } = new URL(req.url);
    const query = bookingQuerySchema.parse({
      status: searchParams.get('status') ?? undefined,
    });

    return listBookings(query.status);

  });
}

export function POST(req: NextRequest): Promise<Response> {
  return respond(async () => {
    enforceRateLimit(req, 'bookings-create', 15, 60_000);
    requireRole(req, ['STUDENT', 'FACULTY', 'ADMIN']);

    const body = bookingCreateSchema.parse(await req.json());
    return createBooking(body);
  }, 201);
}
