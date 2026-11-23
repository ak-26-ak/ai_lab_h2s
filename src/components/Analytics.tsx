'use client';
import { EmptyState, Skeleton, card } from '@/components/ui';
import type { AnalyticsDTO } from '@/lib/types';

function Bar({ label, value, sub }: { label: string; value: number; sub: string }): JSX.Element {
  return (
    <li>
      <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-slate-900">{label}</span><span className="text-slate-700">{sub}</span></div>
      <div className="h-2.5 rounded-full bg-slate-100" role="img" aria-label={label + ' utilization ' + value + ' percent'}>
        <div className="h-2.5 rounded-full bg-indigo-600 transition-all duration-500" style={{ width: Math.max(value, 2) + '%' }} />
      </div>
    </li>
  );
}

export function Analytics({ data }: { data: AnalyticsDTO | null }): JSX.Element {
  if (!data) return <div aria-busy="true" className="grid gap-4 md:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>;
  if (data.kpis.totalEquipment === 0) return <EmptyState title="No data yet" hint="Run npm run setup to seed demo data." />;
  const s = data.statusCounts;
  return (
    <section aria-labelledby="an-h">
      <h2 id="an-h" className="text-xl font-bold text-slate-900">Resource utilization (next 7 days)</h2>
      <p className="mb-4 text-sm text-slate-700">Approved booked hours against 12 usable lab hours per day per item.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={card + ' p-4'}>
          <h3 className="mb-3 font-semibold text-slate-900">By department</h3>
          <ul className="space-y-4">{data.byDepartment.map((d) => <Bar key={d.department} label={d.department} value={d.utilization} sub={d.hours + ' h - ' + d.utilization + '%'} />)}</ul>
        </div>
        <div className={card + ' p-4'}>
          <h3 className="mb-3 font-semibold text-slate-900">Most booked equipment</h3>
          <ul className="space-y-4">{data.topEquipment.map((e) => <Bar key={e.id} label={e.name} value={e.utilization} sub={e.hours + ' h'} />)}</ul>
        </div>
        <div className={card + ' p-4 md:col-span-2'}>
          <h3 className="mb-3 font-semibold text-slate-900">Fleet status right now</h3>
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-emerald-50 p-3"><dd className="text-2xl font-bold text-emerald-800">{s.AVAILABLE}</dd><dt className="text-xs font-medium text-emerald-800">Available</dt></div>
            <div className="rounded-lg bg-rose-50 p-3"><dd className="text-2xl font-bold text-rose-800">{s.IN_USE}</dd><dt className="text-xs font-medium text-rose-800">In Use</dt></div>
            <div className="rounded-lg bg-slate-100 p-3"><dd className="text-2xl font-bold text-slate-800">{s.MAINTENANCE}</dd><dt className="text-xs font-medium text-slate-800">Maintenance</dt></div>
          </dl>
        </div>
      </div>
    </section>
  );
}
