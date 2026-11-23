'use client';
import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Badge, EmptyState, ErrorState, Skeleton, StatusBadge, btnGhost, btnPrimary, card } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/client';
import type { BookingDTO, Role } from '@/lib/types';
import { formatDateTime, urgency } from '@/lib/utils';

interface Props { role: Role; version: number; onChanged: () => void; notify: (m: string, t?: 'success' | 'error') => void }

export function Approvals({ role, version, onChanged, notify }: Props): JSX.Element {
  const { data, loading, error } = useApi<BookingDTO[]>('/api/bookings?status=PENDING', version);
  const [busy, setBusy] = useState<string | null>(null);
  const canDecide = role !== 'STUDENT';

  const decide = async (id: string, status: 'APPROVED' | 'REJECTED'): Promise<void> => {
    setBusy(id);
    try {
      await api('/api/bookings/' + id, role, { method: 'PATCH', body: { status } });
      notify(status === 'APPROVED' ? 'Booking approved' : 'Booking rejected');
      onChanged();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Action failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="appr-h">
      <h2 id="appr-h" className="text-xl font-bold text-slate-900">Pending approvals</h2>
      <p className="mb-4 text-sm text-slate-700">{canDecide ? 'Review project-based requests and approve or reject them.' : 'Switch to Faculty Advisor or Lab Admin to approve requests.'}</p>
      {error && <ErrorState message={error} />}
      {loading && !data && <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>}
      {data && data.length === 0 && <EmptyState title="All caught up" hint="There are no pending requests right now." />}
      <ul className="space-y-3">
        {data?.map((b) => {
          const u = urgency(b.deadline);
          return (
            <li key={b.id} className={card + ' flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'}>
              <div>
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{b.projectTitle}</h3><StatusBadge status={b.status} /><Badge tone={u.tone}>{u.label}</Badge></div>
                <p className="mt-1 text-sm text-slate-700">{b.studentName} - {b.equipmentName} ({b.department})</p>
                <p className="text-sm text-slate-600">{formatDateTime(b.startTime)} to {formatDateTime(b.endTime)}</p>
                <p className="mt-1 text-sm text-slate-700">{b.description}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" className={btnPrimary} disabled={!canDecide || busy === b.id} onClick={() => decide(b.id, 'APPROVED')} aria-label={'Approve ' + b.projectTitle}><Check className="h-4 w-4" aria-hidden="true" />Approve</button>
                <button type="button" className={btnGhost} disabled={!canDecide || busy === b.id} onClick={() => decide(b.id, 'REJECTED')} aria-label={'Reject ' + b.projectTitle}><X className="h-4 w-4" aria-hidden="true" />Reject</button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
