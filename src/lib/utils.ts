export type Tone = 'emerald' | 'amber' | 'rose' | 'slate' | 'indigo';

export const toneClasses: Record<Tone, string> = {
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/30',
  rose: 'bg-rose-50 text-rose-800 ring-rose-600/20',
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  indigo: 'bg-indigo-50 text-indigo-800 ring-indigo-600/20'
};

export const statusTone: Record<string, Tone> = {
  AVAILABLE: 'emerald', IN_USE: 'rose', MAINTENANCE: 'slate', PENDING: 'amber', APPROVED: 'emerald', REJECTED: 'rose'
};

export const statusLabel: Record<string, string> = {
  AVAILABLE: 'Available', IN_USE: 'In Use', MAINTENANCE: 'Maintenance', PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected'
};

export function daysUntil(deadline: Date | string, now: Date = new Date()): number {
  return Math.ceil((new Date(deadline).getTime() - now.getTime()) / 86_400_000);
}

export function urgency(deadline: Date | string, now: Date = new Date()): { label: string; tone: Tone } {
  const d = daysUntil(deadline, now);
  if (d < 0) return { label: 'Overdue', tone: 'rose' };
  if (d <= 3) return { label: 'Due in ' + d + 'd - Critical', tone: 'rose' };
  if (d <= 7) return { label: 'Due in ' + d + 'd - High', tone: 'amber' };
  return { label: 'Due in ' + d + 'd', tone: 'slate' };
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function toLocalInput(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}
