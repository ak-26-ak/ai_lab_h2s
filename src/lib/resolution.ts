import { z } from 'zod';
import { overlaps, type Slot } from '@/lib/conflicts';
import type { Resolution } from '@/lib/types';

export interface ConflictBooking extends Slot {
  projectTitle: string;
  studentName: string;
  deadline: Date;
}

export interface Alternative {
  id: string;
  name: string;
  bookings: Slot[];
}

export const aiOutputSchema = z.object({
  winnerId: z.string().min(1),
  action: z.enum(['REASSIGN', 'RESCHEDULE']),
  newStart: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
  newEnd: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
  newEquipmentId: z.string().nullable().optional(),
  reasoning: z.string().min(10)
});

export type AiOutput = z.infer<typeof aiOutputSchema>;

/** Parses model text (optionally wrapped in markdown fences) into a validated structure, or null. */
export function parseAiOutput(text: string): AiOutput | null {
  const cleaned = text.replace(/^[\s]*```(?:json)?/i, '').replace(/```[\s]*$/, '').trim();
  try {
    const result = aiOutputSchema.safeParse(JSON.parse(cleaned));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function order(a: ConflictBooking, b: ConflictBooking): [ConflictBooking, ConflictBooking] {
  if (a.status === 'APPROVED' && b.status !== 'APPROVED') return [a, b];
  if (b.status === 'APPROVED' && a.status !== 'APPROVED') return [b, a];
  return a.deadline <= b.deadline ? [a, b] : [b, a];
}

function freeAlternative(loser: ConflictBooking, alts: Alternative[]): Alternative | undefined {
  return alts.find((alt) => !alt.bookings.some((x) => ['PENDING', 'APPROVED'].includes(x.status) && overlaps(x, loser)));
}

/** Deterministic engine: earliest deadline (or already-approved) wins; loser is reassigned or rescheduled. */
export function fallbackResolution(a: ConflictBooking, b: ConflictBooking, alts: Alternative[]): Resolution {
  const [winner, loser] = order(a, b);
  const gapDays = Math.round((loser.deadline.getTime() - winner.deadline.getTime()) / 86_400_000);
  const why = winner.status === 'APPROVED'
    ? 'Approved booking for "' + winner.projectTitle + '" keeps its slot. '
    : '"' + winner.projectTitle + '" has the earlier deadline (' + Math.abs(gapDays) + ' day(s) sooner than "' + loser.projectTitle + '"), so it keeps the requested slot. ';
  const alt = freeAlternative(loser, alts);
  if (alt) {
    return {
      winnerId: winner.id, loserId: loser.id, action: 'REASSIGN',
      newStart: loser.startTime.toISOString(), newEnd: loser.endTime.toISOString(),
      newEquipmentId: alt.id, newEquipmentName: alt.name, source: 'fallback',
      reasoning: why + alt.name + ' is free for the same time window, so "' + loser.projectTitle + '" is reassigned there with no schedule loss.'
    };
  }
  const duration = loser.endTime.getTime() - loser.startTime.getTime();
  const newStart = new Date(winner.endTime.getTime());
  const newEnd = new Date(newStart.getTime() + duration);
  const risk = newEnd > loser.deadline ? ' Note: the new slot ends after this project\'s deadline, so consider escalating to faculty.' : ' The new slot still finishes before its deadline.';
  return {
    winnerId: winner.id, loserId: loser.id, action: 'RESCHEDULE',
    newStart: newStart.toISOString(), newEnd: newEnd.toISOString(),
    newEquipmentId: null, newEquipmentName: null, source: 'fallback',
    reasoning: why + 'No equivalent equipment is free, so "' + loser.projectTitle + '" moves to start right after the winning slot.' + risk
  };
}

/** Validates model output against real data; returns null when it is unsafe to apply. */
export function normalizeAiResolution(out: AiOutput, a: ConflictBooking, b: ConflictBooking, alts: Alternative[]): Resolution | null {
  if (out.winnerId !== a.id && out.winnerId !== b.id) return null;
  const winner = out.winnerId === a.id ? a : b;
  const loser = out.winnerId === a.id ? b : a;
  const newStart = new Date(out.newStart);
  const newEnd = new Date(out.newEnd);
  if (newEnd <= newStart) return null;
  if (out.action === 'REASSIGN') {
    const alt = alts.find((x) => x.id === out.newEquipmentId);
    if (!alt) return null;
    const busy = alt.bookings.some((x) => ['PENDING', 'APPROVED'].includes(x.status) && overlaps(x, { startTime: newStart, endTime: newEnd }));
    if (busy) return null;
    return { winnerId: winner.id, loserId: loser.id, action: 'REASSIGN', newStart: newStart.toISOString(), newEnd: newEnd.toISOString(), newEquipmentId: alt.id, newEquipmentName: alt.name, reasoning: out.reasoning, source: 'gemini' };
  }
  if (overlaps(winner, { startTime: newStart, endTime: newEnd })) return null;
  return { winnerId: winner.id, loserId: loser.id, action: 'RESCHEDULE', newStart: newStart.toISOString(), newEnd: newEnd.toISOString(), newEquipmentId: null, newEquipmentName: null, reasoning: out.reasoning, source: 'gemini' };
}
