import { describe, expect, it } from 'vitest';
import { fallbackResolution, normalizeAiResolution, parseAiOutput, type Alternative, type ConflictBooking } from '@/lib/resolution';

const h = (n: number): Date => new Date(Date.UTC(2030, 0, 1, n));
const day = (n: number): Date => new Date(Date.UTC(2030, 0, 1 + n));
const mk = (id: string, deadlineDays: number, s: number, e: number, status = 'PENDING'): ConflictBooking => ({
  id, equipmentId: 'gpu', projectTitle: 'Project ' + id, studentName: 'S', deadline: day(deadlineDays), startTime: h(s), endTime: h(e), status
});
const freeAlt: Alternative = { id: 'jetson', name: 'Jetson', bookings: [] };
const busyAlt: Alternative = { id: 'pi', name: 'Pi', bookings: [{ id: 'z', equipmentId: 'pi', startTime: h(10), endTime: h(20), status: 'APPROVED' }] };

describe('parseAiOutput', () => {
  const good = { winnerId: 'a', action: 'REASSIGN', newStart: h(10).toISOString(), newEnd: h(14).toISOString(), newEquipmentId: 'jetson', reasoning: 'Earlier deadline wins the slot.' };
  it('parses plain JSON', () => expect(parseAiOutput(JSON.stringify(good))?.winnerId).toBe('a'));
  it('parses JSON wrapped in markdown fences', () => {
    const fence = String.fromCharCode(96).repeat(3);
    expect(parseAiOutput(fence + 'json\n' + JSON.stringify(good) + '\n' + fence)?.action).toBe('REASSIGN');
  });
  it('returns null for malformed or invalid output', () => {
    expect(parseAiOutput('not json')).toBeNull();
    expect(parseAiOutput(JSON.stringify({ ...good, action: 'DELETE' }))).toBeNull();
  });
});

describe('fallbackResolution', () => {
  it('gives the slot to the earlier deadline and reassigns to free equipment', () => {
    const r = fallbackResolution(mk('a', 10, 10, 14), mk('b', 3, 12, 16), [freeAlt]);
    expect(r.winnerId).toBe('b');
    expect(r.loserId).toBe('a');
    expect(r.action).toBe('REASSIGN');
    expect(r.newEquipmentId).toBe('jetson');
    expect(r.source).toBe('fallback');
  });
  it('reschedules after the winner when no alternative is free', () => {
    const r = fallbackResolution(mk('a', 10, 10, 14), mk('b', 3, 12, 16), [busyAlt]);
    expect(r.action).toBe('RESCHEDULE');
    expect(r.newStart).toBe(h(16).toISOString());
    expect(r.newEnd).toBe(h(20).toISOString());
  });
  it('never bumps an approved booking', () => {
    const r = fallbackResolution(mk('a', 1, 10, 14), mk('b', 30, 12, 16, 'APPROVED'), []);
    expect(r.winnerId).toBe('b');
  });
});

describe('normalizeAiResolution', () => {
  const a = mk('a', 10, 10, 14);
  const b = mk('b', 3, 12, 16);
  const base = { winnerId: 'b', action: 'REASSIGN' as const, newStart: h(10).toISOString(), newEnd: h(14).toISOString(), newEquipmentId: 'jetson', reasoning: 'Deadline is nearer.' };
  it('accepts valid output', () => expect(normalizeAiResolution(base, a, b, [freeAlt])?.source).toBe('gemini'));
  it('rejects unknown winners and busy or unknown equipment', () => {
    expect(normalizeAiResolution({ ...base, winnerId: 'q' }, a, b, [freeAlt])).toBeNull();
    expect(normalizeAiResolution({ ...base, newEquipmentId: 'pi' }, a, b, [busyAlt])).toBeNull();
    expect(normalizeAiResolution({ ...base, newEquipmentId: 'nope' }, a, b, [freeAlt])).toBeNull();
  });
  it('rejects reschedules that still overlap the winner', () => {
    expect(normalizeAiResolution({ ...base, action: 'RESCHEDULE', newEquipmentId: null, newStart: h(13).toISOString(), newEnd: h(17).toISOString() }, a, b, [])).toBeNull();
  });
});
