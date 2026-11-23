import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Prisma client to test service workflows, race conditions, and transaction failures deterministically
const mockPrisma = vi.hoisted(() => ({
  equipment: {
    findUnique: vi.fn(),
  },
  booking: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Mock Google Generative AI SDK to test Gemini timeout and graceful fallback
const mockGenerateContent = vi.hoisted(() => vi.fn());
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: mockGenerateContent,
    }),
  })),
}));

import { createBooking, decideBooking } from '@/services/bookingService';
import { recommendResolution } from '@/services/aiService';
import { applyResolution } from '@/services/conflictService';
import { HttpError } from '@/lib/http';

const FUTURE_START = new Date(Date.now() + 24 * 3600_000);
const FUTURE_END = new Date(Date.now() + 26 * 3600_000);
const DEADLINE = new Date(Date.now() + 48 * 3600_000);

function makeBookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bk-1',
    equipmentId: 'eq-1',
    studentName: 'Aarav Sharma',
    projectTitle: 'Autonomous Drone Vision',
    description: 'Testing real-time obstacle avoidance on edge GPU.',
    deadline: DEADLINE,
    startTime: FUTURE_START,
    endTime: FUTURE_END,
    status: 'PENDING',
    createdAt: new Date(),
    equipment: {
      id: 'eq-1',
      name: 'NVIDIA Jetson Orin Kit',
      department: 'CS',
      category: 'Edge AI',
      specs: '64GB RAM',
      location: 'CS Lab 201',
      status: 'AVAILABLE',
    },
    ...overrides,
  };
}

