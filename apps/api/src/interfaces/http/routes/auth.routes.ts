import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../../../infrastructure/db/prismaClient';
import { config } from '../../../config';
import { InvalidCredentialsError, InvalidTokenError, TokenReusedError } from '@dxc/domain';

export const authRouter = Router();

const loginSchema = z.object({ accessId: z.string().length(6), pin: z.string().length(4) });

function signAccess(payload: { sub: string; role: string; name: string }) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as any);
}
function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

authRouter.post('/login', async (req, res, next) => {
  try {
    const { accessId, pin } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { accessId } });
    if (!user || !(await bcrypt.compare(pin, user.pinHash))) throw new InvalidCredentialsError();

    const family = crypto.randomUUID();
    const rawRefresh = crypto.randomBytes(48).toString('hex');
    const refreshHash = hashToken(rawRefresh);
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

    await prisma.refreshToken.create({ data: { hash: refreshHash, userId: user.id, family, expiresAt } });

    const accessToken = signAccess({ sub: user.id, role: user.role, name: user.name });
    res.json({ accessToken, refreshToken: rawRefresh, user: { id: user.id, name: user.name, role: user.role, accessId: user.accessId, locale: user.locale } });
  } catch (err) { next(err); }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const hash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { hash } });
    if (!stored || stored.expiresAt < new Date()) throw new InvalidTokenError();
    if (stored.usedAt) {
      await prisma.refreshToken.deleteMany({ where: { family: stored.family } });
      throw new TokenReusedError();
    }

    await prisma.refreshToken.update({ where: { hash }, data: { usedAt: new Date() } });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
    const rawRefresh = crypto.randomBytes(48).toString('hex');
    const newHash = hashToken(rawRefresh);
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    await prisma.refreshToken.create({ data: { hash: newHash, userId: user.id, family: stored.family, expiresAt } });

    const accessToken = signAccess({ sub: user.id, role: user.role, name: user.name });
    res.json({ accessToken, refreshToken: rawRefresh });
  } catch (err) { next(err); }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const hash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { hash } });
    if (stored) await prisma.refreshToken.deleteMany({ where: { family: stored.family } });
    res.status(204).end();
  } catch (err) { next(err); }
});
