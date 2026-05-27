import { Router } from 'express';
import { prisma } from '../../../infrastructure/db/prismaClient';
import { authenticate } from '../middlewares/auth.middleware';

export const spotsRouter = Router();
spotsRouter.use(authenticate);

spotsRouter.get('/', async (req, res, next) => {
  try {
    const spots = await prisma.spot.findMany({ orderBy: [{ type: 'asc' }, { number: 'asc' }] });
    res.json(spots);
  } catch (err) { next(err); }
});
