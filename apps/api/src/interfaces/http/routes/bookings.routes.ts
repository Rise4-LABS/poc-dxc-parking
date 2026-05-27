import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../../infrastructure/db/prismaClient';
import { authenticate } from '../middlewares/auth.middleware';
import { reserveSpot } from '@dxc/application';
import { cancelBooking } from '@dxc/application';
import { checkInBooking } from '@dxc/application';
import { releaseSpot } from '@dxc/application';

export const bookingsRouter = Router();
bookingsRouter.use(authenticate);

const createSchema = z.object({
  spotId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  joinWaitListIfFull: z.boolean().optional(),
});

bookingsRouter.get('/me', async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user!.sub },
      include: { spot: true },
      orderBy: { date: 'desc' },
    });
    res.json(bookings);
  } catch (err) { next(err); }
});

bookingsRouter.post('/', async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const booking = await reserveSpot(prisma, { ...body, userId: req.user!.sub, role: req.user!.role });
    res.status(201).json(booking);
  } catch (err) { next(err); }
});

bookingsRouter.patch('/:id/cancel', async (req, res, next) => {
  try {
    const booking = await cancelBooking(prisma, req.params.id, req.user!.sub, req.user!.role);
    res.json(booking);
  } catch (err) { next(err); }
});

bookingsRouter.patch('/:id/check-in', async (req, res, next) => {
  try {
    const booking = await checkInBooking(prisma, req.params.id, req.user!.sub);
    res.json(booking);
  } catch (err) { next(err); }
});

bookingsRouter.patch('/:id/release', async (req, res, next) => {
  try {
    const booking = await releaseSpot(prisma, req.params.id, req.user!.sub);
    res.json(booking);
  } catch (err) { next(err); }
});
