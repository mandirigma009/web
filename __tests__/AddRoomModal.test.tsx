// __tests__/AddRoomModal.test.tsx
// Jest + React Testing Library test for AddRoomModal
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddRoomModal from '../src/components/Dashboard/AddRoomModal';

global.fetch = jest.fn();

describe('AddRoomModal', () => {
  const onClose = jest.fn();
  const onAddRoomSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates and posts to API then calls callbacks', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 100, room_number: '101', room_name: 'Room101', building_name: 'Main' }),
    });

    render(<AddRoomModal isOpen={true} onClose={onClose} onAddRoomSuccess={onAddRoomSuccess} />);

    const saveBtn = screen.getByText(/Save Room/i);
    fireEvent.click(saveBtn);

    // validation prevents fetch
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(0));

    fireEvent.change(screen.getByLabelText(/Room Number \*/i) || screen.getByLabelText(/Room Number/i), { target: { value: '101' } });
    fireEvent.change(screen.getByLabelText(/Room Name \*/i) || screen.getByLabelText(/Room Name/i), { target: { value: 'Room101' } });
    fireEvent.change(screen.getByLabelText(/Building \*/i) || screen.getByLabelText(/Building/i), { target: { value: 'Main' } });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(onAddRoomSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: 100 }));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
