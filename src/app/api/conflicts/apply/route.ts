import { NextRequest } from 'next/server';
import { enforceRateLimit, requireRole, respond } from '@/lib/http';
import { applyResolutionSchema } from '@/lib/schemas';
import { applyResolution } from '@/services/conflictService';

export function POST(req: NextRequest): Promise<Response> {
  return respond(async () => {
    enforceRateLimit(req, 'conflicts-apply', 10, 60_000);
    requireRole(req, ['ADMIN']);

    const body = applyResolutionSchema.parse(await req.json());
    return applyResolution({
      winnerId: body.winnerId,
      loserId: body.loserId,
      newStart: body.newStart,
      newEnd: body.newEnd,
      newEquipmentId: body.newEquipmentId ?? null,
    });
  });
}
