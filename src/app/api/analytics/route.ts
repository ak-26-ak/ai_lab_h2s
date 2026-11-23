import { NextRequest } from 'next/server';
import { enforceRateLimit, requireRole, respond } from '@/lib/http';
import { getUtilizationAnalytics } from '@/services/analyticsService';

export function GET(req: NextRequest): Promise<Response> {
  return respond(async () => {
    enforceRateLimit(req, 'analytics-read', 60, 60_000);
    requireRole(req, ['STUDENT', 'FACULTY', 'ADMIN']);

    return getUtilizationAnalytics();
  });
}
