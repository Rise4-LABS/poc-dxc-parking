import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../../infrastructure/db/prismaClient';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { blockSpot, unblockSpot, cancelBooking } from '@dxc/application';

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole('ADMIN', 'SUPER_ADMIN'));

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const spots = await prisma.spot.groupBy({ by: ['status'], _count: { id: true } });
    const total = await prisma.spot.count();
    const counts = Object.fromEntries(spots.map((s) => [s.status.toLowerCase(), s._count.id]));
    res.json({
      free: counts['free'] ?? 0,
      reserved: (counts['reserved'] ?? 0) + (counts['held'] ?? 0),
      occupied: counts['occupied'] ?? 0,
      blocked: counts['blocked'] ?? 0,
      total,
    });
  } catch (err) { next(err); }
});

adminRouter.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, accessId: true, role: true, locale: true } });
    res.json(users);
  } catch (err) { next(err); }
});

// POST /bookings — création admin (expansion multi-jours)
adminRouter.post('/bookings', async (req, res, next) => {
  try {
    const { spotId, startDate, endDate, startTime, endTime, userId, vehicleLabel, isIndefinite, adminNote } = req.body as {
      spotId: string; startDate: string; endDate?: string;
      startTime: string; endTime?: string | null;
      userId?: string; vehicleLabel?: string;
      isIndefinite?: boolean; adminNote?: string;
    };

    if (isIndefinite) {
      const booking = await prisma.booking.create({
        data: {
          spotId, date: startDate, startTime, endTime: null,
          userId: userId ?? null, vehicleLabel, isIndefinite: true,
          adminNote, source: 'ADMIN', status: 'BLOCKED',
        },
        include: { user: { select: { id: true, name: true, accessId: true } }, spot: true },
      });
      return res.status(201).json([booking]);
    }

    const start = new Date(startDate + 'T00:00:00');
    const end   = new Date((endDate ?? startDate) + 'T00:00:00');
    const created = [];
    const d = new Date(start);
    while (d <= end) {
      const dateStr = d.toISOString().slice(0, 10);
      const booking = await prisma.booking.create({
        data: {
          spotId, date: dateStr, startTime, endTime: endTime ?? null,
          userId: userId ?? null, vehicleLabel, isIndefinite: false,
          adminNote, source: 'ADMIN', status: 'OCCUPIED',
        },
        include: { user: { select: { id: true, name: true, accessId: true } }, spot: true },
      });
      created.push(booking);
      d.setDate(d.getDate() + 1);
    }
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// GET /bookings
adminRouter.get('/bookings', async (req, res, next) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const bookings = await prisma.booking.findMany({
      where: {
        ...(from && to ? { date: { gte: from, lte: to } } : {}),
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        user: { select: { id: true, name: true, accessId: true } },
        spot: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    res.json(bookings);
  } catch (err) { next(err); }
});

// PATCH /bookings/:id/cancel — doit être AVANT le PATCH générique
adminRouter.patch('/bookings/:id/cancel', async (req, res, next) => {
  try {
    const booking = await cancelBooking(prisma, req.params.id, req.user!.sub, req.user!.role);
    res.json(booking);
  } catch (err) { next(err); }
});

// PATCH /bookings/:id — mise à jour admin (champs libres)
adminRouter.patch('/bookings/:id', async (req, res, next) => {
  try {
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: req.body as Parameters<typeof prisma.booking.update>[0]['data'],
      include: { user: { select: { id: true, name: true, accessId: true } }, spot: true },
    });
    res.json(booking);
  } catch (err) { next(err); }
});

// DELETE /bookings/:id — suppression admin
adminRouter.delete('/bookings/:id', async (req, res, next) => {
  try {
    await prisma.booking.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) { next(err); }
});

adminRouter.post('/spots/:id/block', async (req, res, next) => {
  try {
    const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body);
    await blockSpot(prisma, req.params.id, reason, req.user!.role);
    res.status(204).end();
  } catch (err) { next(err); }
});

adminRouter.post('/spots/:id/unblock', async (req, res, next) => {
  try {
    await unblockSpot(prisma, req.params.id, req.user!.role);
    res.status(204).end();
  } catch (err) { next(err); }
});
