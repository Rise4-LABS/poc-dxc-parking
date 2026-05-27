import { PrismaClient } from '@prisma/client';
import { BookingNotFoundError, BookingNotCancellableError, ForbiddenError } from '@dxc/domain';
import type { Role } from '@dxc/domain';

export async function cancelBooking(db: PrismaClient, bookingId: string, userId: string, role: Role) {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new BookingNotFoundError(bookingId);
  if (booking.userId !== userId && !['ADMIN', 'SUPER_ADMIN'].includes(role)) throw new ForbiddenError();
  if (!['PENDING', 'CONFIRMED', 'HELD'].includes(booking.status)) throw new BookingNotCancellableError(booking.status);

  const [cancelled] = await db.$transaction([
    db.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } }),
    db.spot.update({ where: { id: booking.spotId }, data: { status: 'FREE' } }),
  ]);
  return cancelled;
}
