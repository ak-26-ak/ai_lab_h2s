import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Slot } from '@/lib/conflicts';
import {
  fallbackResolution,
  normalizeAiResolution,
  parseAiOutput,
  type Alternative,
  type ConflictBooking,
} from '@/lib/resolution';
import { aiOutputValidationSchema } from '@/lib/schemas';
import type { Resolution } from '@/lib/types';

function buildPrompt(a: ConflictBooking, b: ConflictBooking, alts: Alternative[]): string {
  const brief = (x: ConflictBooking): object => ({
    id: x.id,
    project: x.projectTitle,
    deadline: x.deadline.toISOString(),
    start: x.startTime.toISOString(),
    end: x.endTime.toISOString(),
    status: x.status,
  });

  return [
    'You resolve lab equipment scheduling conflicts for a university. Prefer the request with the nearer deadline, never bump an APPROVED booking, and prefer reassigning to equivalent free equipment over delaying.',
    'Requests: ' + JSON.stringify([brief(a), brief(b)]),
    'Free alternative equipment (same category): ' + JSON.stringify(alts.map((x) => ({ id: x.id, name: x.name }))),
    'Respond with ONLY JSON: {"winnerId": string, "action": "REASSIGN"|"RESCHEDULE", "newStart": ISO8601, "newEnd": ISO8601, "newEquipmentId": string|null, "reasoning": string (2-3 sentences)}.',
    'The new slot is for the LOSING request. For REASSIGN set newEquipmentId to an alternative id. For RESCHEDULE it must not overlap the winner or any existing booking.',
  ].join('\n');
}

/**
 * Validates AI recommendations against domain invariants:
 * 1. Schema conformance via Zod.
 * 2. Never displaces an already-APPROVED booking.
 * 3. Rejects hallucinated equipment IDs not present in verified free alternatives.
 * 4. Ensures rescheduled time windows are valid and non-overlapping.
 */
function verifySafeAiResolution(
  raw: unknown,
  a: ConflictBooking,
  b: ConflictBooking,
  alts: Alternative[]
): boolean {
  const checked = aiOutputValidationSchema.safeParse(raw);
  if (!checked.success) return false;

  const { winnerId, action, newEquipmentId, newStart, newEnd } = checked.data;
  if (winnerId !== a.id && winnerId !== b.id) return false;

  const loser = winnerId === a.id ? b : a;
  const winner = winnerId === a.id ? a : b;

  // Never allow AI to bump an already-approved booking
  if (loser.status === 'APPROVED') return false;

  // Reject invalid/hallucinated alternative equipment IDs
  if (action === 'REASSIGN') {
    const validAltIds = new Set(alts.map((alt) => alt.id));
    if (!newEquipmentId || !validAltIds.has(newEquipmentId)) return false;
  }

  // Reject inverted or overlapping rescheduled time windows
  const startMs = new Date(newStart).getTime();
  const endMs = new Date(newEnd).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs >= endMs) return false;
  if (action === 'RESCHEDULE' && startMs < winner.endTime.getTime() && endMs > winner.startTime.getTime()) {
    return false;
  }

  return true;
}

export async function recommendResolution(
  a: ConflictBooking,
  b: ConflictBooking,
  alts: Alternative[],
  existingBookings: Slot[] = []
): Promise<Resolution> {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      const model = new GoogleGenerativeAI(key).getGenerativeModel({
        model: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      });
      const result = await model.generateContent(buildPrompt(a, b, alts));
      const parsed = parseAiOutput(result.response.text());

      if (parsed && verifySafeAiResolution(parsed, a, b, alts)) {
        const normalized = normalizeAiResolution(parsed, a, b, alts, existingBookings);
        if (normalized) return normalized;
      }
    } catch (error) {
      console.error('Gemini request failed, using fallback engine:', error instanceof Error ? error.message : error);
    }
  }
  return fallbackResolution(a, b, alts, existingBookings);
}
