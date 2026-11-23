export type Role = 'STUDENT' | 'FACULTY' | 'ADMIN';
export type EquipmentStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface EquipmentDTO {
  id: string;
  name: string;
  category: string;
  department: string;
  description: string;
  specs: Record<string, string>;
  location: string;
  status: EquipmentStatus;
  busyUntil: string | null;
}

export interface BookingDTO {
  id: string;
  equipmentId: string;
  equipmentName: string;
  department: string;
  studentName: string;
  projectTitle: string;
  description: string;
  deadline: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
}

export type ResolutionAction = 'REASSIGN' | 'RESCHEDULE';

export interface Resolution {
  winnerId: string;
  loserId: string;
  action: ResolutionAction;
  newStart: string;
  newEnd: string;
  newEquipmentId: string | null;
  newEquipmentName: string | null;
  reasoning: string;
  source: 'gemini' | 'fallback';
}

export interface ConflictDTO {
  id: string;
  bookings: [BookingDTO, BookingDTO];
  recommendation: Resolution;
}

export interface AnalyticsDTO {
  kpis: { totalEquipment: number; activeBookings: number; pendingApprovals: number; utilizationRate: number };
  byDepartment: { department: string; hours: number; utilization: number }[];
  topEquipment: { id: string; name: string; department: string; hours: number; utilization: number }[];
  statusCounts: Record<EquipmentStatus, number>;
}
