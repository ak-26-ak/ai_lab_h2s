import type { Prisma } from '@prisma/client';
import type { BookingDTO, BookingStatus } from '@/lib/types';

export const bookingInclude = {
  equipment: { select: { name: true, department: true, category: true } }
} satisfies Prisma.BookingInclude;

export type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export function toBookingDTO(b: BookingRow): BookingDTO {
  return {
    id: b.id, equipmentId: b.equipmentId, equipmentName: b.equipment.name, department: b.equipment.department,
    studentName: b.studentName, projectTitle: b.projectTitle, description: b.description,
    deadline: b.deadline.toISOString(), startTime: b.startTime.toISOString(), endTime: b.endTime.toISOString(),
    status: b.status as BookingStatus
  };
}
