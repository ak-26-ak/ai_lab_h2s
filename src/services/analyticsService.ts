import { prisma } from '@/lib/prisma';
import type { AnalyticsDTO, EquipmentStatus } from '@/lib/types';

const WEEK_HOURS_PER_ITEM = 7 * 12; // 12 usable lab hours per day across a 7-day window
const MS_HOUR = 3_600_000;
const CACHE_TTL_MS = 15_000;

let cachedAnalytics: { value: AnalyticsDTO; expiresAt: number } | null = null;

/** Invalidates the short-lived analytics cache after any booking or conflict mutation. */
export function invalidateAnalyticsCache(): void {
  cachedAnalytics = null;
}

/**
 * Computes fleet KPIs, weekly department utilization, and top-utilized equipment
 * in O(E + B) single-pass linear time with short-lived response caching.
 */
export async function getAnalytics(): Promise<AnalyticsDTO> {
  const nowMs = Date.now();
  if (cachedAnalytics && nowMs < cachedAnalytics.expiresAt) {
    return cachedAnalytics.value;
  }

  const now = new Date(nowMs);
  const weekEndMs = nowMs + 7 * 24 * MS_HOUR;

  const [equipment, bookings] = await Promise.all([
    prisma.equipment.findMany({
      select: { id: true, name: true, department: true, status: true },
    }),
    prisma.booking.findMany({
      where: {
        OR: [
          { status: 'PENDING' },
          { status: 'APPROVED', endTime: { gt: now } },
        ],
      },
      select: { equipmentId: true, status: true, startTime: true, endTime: true },
    }),
  ]);

  const hoursById = new Map<string, number>();
  const inUseIds = new Set<string>();
  let activeBookings = 0;
  let pendingApprovals = 0;

  // Single pass over active/pending bookings
  for (const b of bookings) {
    if (b.status === 'PENDING') {
      pendingApprovals += 1;
      continue;
    }

    const startMs = b.startTime.getTime();
    const endMs = b.endTime.getTime();

    if (endMs >= nowMs) activeBookings += 1;
    if (startMs <= nowMs && endMs > nowMs) inUseIds.add(b.equipmentId);

    const clampedStart = Math.max(startMs, nowMs);
    const clampedEnd = Math.min(endMs, weekEndMs);
    if (clampedEnd > clampedStart) {
      hoursById.set(
        b.equipmentId,
        (hoursById.get(b.equipmentId) ?? 0) + (clampedEnd - clampedStart) / MS_HOUR
      );
    }
  }

  const pct = (hours: number, items: number): number =>
    items === 0 ? 0 : Math.min(100, Math.round((hours / (items * WEEK_HOURS_PER_ITEM)) * 100));

  const deptMap = new Map<string, { hours: number; count: number }>();
  const statusCounts: Record<EquipmentStatus, number> = {
    AVAILABLE: 0,
    IN_USE: 0,
    MAINTENANCE: 0,
  };
  const topCandidates: Array<{
    id: string;
    name: string;
    department: string;
    hours: number;
    utilization: number;
  }> = [];

  let operationalCount = 0;
  let totalOperationalHours = 0;

  // Single pass over equipment catalog
  for (const e of equipment) {
    if (e.status === 'MAINTENANCE') {
      statusCounts.MAINTENANCE += 1;
      continue;
    }

    statusCounts[inUseIds.has(e.id) ? 'IN_USE' : 'AVAILABLE'] += 1;
    operationalCount += 1;

    const itemHours = hoursById.get(e.id) ?? 0;
    totalOperationalHours += itemHours;

    const deptEntry = deptMap.get(e.department) ?? { hours: 0, count: 0 };
    deptEntry.hours += itemHours;
    deptEntry.count += 1;
    deptMap.set(e.department, deptEntry);

    topCandidates.push({
      id: e.id,
      name: e.name,
      department: e.department,
      hours: Math.round(itemHours * 10) / 10,
      utilization: pct(itemHours, 1),
    });
  }

  const byDepartment = Array.from(deptMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([department, stats]) => ({
      department,
      hours: Math.round(stats.hours * 10) / 10,
      utilization: pct(stats.hours, stats.count),
    }));

  const topEquipment = topCandidates
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  const result: AnalyticsDTO = {
    kpis: {
      totalEquipment: equipment.length,
      activeBookings,
      pendingApprovals,
      utilizationRate: pct(totalOperationalHours, operationalCount),
    },
    byDepartment,
    topEquipment,
    statusCounts,
  };

  cachedAnalytics = { value: result, expiresAt: nowMs + CACHE_TTL_MS };
  return result;
}
