import { z } from 'zod';

export const DEPARTMENTS = ['CS', 'Electronics', 'Mechanical'] as const;

export const equipmentQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  department: z.enum(DEPARTMENTS).optional(),
  category: z.string().trim().max(40).optional()
});

export const bookingCreateSchema = z
  .object({
    equipmentId: z.string().min(1, 'Select equipment'),
    studentName: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
    projectTitle: z.string().trim().min(3, 'Project title must be at least 3 characters').max(100),
    description: z.string().trim().min(10, 'Describe your needs in at least 10 characters').max(500),
    deadline: z.coerce.date({ errorMap: () => ({ message: 'Enter a valid deadline' }) }),
    startTime: z.coerce.date({ errorMap: () => ({ message: 'Enter a valid start time' }) }),
    endTime: z.coerce.date({ errorMap: () => ({ message: 'Enter a valid end time' }) })
  })
  .refine((d) => d.endTime > d.startTime, { message: 'End time must be after start time', path: ['endTime'] });

export const bookingStatusSchema = z.object({ status: z.enum(['APPROVED', 'REJECTED']) });
export const bookingQuerySchema = z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional() });

export const applyResolutionSchema = z.object({
  winnerId: z.string().min(1),
  loserId: z.string().min(1),
  newStart: z.coerce.date(),
  newEnd: z.coerce.date(),
  newEquipmentId: z.string().min(1).nullable()
});

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
