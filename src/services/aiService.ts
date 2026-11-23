import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  fallbackResolution, normalizeAiResolution, parseAiOutput,
  type Alternative, type ConflictBooking
} from '@/lib/resolution';
import type { Resolution } from '@/lib/types';

function buildPrompt(a: ConflictBooking, b: ConflictBooking, alts: Alternative[]): string {
  const brief = (x: ConflictBooking): object => ({ id: x.id, project: x.projectTitle, deadline: x.deadline.toISOString(), start: x.startTime.toISOString(), end: x.endTime.toISOString(), status: x.status });
  return [
    'You resolve lab equipment scheduling conflicts for a university. Prefer the request with the nearer deadline, never bump an APPROVED booking, and prefer reassigning to equivalent free equipment over delaying.',
    'Requests: ' + JSON.stringify([brief(a), brief(b)]),
    'Free alternative equipment (same category): ' + JSON.stringify(alts.map((x) => ({ id: x.id, name: x.name }))),
    'Respond with ONLY JSON: {"winnerId": string, "action": "REASSIGN"|"RESCHEDULE", "newStart": ISO8601, "newEnd": ISO8601, "newEquipmentId": string|null, "reasoning": string (2-3 sentences)}.',
    'The new slot is for the LOSING request. For REASSIGN set newEquipmentId to an alternative id. For RESCHEDULE it must not overlap the winner.'
  ].join('\n');
}

export async function recommendResolution(a: ConflictBooking, b: ConflictBooking, alts: Alternative[]): Promise<Resolution> {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      const model = new GoogleGenerativeAI(key).getGenerativeModel({
        model: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
      });
      const result = await model.generateContent(buildPrompt(a, b, alts));
      const parsed = parseAiOutput(result.response.text());
      const normalized = parsed ? normalizeAiResolution(parsed, a, b, alts) : null;
      if (normalized) return normalized;
    } catch (error) {
      console.error('Gemini request failed, using fallback engine:', error instanceof Error ? error.message : error);
    }
  }
  return fallbackResolution(a, b, alts);
}
