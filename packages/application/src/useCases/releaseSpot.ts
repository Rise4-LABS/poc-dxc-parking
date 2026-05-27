import { PrismaClient } from '@prisma/client';
import { BookingNotFoundError, ForbiddenError, SpotNotAvailableError } from '@dxc/domain';

export async function releaseSpot(db: PrismaClient, bookingId: string, userId: string) {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new BookingNotFoundError(bookingId);
  if (booking.userId !== userId) throw new ForbiddenError();
  if (booking.status !== 'OCCUPIED') throw new SpotNotAvailableError(booking.spotId, booking.status);

  const [updated] = await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: { status: 'RELEASED', releasedAt: new Date() },
    }),
    db.spot.update({ where: { id: booking.spotId }, data: { status: 'RELEASED' } }),
  ]);
  return updated;
}
