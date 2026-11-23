export interface Slot {
  id: string;
  equipmentId: string;
  startTime: Date;
  endTime: Date;
  status: string;
}

const ACTIVE = ['PENDING', 'APPROVED'];

export function overlaps(a: Pick<Slot, 'startTime' | 'endTime'>, b: Pick<Slot, 'startTime' | 'endTime'>): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

/** Pairs of active bookings on the same equipment that overlap, where at least one is still pending. */
export function findConflictPairs<T extends Slot>(bookings: T[]): [T, T][] {
  const active = bookings.filter((b) => ACTIVE.includes(b.status));
  const pairs: [T, T][] = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (a.equipmentId !== b.equipmentId || !overlaps(a, b)) continue;
      if (a.status === 'APPROVED' && b.status === 'APPROVED') continue;
      pairs.push([a, b]);
    }
  }
  return pairs;
}

/** A booking can be approved only if no other approved booking overlaps its slot on the same equipment. */
export function canApprove(target: Slot, others: Slot[]): { ok: boolean; reason?: string } {
  if (target.status === 'APPROVED') return { ok: false, reason: 'Booking is already approved' };
  if (target.status === 'REJECTED') return { ok: false, reason: 'Rejected bookings cannot be approved' };
  const clash = others.find((o) => o.id !== target.id && o.status === 'APPROVED' && o.equipmentId === target.equipmentId && overlaps(o, target));
  return clash ? { ok: false, reason: 'Slot overlaps an already approved booking' } : { ok: true };
}
