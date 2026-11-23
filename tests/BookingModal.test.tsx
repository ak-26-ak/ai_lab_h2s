import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BookingModal } from '@/components/BookingModal';
import type { EquipmentDTO } from '@/lib/types';

const equipment: EquipmentDTO = {
  id: 'e1', name: 'RTX 4090 GPU Workstation', category: 'Compute', department: 'CS', description: 'GPU box', specs: {}, location: 'Room 204', status: 'AVAILABLE', busyUntil: null
};

describe('BookingModal', () => {
  it('is an accessible dialog with labelled inputs', () => {
    render(<BookingModal equipment={equipment} role="STUDENT" onClose={() => undefined} onDone={() => undefined} />);
    expect(screen.getByRole('dialog', { name: 'Request access' })).toBeInTheDocument();
    expect(screen.getByLabelText('Project title')).toBeInTheDocument();
  });
  it('shows inline validation errors for an empty submission', () => {
    render(<BookingModal equipment={equipment} role="STUDENT" onClose={() => undefined} onDone={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(3);
  });
  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<BookingModal equipment={equipment} role="STUDENT" onClose={onClose} onDone={() => undefined} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
