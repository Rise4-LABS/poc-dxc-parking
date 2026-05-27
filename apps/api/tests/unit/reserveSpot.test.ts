import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reserveSpot } from '@dxc/application';
import {
  SpotNotFoundError,
  SpotNotAvailableError,
  SpotBlockedError,
  ActiveBookingExistsError,
  BookingConflictError,
  ForbiddenError,
} from '@dxc/domain';

function makeDb(overrides: Record<string, unknown> = {}) {
  const spot = { id: 'spot-1', number: 'S-01', type: 'STANDARD', status: 'FREE', label: null };
  const booking = { id: 'booking-1', userId: 'user-1', spotId: 'spot-1', date: '2026-06-01', startTime: '08:00', endTime: '18:00', status: 'CONFIRMED' };

  return {
    spot: {
      findUnique: vi.fn().mockResolvedValue(spot),
      update: vi.fn().mockResolvedValue({ ...spot, status: 'RESERVED' }),
    },
    booking: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(booking),
      update: vi.fn().mockResolvedValue(booking),
    },
    waitListEntry: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'wl-1' }),
    },
    $transaction: vi.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
    ...overrides,
  } as any;
}

const BASE_INPUT = {
  userId: 'user-1',
  role: 'USER' as const,
  spotId: 'spot-1',
  date: '2026-06-01',
  startTime: '08:00',
  endTime: '18:00',
};

describe('reserveSpot', () => {
  it('creates a CONFIRMED booking for a FREE spot', async () => {
    const db = makeDb();
    const result = await reserveSpot(db, BASE_INPUT);
    expect(result).toMatchObject({ status: 'CONFIRMED' });
    expect(db.booking.create).toHaveBeenCalledOnce();
  });

  it('throws SpotNotFoundError when spot does not exist', async () => {
    const db = makeDb();
    db.spot.findUnique = vi.fn().mockResolvedValue(null);
    await expect(reserveSpot(db, BASE_INPUT)).rejects.toThrow(SpotNotFoundError);
  });

  it('throws SpotBlockedError for BLOCKED spot', async () => {
    const db = makeDb();
    db.spot.findUnique = vi.fn().mockResolvedValue({ id: 'spot-1', status: 'BLOCKED' });
    await expect(reserveSpot(db, BASE_INPUT)).rejects.toThrow(SpotBlockedError);
  });

  it('throws SpotNotAvailableError for RESERVED spot without waitlist', async () => {
    const db = makeDb();
    db.spot.findUnique = vi.fn().mockResolvedValue({ id: 'spot-1', status: 'RESERVED' });
    await expect(reserveSpot(db, BASE_INPUT)).rejects.toThrow(SpotNotAvailableError);
  });

  it('joins waitlist when spot RESERVED and joinWaitListIfFull=true', async () => {
    const db = makeDb();
    db.spot.findUnique = vi.fn().mockResolvedValue({ id: 'spot-1', status: 'RESERVED' });
    const result = await reserveSpot(db, { ...BASE_INPUT, joinWaitListIfFull: true });
    expect(db.waitListEntry.create).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ id: 'wl-1' });
  });

  it('throws ActiveBookingExistsError when user already has booking that day', async () => {
    const db = makeDb();
    db.booking.findFirst = vi.fn().mockResolvedValue({ id: 'existing', status: 'CONFIRMED' });
    await expect(reserveSpot(db, BASE_INPUT)).rejects.toThrow(ActiveBookingExistsError);
  });

  it('throws BookingConflictError when slot is already taken', async () => {
    const db = makeDb();
    db.booking.findFirst = vi.fn()
      .mockResolvedValueOnce(null)       // no active booking for user
      .mockResolvedValueOnce({ id: 'conflict' }); // slot conflict
    await expect(reserveSpot(db, BASE_INPUT)).rejects.toThrow(BookingConflictError);
  });

  it('joins waitlist on conflict when joinWaitListIfFull=true', async () => {
    const db = makeDb();
    db.booking.findFirst = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'conflict' });
    await reserveSpot(db, { ...BASE_INPUT, joinWaitListIfFull: true });
    expect(db.waitListEntry.create).toHaveBeenCalledOnce();
  });

  it('throws ForbiddenError when called without role', async () => {
    const db = makeDb();
    await expect(
      reserveSpot(db, { ...BASE_INPUT, role: 'UNKNOWN' as any }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('updates spot status to RESERVED after booking', async () => {
    const db = makeDb();
    await reserveSpot(db, BASE_INPUT);
    expect(db.spot.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'RESERVED' }) }),
    );
  });
});
