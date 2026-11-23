import { respond } from '@/lib/http';
import { listConflicts } from '@/services/conflictService';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return respond(() => listConflicts());
}
