import { z } from 'zod';

export const DEPARTMENTS = ['CS', 'Electronics', 'Mechanical'] as const;
export const ROLES = ['STUDENT', 'FACULTY', 'ADMIN'] as const;
export const BOOKING_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const EQUIPMENT_STATUSES = ['AVAILABLE', 'IN_USE', 'MAINTENANCE'] as const;

export const roleSchema = z.enum(ROLES);
export const bookingStatusValueSchema = z.enum(BOOKING_STATUSES);
export const equipmentStatusValueSchema = z.enum(EQUIPMENT_STATUSES);

export const equipmentQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  department: z.enum(DEPARTMENTS).optional(),
  category: z.string().trim().max(40).optional(),
});

export const bookingCreateSchema = z
  .object({
    equipmentId: z.string().min(1, 'Select equipment'),
    studentName: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
    projectTitle: z.string().trim().min(3, 'Project title must be at least 3 characters').max(100),
    description: z.string().trim().min(10, 'Describe your needs in at least 10 characters').max(500),
    deadline: z.coerce.date({ errorMap: () => ({ message: 'Enter a valid deadline' }) }),
    startTime: z.coerce.date({ errorMap: () => ({ message: 'Enter a valid start time' }) }),
    endTime: z.coerce.date({ errorMap: () => ({ message: 'Enter a valid end time' }) }),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export const bookingStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export const bookingQuerySchema = z.object({
  status: bookingStatusValueSchema.optional(),
});

export const applyResolutionSchema = z.object({
  winnerId: z.string().min(1),
  loserId: z.string().min(1),
  action: z.enum(['REASSIGN', 'RESCHEDULE']),
  newStart: z.coerce.date(),
  newEnd: z.coerce.date(),
  newEquipmentId: z.string().nullable().optional(),
});

export const aiOutputValidationSchema = z.object({
  winnerId: z.string().min(1),
  action: z.enum(['REASSIGN', 'RESCHEDULE']),
  newStart: z.string().min(1),
  newEnd: z.string().min(1),
  newEquipmentId: z.string().nullable(),
  reasoning: z.string().min(5).max(800),
});

export type EquipmentQueryInput = z.infer<typeof equipmentQuerySchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type ApplyResolutionInput = z.infer<typeof applyResolutionSchema>;
