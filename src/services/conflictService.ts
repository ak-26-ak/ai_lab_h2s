import { findConflictPairs, canApprove } from '@/lib/conflicts';
import { HttpError } from '@/lib/http';
import { bookingInclude, toBookingDTO } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';
import type { ConflictDTO } from '@/lib/types';
import type { Alternative, ConflictBooking } from '@/lib/resolution';
import { recommendResolution } from '@/services/aiService';

export async function listConflicts(): Promise<ConflictDTO[]> {
  // Two queries total, regardless of how many conflicts exist.
  const [rows, equipment] = await Promise.all([
    prisma.booking.findMany({ where: { status: { in: ['PENDING', 'APPROVED'] } }, include: bookingInclude, orderBy: { startTime: 'asc' } }),
    prisma.equipment.findMany({ where: { status: { not: 'MAINTENANCE' } }, select: { id: true, name: true, category: true } })
  ]);
  const pairs = findConflictPairs(rows);
  return Promise.all(
    pairs.map(async ([a, b]) => {
      const category = a.equipment.category;
      const alts: Alternative[] = equipment
        .filter((e) => e.category === category && e.id !== a.equipmentId)
        .map((e) => ({ id: e.id, name: e.name, bookings: rows.filter((r) => r.equipmentId === e.id) }));
      const toCb = (r: typeof a): ConflictBooking => ({ ...r });
      const recommendation = await recommendResolution(toCb(a), toCb(b), alts);
      return { id: a.id + ':' + b.id, bookings: [toBookingDTO(a), toBookingDTO(b)] as ConflictDTO['bookings'], recommendation };
    })
  );
}

export async function applyResolution(input: { winnerId: string; loserId: string; newStart: Date; newEnd: Date; newEquipmentId: string | null }): Promise<{ ok: true }> {
  await prisma.$transaction(async (tx) => {
    const [winner, loser] = await Promise.all([tx.booking.findUnique({ where: { id: input.winnerId } }), tx.booking.findUnique({ where: { id: input.loserId } })]);
    if (!winner || !loser) throw new HttpError(404, 'Booking not found');
    if (winner.status === 'REJECTED' || loser.status !== 'PENDING') throw new HttpError(409, 'Conflict is no longer actionable');

    if (winner.status === 'PENDING') {
      const approved = await tx.booking.findMany({
        where: { equipmentId: winner.equipmentId, status: 'APPROVED', id: { not: winner.id }, startTime: { lt: winner.endTime }, endTime: { gt: winner.startTime } }
      });
      const check = canApprove(winner, approved);
      if (!check.ok) throw new HttpError(409, check.reason ?? 'Cannot approve winner');
    }
    const equipmentId = input.newEquipmentId ?? loser.equipmentId;
    const taken = await tx.booking.count({
      where: { equipmentId, id: { not: loser.id }, status: { in: ['PENDING', 'APPROVED'] }, startTime: { lt: input.newEnd }, endTime: { gt: input.newStart } }
    });
    const winnerOnSame = equipmentId === winner.equipmentId && winner.startTime < input.newEnd && winner.endTime > input.newStart;
    if (taken - (winnerOnSame ? 1 : 0) > 0 || winnerOnSame) throw new HttpError(409, 'Proposed slot is no longer free');

    await tx.booking.update({ where: { id: winner.id }, data: { status: 'APPROVED' } });
    await tx.booking.update({ where: { id: loser.id }, data: { equipmentId, startTime: input.newStart, endTime: input.newEnd } });
  });
  return { ok: true };
}
