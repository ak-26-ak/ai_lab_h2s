import { canApprove } from '@/lib/conflicts';
import { HttpError } from '@/lib/http';
import { bookingInclude, toBookingDTO } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';
import type { BookingCreateInput } from '@/lib/schemas';
import type { BookingDTO, BookingStatus } from '@/lib/types';
import { invalidateAnalyticsCache } from '@/services/analyticsService';

export async function listBookings(status?: BookingStatus): Promise<BookingDTO[]> {
  const rows = await prisma.booking.findMany({
    where: status ? { status } : undefined,
    include: bookingInclude,
    orderBy: { startTime: 'asc' },
  });
  return rows.map(toBookingDTO);
}

export async function createBooking(input: BookingCreateInput): Promise<{ booking: BookingDTO; conflict: boolean }> {
  const equipment = await prisma.equipment.findUnique({
    where: { id: input.equipmentId },
    select: { id: true, status: true },
  });
  if (!equipment) throw new HttpError(404, 'Equipment not found');
  if (equipment.status === 'MAINTENANCE') throw new HttpError(409, 'Equipment is under maintenance');
  if (input.startTime.getTime() < Date.now()) throw new HttpError(400, 'Start time must be in the future');

  // Protect against repeated/duplicate booking submissions by the same student
  const duplicate = await prisma.booking.findFirst({
    where: {
      equipmentId: input.equipmentId,
      studentName: input.studentName,
      status: { in: ['PENDING', 'APPROVED'] },
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new HttpError(
      409,
      'You already have an active or pending booking for this equipment during this time slot',
      'DUPLICATE_BOOKING'
    );
  }

  const clashes = await prisma.booking.count({
    where: {
      equipmentId: input.equipmentId,
      status: { in: ['PENDING', 'APPROVED'] },
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    },
  });
  const row = await prisma.booking.create({ data: { ...input, status: 'PENDING' }, include: bookingInclude });
  invalidateAnalyticsCache();
  return { booking: toBookingDTO(row), conflict: clashes > 0 };
}

export async function decideBooking(id: string, status: 'APPROVED' | 'REJECTED'): Promise<BookingDTO> {
  const target = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!target) throw new HttpError(404, 'Booking not found');
  if (target.status !== 'PENDING') throw new HttpError(409, 'Only pending bookings can be decided');
  if (status === 'APPROVED') {
    const overlapping = await prisma.booking.findMany({
      where: {
        equipmentId: target.equipmentId,
        status: 'APPROVED',
        id: { not: id },
        startTime: { lt: target.endTime },
        endTime: { gt: target.startTime },
      },
    });
    const check = canApprove(target, overlapping);
    if (!check.ok) throw new HttpError(409, check.reason ?? 'Cannot approve');
  }
  const updated = await prisma.booking.update({ where: { id }, data: { status }, include: bookingInclude });
  invalidateAnalyticsCache();
  return toBookingDTO(updated);
}
