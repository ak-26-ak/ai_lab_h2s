import type { NextRequest } from 'next/server';
import { respond } from '@/lib/http';
import { equipmentQuerySchema } from '@/lib/schemas';
import { listEquipment } from '@/services/equipmentService';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest): Promise<Response> {
  return respond(async () => {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const filters = equipmentQuerySchema.parse({ q: params.q || undefined, department: params.department || undefined, category: params.category || undefined });
    return listEquipment(filters);
  });
}
