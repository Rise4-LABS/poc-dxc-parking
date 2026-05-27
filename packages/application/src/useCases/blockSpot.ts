import { PrismaClient } from '@prisma/client';
import { SpotNotFoundError, ForbiddenError } from '@dxc/domain';
import { SpotStateMachine } from '@dxc/domain';
import type { Role } from '@dxc/domain';

export async function blockSpot(db: PrismaClient, spotId: string, reason: string, role: Role) {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) throw new ForbiddenError();
  const spot = await db.spot.findUnique({ where: { id: spotId } });
  if (!spot) throw new SpotNotFoundError(spotId);
  SpotStateMachine.block(spot.id, spot.status as any);
  return db.spot.update({ where: { id: spotId }, data: { status: 'BLOCKED', blockReason: reason } });
}

export async function unblockSpot(db: PrismaClient, spotId: string, role: Role) {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) throw new ForbiddenError();
  const spot = await db.spot.findUnique({ where: { id: spotId } });
  if (!spot) throw new SpotNotFoundError(spotId);
  SpotStateMachine.unblock(spot.id, spot.status as any);
  return db.spot.update({ where: { id: spotId }, data: { status: 'FREE', blockReason: null } });
}
