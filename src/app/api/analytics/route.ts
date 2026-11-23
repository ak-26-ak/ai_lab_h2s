import { respond } from '@/lib/http';
import { getAnalytics } from '@/services/analyticsService';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return respond(() => getAnalytics());
}
