'use client';
import { useState } from 'react';
import { ArrowRight, Sparkles, Swords } from 'lucide-react';
import { Badge, EmptyState, ErrorState, Skeleton, StatusBadge, btnPrimary, card } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/client';
import type { BookingDTO, ConflictDTO, Role } from '@/lib/types';
import { formatDateTime, urgency } from '@/lib/utils';

interface Props { role: Role; version: number; onChanged: () => void; notify: (m: string, t?: 'success' | 'error') => void }

function RequestCard({ b, winner }: { b: BookingDTO; winner: boolean }): JSX.Element {
  const u = urgency(b.deadline);
  return (
    <div className={card + ' p-4 ' + (winner ? 'ring-2 ring-emerald-500' : '')}>
      <div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-slate-900">{b.projectTitle}</h4><StatusBadge status={b.status} /></div>
      <p className="mt-1 text-sm text-slate-700">{b.studentName} - {b.equipmentName}</p>
      <div className="mt-2"><Badge tone={u.tone}>{u.label}</Badge></div>
      <p className="mt-2 text-sm text-slate-600">Requested: {formatDateTime(b.startTime)} to {formatDateTime(b.endTime)}</p>
      {winner && <p className="mt-2 text-xs font-semibold text-emerald-800">AI priority pick</p>}
    </div>
  );
}

export function ConflictStudio({ role, version, onChanged, notify }: Props): JSX.Element {
  const { data, loading, error } = useApi<ConflictDTO[]>('/api/conflicts', version);
  const [busy, setBusy] = useState<string | null>(null);

  const apply = async (c: ConflictDTO): Promise<void> => {
    const r = c.recommendation;
    setBusy(c.id);
    try {
      await api('/api/conflicts/apply', role, { method: 'POST', body: { winnerId: r.winnerId, loserId: r.loserId, newStart: r.newStart, newEnd: r.newEnd, newEquipmentId: r.newEquipmentId } });
      notify('Resolution applied. Winner approved, other request updated.');
      onChanged();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not apply resolution', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="conf-h">
      <h2 id="conf-h" className="flex items-center gap-2 text-xl font-bold text-slate-900"><Swords className="h-5 w-5 text-amber-600" aria-hidden="true" />AI Conflict Resolution Studio</h2>
      <p className="mb-4 text-sm text-slate-700">Overlapping requests are compared by deadline, availability and equipment alternatives.</p>
      {error && <ErrorState message={error} />}
      {loading && !data && <div className="space-y-4" aria-busy="true"><Skeleton className="h-52" /><Skeleton className="h-52" /></div>}
      {data && data.length === 0 && <EmptyState title="No scheduling conflicts" hint="Every active request has its own slot. Nice and tidy." />}
      <ul className="space-y-6">
        {data?.map((c) => {
          const r = c.recommendation;
          const [a, b] = c.bookings;
          return (
            <li key={c.id} className="animate-fadeUp">
              <div className="mb-2 flex items-center gap-2"><Badge tone="amber">Conflict</Badge><span className="text-sm font-medium text-slate-800">{a.equipmentName}</span></div>
              <div className="grid gap-4 lg:grid-cols-3">
                <RequestCard b={a} winner={r.winnerId === a.id} />
                <RequestCard b={b} winner={r.winnerId === b.id} />
                <div className="rounded-xl border border-indigo-300 bg-indigo-50 p-4 shadow-sm">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-indigo-900"><Sparkles className="h-4 w-4" aria-hidden="true" />AI Recommendation<span className="ml-auto text-xs font-medium text-indigo-800">{r.source === 'gemini' ? 'Gemini' : 'Rules engine'}</span></p>
                  <p className="mt-2 text-sm text-slate-800">{r.reasoning}</p>
                  <p className="mt-3 flex flex-wrap items-center gap-1 text-sm font-medium text-slate-900">
                    {r.action === 'REASSIGN' ? 'Reassign to' : 'Reschedule to'}<ArrowRight className="h-4 w-4" aria-hidden="true" />
                    {r.action === 'REASSIGN' ? r.newEquipmentName : formatDateTime(r.newStart) + ' - ' + formatDateTime(r.newEnd)}
                  </p>
                  <button type="button" className={btnPrimary + ' mt-4 w-full'} disabled={role === 'STUDENT' || busy === c.id} onClick={() => apply(c)}>{busy === c.id ? 'Applying...' : 'Apply Resolution'}</button>
                  {role === 'STUDENT' && <p className="mt-2 text-xs text-slate-700">Faculty or Lab Admin role required.</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
