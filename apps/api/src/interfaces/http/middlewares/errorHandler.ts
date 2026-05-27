import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '@dxc/domain';

const ERROR_STATUS: Record<string, number> = {
  SPOT_NOT_FOUND: 404,
  BOOKING_NOT_FOUND: 404,
  SPOT_NOT_AVAILABLE: 409,
  SPOT_BLOCKED: 409,
  BOOKING_CONFLICT: 409,
  ACTIVE_BOOKING_EXISTS: 409,
  BOOKING_NOT_CANCELLABLE: 409,
  WAITLIST_CONFLICT: 409,
  COOLDOWN_ACTIVE: 429,
  INVALID_CREDENTIALS: 401,
  INVALID_TOKEN: 401,
  TOKEN_REUSED: 401,
  FORBIDDEN: 403,
  INVALID_TRANSITION: 400,
};

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: 'Données invalides', errors: err.errors });
  }
  if (err instanceof DomainError) {
    const status = ERROR_STATUS[err.code] ?? 400;
    return res.status(status).json({ message: err.message, code: err.code });
  }
  console.error(err);
  const isProd = process.env.NODE_ENV === 'production';
  return res.status(500).json({ message: isProd ? 'Erreur interne' : String(err) });
}
