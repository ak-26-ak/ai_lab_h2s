import { describe, expect, it } from 'vitest';
import { canApprove, findConflictPairs, overlaps, type Slot } from '@/lib/conflicts';

const h = (n: number): Date => new Date(Date.UTC(2030, 0, 1, n));
const slot = (id: string, eq: string, s: number, e: number, status = 'PENDING'): Slot => ({ id, equipmentId: eq, startTime: h(s), endTime: h(e), status });

describe('overlaps', () => {
  it('detects partial overlap', () => expect(overlaps(slot('a', 'x', 10, 14), slot('b', 'x', 12, 16))).toBe(true));
  it('treats back-to-back slots as free', () => expect(overlaps(slot('a', 'x', 10, 12), slot('b', 'x', 12, 14))).toBe(false));
});

describe('findConflictPairs', () => {
  it('finds overlapping pending bookings on the same equipment', () => {
    expect(findConflictPairs([slot('a', 'x', 10, 14), slot('b', 'x', 12, 16)])).toHaveLength(1);
  });
  it('ignores different equipment, rejected and fully approved pairs', () => {
    const list = [slot('a', 'x', 10, 14), slot('b', 'y', 10, 14), slot('c', 'x', 11, 13, 'REJECTED'), slot('d', 'z', 10, 14, 'APPROVED'), slot('e', 'z', 11, 13, 'APPROVED')];
    expect(findConflictPairs(list)).toHaveLength(0);
  });
  it('flags pending versus approved', () => {
    expect(findConflictPairs([slot('a', 'x', 10, 14, 'APPROVED'), slot('b', 'x', 13, 15)])).toHaveLength(1);
  });
});

describe('canApprove', () => {
  it('allows approval when no approved booking overlaps', () => expect(canApprove(slot('a', 'x', 10, 12), [slot('b', 'x', 12, 14, 'APPROVED')]).ok).toBe(true));
  it('blocks approval overlapping an approved booking', () => {
    const r = canApprove(slot('a', 'x', 10, 13), [slot('b', 'x', 12, 14, 'APPROVED')]);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/overlaps/);
  });
  it('ignores overlapping pending bookings and other equipment', () => {
    expect(canApprove(slot('a', 'x', 10, 13), [slot('b', 'x', 11, 14), slot('c', 'y', 10, 13, 'APPROVED')]).ok).toBe(true);
  });
  it('rejects non-pending bookings', () => {
    expect(canApprove(slot('a', 'x', 10, 12, 'REJECTED'), []).ok).toBe(false);
    expect(canApprove(slot('a', 'x', 10, 12, 'APPROVED'), []).ok).toBe(false);
  });
});
