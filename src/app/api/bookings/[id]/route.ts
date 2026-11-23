import { NextRequest } from 'next/server';
import { enforceRateLimit, requireRole, respond } from '@/lib/http';
import { bookingStatusSchema } from '@/lib/schemas';
import { updateBookingStatus } from '@/services/bookingService';

export function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  return respond(async () => {
    enforceRateLimit(req, 'bookings-approve', 20, 60_000);
    requireRole(req, ['FACULTY', 'ADMIN']);

    const body = bookingStatusSchema.parse(await req.json());
    return updateBookingStatus(params.id, body.status);
  });
}
