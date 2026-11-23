import type { NextRequest } from 'next/server';
import { requireRole, respond } from '@/lib/http';
import { bookingStatusSchema } from '@/lib/schemas';
import { decideBooking } from '@/services/bookingService';

export const dynamic = 'force-dynamic';

export function PATCH(req: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
  return respond(async () => {
    requireRole(req, ['FACULTY', 'ADMIN']);
    const { status } = bookingStatusSchema.parse(await req.json());
    return decideBooking(params.id, status);
  });
}
