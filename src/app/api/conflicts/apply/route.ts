import type { NextRequest } from 'next/server';
import { requireRole, respond } from '@/lib/http';
import { applyResolutionSchema } from '@/lib/schemas';
import { applyResolution } from '@/services/conflictService';

export const dynamic = 'force-dynamic';

export function POST(req: NextRequest): Promise<Response> {
  return respond(async () => {
    requireRole(req, ['FACULTY', 'ADMIN']);
    return applyResolution(applyResolutionSchema.parse(await req.json()));
  });
}
