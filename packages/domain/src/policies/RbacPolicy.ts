import { ForbiddenError } from '../errors/DomainError';

export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export class RbacPolicy {
  static requireUser(role: Role) {
    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) throw new ForbiddenError();
  }
  static requireAdmin(role: Role) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) throw new ForbiddenError();
  }
  static requireSuperAdmin(role: Role) {
    if (role !== 'SUPER_ADMIN') throw new ForbiddenError();
  }
}
