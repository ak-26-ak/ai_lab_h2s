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

export async function listEquipment(filters: { q?: string; department?: string; category?: string }): Promise<EquipmentDTO[]> {
  const where: Prisma.EquipmentWhereInput = {};
  if (filters.department) where.department = filters.department;
  if (filters.category) where.category = filters.category;
  if (filters.q) where.OR = [{ name: { contains: filters.q } }, { description: { contains: filters.q } }, { category: { contains: filters.q } }];
  const now = new Date();
  // Single query: availability comes from an included, filtered relation (no N+1).
  const rows = await prisma.equipment.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { bookings: { where: { status: 'APPROVED', endTime: { gt: now } }, select: { startTime: true, endTime: true }, orderBy: { startTime: 'asc' } } }
  });
  return rows.map((r) => {
    const current = r.bookings.find((b) => b.startTime <= now && b.endTime > now);
    const status: EquipmentStatus = r.status === 'MAINTENANCE' ? 'MAINTENANCE' : current ? 'IN_USE' : 'AVAILABLE';
    return {
      id: r.id, name: r.name, category: r.category, department: r.department, description: r.description,
      specs: parseSpecs(r.specs), location: r.location, status, busyUntil: current ? current.endTime.toISOString() : null
    };
  });
}
