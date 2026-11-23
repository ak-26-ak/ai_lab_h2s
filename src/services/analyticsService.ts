import { prisma } from '@/lib/prisma';
import type { AnalyticsDTO, EquipmentStatus } from '@/lib/types';

const WEEK_HOURS_PER_ITEM = 7 * 12; // 12 usable lab hours per day
const MS_HOUR = 3_600_000;

export async function getAnalytics(): Promise<AnalyticsDTO> {
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * MS_HOUR);
  const [equipment, bookings] = await Promise.all([
    prisma.equipment.findMany({ select: { id: true, name: true, department: true, status: true } }),
    prisma.booking.findMany({ where: { status: { in: ['PENDING', 'APPROVED'] } }, select: { equipmentId: true, status: true, startTime: true, endTime: true } })
  ]);
  const approved = bookings.filter((b) => b.status === 'APPROVED');
  const hoursById = new Map<string, number>();
  for (const b of approved) {
    const start = Math.max(b.startTime.getTime(), now.getTime());
    const end = Math.min(b.endTime.getTime(), weekEnd.getTime());
    if (end > start) hoursById.set(b.equipmentId, (hoursById.get(b.equipmentId) ?? 0) + (end - start) / MS_HOUR);
  }
  const operational = equipment.filter((e) => e.status !== 'MAINTENANCE');
  const pct = (hours: number, items: number): number => (items === 0 ? 0 : Math.min(100, Math.round((hours / (items * WEEK_HOURS_PER_ITEM)) * 100)));
  const totalHours = operational.reduce((sum, e) => sum + (hoursById.get(e.id) ?? 0), 0);

  const departments = Array.from(new Set(equipment.map((e) => e.department))).sort();
  const byDepartment = departments.map((department) => {
    const items = operational.filter((e) => e.department === department);
    const hours = items.reduce((s, e) => s + (hoursById.get(e.id) ?? 0), 0);
    return { department, hours: Math.round(hours * 10) / 10, utilization: pct(hours, items.length) };
  });
  const topEquipment = operational
    .map((e) => ({ id: e.id, name: e.name, department: e.department, hours: Math.round((hoursById.get(e.id) ?? 0) * 10) / 10, utilization: pct(hoursById.get(e.id) ?? 0, 1) }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  const inUse = new Set(approved.filter((b) => b.startTime <= now && b.endTime > now).map((b) => b.equipmentId));
  const statusCounts: Record<EquipmentStatus, number> = { AVAILABLE: 0, IN_USE: 0, MAINTENANCE: 0 };
  for (const e of equipment) statusCounts[e.status === 'MAINTENANCE' ? 'MAINTENANCE' : inUse.has(e.id) ? 'IN_USE' : 'AVAILABLE']++;

  return {
    kpis: {
      totalEquipment: equipment.length,
      activeBookings: approved.filter((b) => b.endTime >= now).length,
      pendingApprovals: bookings.filter((b) => b.status === 'PENDING').length,
      utilizationRate: pct(totalHours, operational.length)
    },
    byDepartment, topEquipment, statusCounts
  };
}
