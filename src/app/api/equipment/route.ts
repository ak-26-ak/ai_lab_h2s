import { NextRequest } from 'next/server';
import { enforceRateLimit, requireRole, respond } from '@/lib/http';
import { equipmentQuerySchema } from '@/lib/schemas';
import { listEquipment } from '@/services/equipmentService';

export function GET(req: NextRequest): Promise<Response> {
  return respond(async () => {
    enforceRateLimit(req, 'equipment-list', 60, 60_000);
    requireRole(req, ['STUDENT', 'FACULTY', 'ADMIN']);

    const { searchParams } = new URL(req.url);
    const query = equipmentQuerySchema.parse({
      q: searchParams.get('q') ?? undefined,
      department: searchParams.get('department') ?? undefined,
      category: searchParams.get('category') ?? undefined,
    });

    return listEquipment(query);
  });
}
