'use client';
import { useCallback, useState } from 'react';
import { Analytics } from '@/components/Analytics';
import { Approvals } from '@/components/Approvals';
import { BookingModal } from '@/components/BookingModal';
import { ConflictStudio } from '@/components/ConflictStudio';
import { EquipmentGrid } from '@/components/EquipmentGrid';
import { Header, type TabId } from '@/components/Header';
import { Toasts, useToasts } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import type { AnalyticsDTO, EquipmentDTO, Role } from '@/lib/types';

export default function Page(): JSX.Element {
  const [role, setRole] = useState<Role>('STUDENT');
  const [tab, setTab] = useState<TabId>('discover');
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<EquipmentDTO | null>(null);
  const { toasts, push, dismiss } = useToasts();
  const { data: analytics, loading } = useApi<AnalyticsDTO>('/api/analytics', version);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const close = useCallback(() => setSelected(null), []);

  return (
    <>
      <Header role={role} onRole={setRole} tab={tab} onTab={setTab} analytics={analytics} loading={loading} />
      <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {tab === 'discover' && <EquipmentGrid version={version} onRequest={setSelected} />}
        {tab === 'approvals' && <Approvals role={role} version={version} onChanged={refresh} notify={push} />}
        {tab === 'conflicts' && <ConflictStudio role={role} version={version} onChanged={refresh} notify={push} />}
        {tab === 'analytics' && <Analytics data={analytics} />}
      </main>
      {selected && <BookingModal equipment={selected} role={role} onClose={close} onDone={(m, t) => { push(m, t); refresh(); }} />}
      <Toasts toasts={toasts} dismiss={dismiss} />
    </>
  );
}
