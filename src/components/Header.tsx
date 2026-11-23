'use client';
import { Activity, CalendarCheck, Boxes, FlaskConical, Hourglass } from 'lucide-react';
import { Skeleton, card } from '@/components/ui';
import type { AnalyticsDTO, Role } from '@/lib/types';

const ROLES: { value: Role; label: string }[] = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'FACULTY', label: 'Faculty Advisor' },
  { value: 'ADMIN', label: 'Lab Admin' }
];

export const TABS = [
  { id: 'discover', label: 'Equipment' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'conflicts', label: 'AI Conflict Studio' },
  { id: 'analytics', label: 'Analytics' }
] as const;
export type TabId = (typeof TABS)[number]['id'];

interface Props { role: Role; onRole: (r: Role) => void; tab: TabId; onTab: (t: TabId) => void; analytics: AnalyticsDTO | null; loading: boolean }

export function Header({ role, onRole, tab, onTab, analytics, loading }: Props): JSX.Element {
  const k = analytics?.kpis;
  const kpis = [
    { label: 'Total Equipment', value: k ? String(k.totalEquipment) : '', Icon: Boxes },
    { label: 'Active Bookings', value: k ? String(k.activeBookings) : '', Icon: CalendarCheck },
    { label: 'Pending Approvals', value: k ? String(k.pendingApprovals) : '', Icon: Hourglass },
    { label: 'Utilization Rate', value: k ? k.utilizationRate + '%' : '', Icon: Activity }
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white"><FlaskConical className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <p className="text-lg font-bold leading-tight text-slate-900">LabShare AI</p>
              <p className="text-xs text-slate-600">Campus laboratory resource sharing</p>
            </div>
          </div>
          <div role="group" aria-label="Switch role" className="inline-flex rounded-full bg-slate-100 p-1">
            {ROLES.map((r) => (
              <button key={r.value} type="button" aria-pressed={role === r.value} onClick={() => onRole(r.value)}
                className={'rounded-full px-3 py-1.5 text-sm font-medium transition ' + (role === r.value ? 'bg-indigo-600 text-white shadow' : 'text-slate-700 hover:bg-white')}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <section aria-label="Key metrics" className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map(({ label, value, Icon }) => (
            <div key={label} className={card + ' flex items-center gap-3 p-3'}>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <p className="text-xs font-medium text-slate-600">{label}</p>
                {loading && !k ? <Skeleton className="mt-1 h-5 w-10" /> : <p className="text-xl font-bold text-slate-900">{value}</p>}
              </div>
            </div>
          ))}
        </section>
        <nav aria-label="Primary" className="mt-3 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} type="button" aria-current={tab === t.id ? 'page' : undefined} onClick={() => onTab(t.id)}
              className={'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ' + (tab === t.id ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700 hover:bg-slate-100')}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
