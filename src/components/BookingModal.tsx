'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { btnGhost, btnPrimary } from '@/components/ui';
import { api } from '@/lib/client';
import { bookingCreateSchema } from '@/lib/schemas';
import type { EquipmentDTO, Role } from '@/lib/types';
import { toLocalInput } from '@/lib/utils';

interface Props { equipment: EquipmentDTO; role: Role; onClose: () => void; onDone: (message: string, tone: 'success' | 'error') => void }
type Fields = 'studentName' | 'projectTitle' | 'description' | 'deadline' | 'startTime' | 'endTime';

const LABELS: Record<Fields, string> = {
  studentName: 'Your name', projectTitle: 'Project title', description: 'Project description & requirements',
  deadline: 'Project deadline', startTime: 'Slot start', endTime: 'Slot end'
};

export function BookingModal({ equipment, role, onClose, onDone }: Props): JSX.Element {
  const tomorrow = new Date(Date.now() + 86_400_000);
  tomorrow.setHours(10, 0, 0, 0);
  const [values, setValues] = useState<Record<Fields, string>>({
    studentName: '', projectTitle: '', description: '',
    deadline: toLocalInput(new Date(tomorrow.getTime() + 7 * 86_400_000)),
    startTime: toLocalInput(tomorrow), endTime: toLocalInput(new Date(tomorrow.getTime() + 2 * 3_600_000))
  });
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { closeRef.current(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, textarea, select');
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, []);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setFormError(null);
    const parsed = bookingCreateSchema.safeParse({ equipmentId: equipment.id, ...values });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors as Partial<Record<Fields, string[]>>;
      const next: Partial<Record<Fields, string>> = {};
      (Object.keys(LABELS) as Fields[]).forEach((k) => { const m = flat[k]?.[0]; if (m) next[k] = m; });
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const res = await api<{ conflict: boolean }>('/api/bookings', role, { method: 'POST', body: parsed.data });
      onDone(res.conflict ? 'Request submitted. A scheduling conflict was flagged for AI resolution.' : 'Request submitted for faculty approval.', 'success');
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not submit request');
    } finally {
      setSaving(false);
    }
  };

  const set = (k: Fields) => (e: { target: { value: string } }): void => setValues((v) => ({ ...v, [k]: e.target.value }));
  const field = (k: Fields, type: string, ref?: typeof firstRef): JSX.Element => (
    <div key={k}>
      <label htmlFor={'bk-' + k} className="mb-1 block text-sm font-medium text-slate-800">{LABELS[k]}</label>
      {k === 'description' ? (
        <textarea id="bk-description" rows={3} value={values[k]} onChange={set(k)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? 'err-' + k : undefined}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      ) : (
        <input id={'bk-' + k} ref={ref} type={type} value={values[k]} onChange={set(k)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? 'err-' + k : undefined}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      )}
      {errors[k] && <p id={'err-' + k} role="alert" className="mt-1 text-xs font-medium text-rose-700">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="bk-title" className="flex h-full w-full max-w-md animate-slideIn flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-4">
          <div>
            <h2 id="bk-title" className="text-lg font-bold text-slate-900">Request access</h2>
            <p className="text-sm text-slate-600">{equipment.name} - {equipment.location}</p>
          </div>
          <button type="button" aria-label="Close booking form" onClick={onClose} className="rounded p-1 text-slate-600 hover:bg-slate-100"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-4 p-4">
          {field('studentName', 'text', firstRef)}
          {field('projectTitle', 'text')}
          {field('description', 'text')}
          {field('deadline', 'datetime-local')}
          <div className="grid grid-cols-2 gap-3">{field('startTime', 'datetime-local')}{field('endTime', 'datetime-local')}</div>
          {formError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-800">{formError}</p>}
          <div className="mt-auto flex gap-2 pt-2">
            <button type="submit" className={btnPrimary + ' flex-1'} disabled={saving}>{saving ? 'Submitting...' : 'Submit request'}</button>
            <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