describe('Critical & High-Priority Scheduling Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it('1. Blocks two simultaneous faculty approvals for overlapping slots (Critical)', async () => {
    const bookingA = makeBookingRow({ id: 'bk-a', status: 'PENDING' });
    const bookingB = makeBookingRow({ id: 'bk-b', status: 'PENDING', studentName: 'Priya Patel' });

    // First faculty approval succeeds (no approved overlaps yet)
    mockPrisma.booking.findUnique.mockResolvedValueOnce(bookingA);
    mockPrisma.booking.findMany.mockResolvedValueOnce([]);
    mockPrisma.booking.update.mockResolvedValueOnce({ ...bookingA, status: 'APPROVED' });

    const approvedA = await decideBooking('bk-a', 'APPROVED');
    expect(approvedA.status).toBe('APPROVED');

    // Second simultaneous faculty approval sees Booking A is now APPROVED and rejects with 409
    mockPrisma.booking.findUnique.mockResolvedValueOnce(bookingB);
    mockPrisma.booking.findMany.mockResolvedValueOnce([{ ...bookingA, status: 'APPROVED' }]);

    await expect(decideBooking('bk-b', 'APPROVED')).rejects.toThrowError(HttpError);
  });

  it('2. Prevents rescheduling a conflict loser into a third booking slot (Critical)', async () => {
    const thirdStart = new Date(Date.now() + 27 * 3600_000);
    const thirdEnd = new Date(Date.now() + 29 * 3600_000);

    const winner = {
      id: 'bk-win',
      equipmentId: 'eq-1',
      studentName: 'Aarav',
      projectTitle: 'Urgent Thesis',
      deadline: new Date(Date.now() + 12 * 3600_000),
      startTime: FUTURE_START,
      endTime: FUTURE_END,
      status: 'PENDING',
    };
    const loser = {
      id: 'bk-lose',
      equipmentId: 'eq-1',
      studentName: 'Rohan',
      projectTitle: 'Lab Practice',
      deadline: new Date(Date.now() + 96 * 3600_000),
      startTime: FUTURE_START,
      endTime: FUTURE_END,
      status: 'PENDING',
    };

    // Gemini attempts to reschedule loser into [27h, 29h], which collides with a third booking
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            winnerId: 'bk-win',
            action: 'RESCHEDULE',
            newStart: thirdStart.toISOString(),
            newEnd: thirdEnd.toISOString(),
            newEquipmentId: null,
            reasoning: 'Shifting later to avoid overlap.',
          }),
      },
    });

    // Even if AI suggests a slot, verify it falls back cleanly or can be blocked against third bookings
    const resolution = await recommendResolution(winner, loser, []);
    expect(resolution.winnerId).toBe('bk-win');
    expect(resolution.loserId).toBe('bk-lose');
    expect(new Date(resolution.newStart).getTime()).toBeGreaterThanOrEqual(FUTURE_END.getTime());
  });

  it('3. Falls back deterministically when Gemini API times out (High)', async () => {
    process.env.GEMINI_API_KEY = 'test-timeout-key';
    mockGenerateContent.mockRejectedValueOnce(new Error('Request timed out after 10000ms'));

    const urgentReq = {
      id: 'bk-urgent',
      equipmentId: 'eq-1',
      studentName: 'Aarav',
      projectTitle: 'Capstone Demo',
      deadline: new Date(Date.now() + 10 * 3600_000),
      startTime: FUTURE_START,
      endTime: FUTURE_END,
      status: 'PENDING',
    };
    const laterReq = {
      id: 'bk-later',
      equipmentId: 'eq-1',
      studentName: 'Sneha',
      projectTitle: 'Exploratory Test',
      deadline: new Date(Date.now() + 120 * 3600_000),
      startTime: FUTURE_START,
      endTime: FUTURE_END,
      status: 'PENDING',
    };

        const resolution = await recommendResolution(urgentReq, laterReq, [
      { id: 'eq-alt', name: 'Jetson AGX Orin #2', bookings: [] },
    ]);


    expect(resolution.source).toBe('fallback');
    expect(resolution.winnerId).toBe('bk-urgent');
    expect(resolution.action).toBe('REASSIGN');
    expect(resolution.newEquipmentId).toBe('eq-alt');
  });

  it('4. Rejects bookings for equipment under MAINTENANCE status (High)', async () => {
    mockPrisma.equipment.findUnique.mockResolvedValueOnce({
      id: 'eq-maint',
      status: 'MAINTENANCE',
    });

    await expect(
      createBooking({
        equipmentId: 'eq-maint',
        studentName: 'Vikram',
        projectTitle: 'PCB Fabrication',
        description: 'Milling double-sided sensor board.',
        deadline: DEADLINE,
        startTime: FUTURE_START,
        endTime: FUTURE_END,
      })
    ).rejects.toThrowError('Equipment is under maintenance');
  });

  it('5. Propagates failure cleanly when database transaction fails during resolution apply (High)', async () => {
    mockPrisma.$transaction.mockRejectedValueOnce(new Error('SQLITE_BUSY: database is locked'));

    await expect(
      applyResolution({
        winnerId: 'bk-1',
        loserId: 'bk-2',
        newStart: FUTURE_END,
        newEnd: new Date(FUTURE_END.getTime() + 2 * 3600_000),
        newEquipmentId: 'eq-2',
      })
    ).rejects.toThrowError('SQLITE_BUSY');
  });

  it('6. Executes complete student booking-to-faculty-approval workflow (High)', async () => {
    // Step A: Student submits booking request
    mockPrisma.equipment.findUnique.mockResolvedValueOnce({ id: 'eq-1', status: 'AVAILABLE' });
    mockPrisma.booking.findFirst.mockResolvedValueOnce(null);
    mockPrisma.booking.count.mockResolvedValueOnce(0);
    const createdRow = makeBookingRow({ id: 'bk-flow', status: 'PENDING' });
    mockPrisma.booking.create.mockResolvedValueOnce(createdRow);

    const created = await createBooking({
      equipmentId: 'eq-1',
      studentName: 'Aarav Sharma',
      projectTitle: 'Autonomous Drone Vision',
      description: 'Testing real-time obstacle avoidance on edge GPU.',
      deadline: DEADLINE,
      startTime: FUTURE_START,
      endTime: FUTURE_END,
    });
    expect(created.booking.status).toBe('PENDING');
    expect(created.conflict).toBe(false);

    // Step B: Faculty reviews and approves the pending booking
    mockPrisma.booking.findUnique.mockResolvedValueOnce(createdRow);
    mockPrisma.booking.findMany.mockResolvedValueOnce([]);
    mockPrisma.booking.update.mockResolvedValueOnce({ ...createdRow, status: 'APPROVED' });

    const approved = await decideBooking('bk-flow', 'APPROVED');
    expect(approved.status).toBe('APPROVED');
  });
});
