'use client';
import { useMemo, useState } from 'react';
import { Activity, Bot, Boxes, Cpu, Gauge, MapPin, Printer, Search, Wrench, type LucideIcon } from 'lucide-react';
import { Badge, EmptyState, ErrorState, Skeleton, StatusBadge, btnPrimary, card } from '@/components/ui';
import { useApi, useDebounce } from '@/hooks/useApi';
import { DEPARTMENTS } from '@/lib/schemas';
import type { EquipmentDTO } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = { Compute: Cpu, Instrumentation: Activity, Fabrication: Printer, Robotics: Bot, Machining: Wrench, Testing: Gauge };

interface Props { version: number; onRequest: (e: EquipmentDTO) => void }

export function EquipmentGrid({ version, onRequest }: Props): JSX.Element {
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState<string>('');
  const debounced = useDebounce(query.trim(), 300);
  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (debounced) p.set('q', debounced);
    if (department) p.set('department', department);
    return '/api/equipment?' + p.toString();
  }, [debounced, department]);
  const { data, loading, error } = useApi<EquipmentDTO[]>(url, version);

  return (
    <section aria-labelledby="equip-heading">
      <h2 id="equip-heading" className="sr-only">Equipment discovery</h2>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="equip-search" className="mb-1 block text-sm font-medium text-slate-800">Search equipment</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" aria-hidden="true" />
            <input id="equip-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try GPU, oscilloscope, 3D printer..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-500" />
          </div>
        </div>
        <div role="group" aria-label="Filter by department" className="flex flex-wrap gap-2">
          {['', ...DEPARTMENTS].map((d) => (
            <button key={d || 'all'} type="button" aria-pressed={department === d} onClick={() => setDepartment(d)}
              className={'rounded-full border px-3 py-1.5 text-sm font-medium transition ' + (department === d ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50')}>
              {d || 'All departments'}
            </button>
          ))}
        </div>
      </div>
      {error && <ErrorState message={error} />}
      {loading && !data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-56" />)}</div>
      )}
      {data && data.length === 0 && <EmptyState title="No equipment found" hint="Try a different search term or clear the department filter." />}
      {data && data.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((e) => {
            const Icon = ICONS[e.category] ?? Boxes;
            return (
              <li key={e.id} className={card + ' flex animate-fadeUp flex-col p-4 transition hover:shadow-md'}>
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <StatusBadge status={e.status} />
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{e.name}</h3>
                <div className="mt-1 flex flex-wrap gap-1.5"><Badge tone="indigo">{e.department}</Badge><Badge tone="slate">{e.category}</Badge></div>
                <p className="mt-2 text-sm text-slate-700">{e.description}</p>
                <dl className="mt-3 grid grid-cols-1 gap-1 text-xs">
                  {Object.entries(e.specs).slice(0, 3).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2 border-b border-slate-100 pb-1"><dt className="text-slate-600">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>
                  ))}
                </dl>
                <p className="mt-3 flex items-center gap-1 text-xs text-slate-600"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{e.location}{e.busyUntil ? ' - free ' + formatDateTime(e.busyUntil) : ''}</p>
                <button type="button" className={btnPrimary + ' mt-4'} disabled={e.status === 'MAINTENANCE'} onClick={() => onRequest(e)} aria-label={'Request access to ' + e.name}>Request access</button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
