import { PrismaClient } from '@prisma/client';
import {
  SpotNotFoundError, SpotNotAvailableError, SpotBlockedError,
  BookingConflictError, ActiveBookingExistsError, WaitListConflictError,
} from '@dxc/domain';
import { SpotStateMachine } from '@dxc/domain';
import { RbacPolicy, type Role } from '@dxc/domain';

interface ReserveSpotInput {
  userId: string;
  role: Role;
  spotId: string;
  date: string;
  startTime: string;
  endTime: string;
  joinWaitListIfFull?: boolean;
}

export async function reserveSpot(db: PrismaClient, input: ReserveSpotInput) {
  RbacPolicy.requireUser(input.role);

  const spot = await db.spot.findUnique({ where: { id: input.spotId } });
  if (!spot) throw new SpotNotFoundError(input.spotId);
  if (spot.status === 'BLOCKED') throw new SpotBlockedError(spot.id);
  if (!['FREE', 'RELEASED'].includes(spot.status)) {
    if (input.joinWaitListIfFull) return addToWaitList(db, input);
    throw new SpotNotAvailableError(spot.id, spot.status);
  }

  const activeBooking = await db.booking.findFirst({
    where: {
      userId: input.userId,
      date: input.date,
      status: { in: ['CONFIRMED', 'HELD', 'OCCUPIED'] },
    },
  });
  if (activeBooking) throw new ActiveBookingExistsError();

  const conflict = await db.booking.findFirst({
    where: {
      spotId: input.spotId,
      date: input.date,
      status: { in: ['CONFIRMED', 'HELD', 'OCCUPIED'] },
    },
  });
  if (conflict) {
    if (input.joinWaitListIfFull) return addToWaitList(db, input);
    throw new BookingConflictError();
  }

  const { newStatus } = SpotStateMachine.confirm(spot.id, spot.status as any);

  const [booking] = await db.$transaction([
    db.booking.create({
      data: {
        userId: input.userId,
        spotId: input.spotId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        status: 'CONFIRMED',
      },
    }),
    db.spot.update({ where: { id: spot.id }, data: { status: newStatus } }),
  ]);

  return booking;
}

async function addToWaitList(db: PrismaClient, input: ReserveSpotInput) {
  const existing = await db.waitListEntry.findFirst({
    where: { userId: input.userId, spotId: input.spotId, date: input.date, promotedAt: null },
  });
  if (existing) throw new WaitListConflictError();
  return db.waitListEntry.create({
    data: {
      userId: input.userId,
      spotId: input.spotId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
    },
  });
}
