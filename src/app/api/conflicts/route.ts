import { NextRequest } from 'next/server';
import { enforceRateLimit, requireRole, respond } from '@/lib/http';
import { getConflictsWithResolutions } from '@/services/conflictService';

export function GET(req: NextRequest): Promise<Response> {
  return respond(async () => {
    enforceRateLimit(req, 'ai-conflicts', 15, 60_000);
    requireRole(req, ['STUDENT', 'FACULTY', 'ADMIN']);

    return getConflictsWithResolutions();
  });
}
