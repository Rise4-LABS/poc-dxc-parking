import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../../config';
import { InvalidTokenError, ForbiddenError } from '@dxc/domain';
import type { Role } from '@dxc/domain';

export interface JwtPayload {
  sub: string;
  role: Role;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return next(new InvalidTokenError());
  try {
    req.user = jwt.verify(auth.slice(7), config.jwtSecret) as JwtPayload;
    next();
  } catch {
    next(new InvalidTokenError());
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new ForbiddenError());
    next();
  };
}
