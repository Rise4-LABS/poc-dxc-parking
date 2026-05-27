export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class SpotNotFoundError extends DomainError {
  constructor(id: string) { super('SPOT_NOT_FOUND', `Place introuvable : ${id}`, { id }); }
}
export class SpotNotAvailableError extends DomainError {
  constructor(id: string, status: string) {
    super('SPOT_NOT_AVAILABLE', `Place ${id} non disponible (statut : ${status})`, { id, status });
  }
}
export class SpotBlockedError extends DomainError {
  constructor(id: string) { super('SPOT_BLOCKED', `Place ${id} bloquée par l'administrateur`, { id }); }
}
export class BookingConflictError extends DomainError {
  constructor() { super('BOOKING_CONFLICT', 'Un conflit de réservation existe pour ce créneau'); }
}
export class ActiveBookingExistsError extends DomainError {
  constructor() { super('ACTIVE_BOOKING_EXISTS', 'Vous avez déjà une réservation active'); }
}
export class BookingNotFoundError extends DomainError {
  constructor(id: string) { super('BOOKING_NOT_FOUND', `Réservation introuvable : ${id}`, { id }); }
}
export class BookingNotCancellableError extends DomainError {
  constructor(status: string) { super('BOOKING_NOT_CANCELLABLE', `Impossible d'annuler une réservation en statut : ${status}`, { status }); }
}
export class InvalidCredentialsError extends DomainError {
  constructor() { super('INVALID_CREDENTIALS', 'Identifiants invalides'); }
}
export class InvalidTokenError extends DomainError {
  constructor() { super('INVALID_TOKEN', 'Token invalide ou expiré'); }
}
export class TokenReusedError extends DomainError {
  constructor() { super('TOKEN_REUSED', 'Token de rafraîchissement déjà utilisé - session invalidée'); }
}
export class ForbiddenError extends DomainError {
  constructor() { super('FORBIDDEN', 'Accès refusé'); }
}
export class CooldownActiveError extends DomainError {
  constructor(until: Date) {
    super('COOLDOWN_ACTIVE', `Période de refroidissement active jusqu'au ${until.toLocaleString('fr-FR')}`, { until });
  }
}
export class InvalidTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super('INVALID_TRANSITION', `Transition invalide : ${from} → ${to}`, { from, to });
  }
}
export class WaitListConflictError extends DomainError {
  constructor() { super('WAITLIST_CONFLICT', 'Vous êtes déjà sur la liste d\'attente pour ce créneau'); }
}
