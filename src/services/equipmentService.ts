import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { EquipmentDTO, EquipmentStatus } from '@/lib/types';

const specsSchema = z.record(z.string());

function parseSpecs(raw: string): Record<string, string> {
  try {
    const parsed = specsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/**
 * Queries equipment catalog with targeted column projection and fetches at most
 * one active overlapping booking per item (eliminating N+1 queries and excess payload).
 */
export async function listEquipment(filters: {
  q?: string;
  department?: string;
  category?: string;
}): Promise<EquipmentDTO[]> {
  const where: Prisma.EquipmentWhereInput = {};
  if (filters.department) where.department = filters.department;
  if (filters.category) where.category = filters.category;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q } },
      { description: { contains: filters.q } },
      { category: { contains: filters.q } },
    ];
  }

  const now = new Date();
  const rows = await prisma.equipment.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      category: true,
      department: true,
      description: true,
      specs: true,
      location: true,
      status: true,
      bookings: {
        where: {
          status: 'APPROVED',
          startTime: { lte: now },
          endTime: { gt: now },
        },
        select: { endTime: true },
        orderBy: { endTime: 'asc' },
        take: 1,
      },
    },
  });

  return rows.map((r) => {
    const activeBooking = r.bookings[0];
    const status: EquipmentStatus =
      r.status === 'MAINTENANCE' ? 'MAINTENANCE' : activeBooking ? 'IN_USE' : 'AVAILABLE';

    return {
      id: r.id,
      name: r.name,
      category: r.category,
      department: r.department,
      description: r.description,
      specs: parseSpecs(r.specs),
      location: r.location,
      status,
      busyUntil: activeBooking ? activeBooking.endTime.toISOString() : null,
    };
  });
}
