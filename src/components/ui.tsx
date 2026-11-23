'use client';
import { useCallback, useState, type ReactNode } from 'react';
import { CheckCircle2, Inbox, AlertTriangle, X } from 'lucide-react';
import { statusLabel, statusTone, toneClasses, type Tone } from '@/lib/utils';

export interface ToastItem { id: number; message: string; tone: 'success' | 'error' }

export function useToasts(): { toasts: ToastItem[]; push: (message: string, tone?: 'success' | 'error') => void; dismiss: (id: number) => void } {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);
  return { toasts, push, dismiss };
}

export function Toasts({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: number) => void }): JSX.Element {
  return (
    <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="flex animate-fadeUp items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg">
          {t.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />}
          <p className="flex-1 text-slate-800">{t.message}</p>
          <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(t.id)} className="rounded text-slate-500 hover:text-slate-900"><X className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      ))}
    </div>
  );
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }): JSX.Element {
  return <span className={'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ' + toneClasses[tone]}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }): JSX.Element {
  return <Badge tone={statusTone[status] ?? 'slate'}>{statusLabel[status] ?? status}</Badge>;
}

export function Skeleton({ className = '' }: { className?: string }): JSX.Element {
  return <div aria-hidden="true" className={'animate-pulse rounded-lg bg-slate-200 ' + className} />;
}

export function EmptyState({ title, hint }: { title: string; hint: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <Inbox className="mb-3 h-10 w-10 text-slate-400" aria-hidden="true" />
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-600">{hint}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }): JSX.Element {
  return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{message}</div>;
}

export const card = 'rounded-xl border border-slate-200 bg-white shadow-sm';
export const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50';
export const btnGhost = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
