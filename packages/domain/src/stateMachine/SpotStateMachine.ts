import { InvalidTransitionError, SpotBlockedError } from '../errors/DomainError';

export type SpotStatus = 'FREE' | 'HELD' | 'RESERVED' | 'OCCUPIED' | 'RELEASED' | 'BLOCKED';

export interface StatusChangedEvent {
  type: 'PlaceStatusChangedEvent';
  spotId: string;
  from: SpotStatus;
  to: SpotStatus;
  timestamp: Date;
}

interface TransitionResult {
  newStatus: SpotStatus;
  event: StatusChangedEvent;
}

const ALLOWED: Record<SpotStatus, SpotStatus[]> = {
  FREE: ['HELD', 'BLOCKED'],
  HELD: ['RESERVED', 'FREE', 'BLOCKED'],
  RESERVED: ['OCCUPIED', 'FREE', 'BLOCKED'],
  OCCUPIED: ['RELEASED', 'BLOCKED'],
  RELEASED: ['FREE', 'BLOCKED'],
  BLOCKED: ['FREE'],
};

export class SpotStateMachine {
  static transition(spotId: string, from: SpotStatus, to: SpotStatus): TransitionResult {
    if (from === 'BLOCKED' && to !== 'FREE') throw new SpotBlockedError(spotId);
    if (!ALLOWED[from]?.includes(to)) throw new InvalidTransitionError(from, to);
    return {
      newStatus: to,
      event: { type: 'PlaceStatusChangedEvent', spotId, from, to, timestamp: new Date() },
    };
  }

  static hold(spotId: string, current: SpotStatus) {
    return this.transition(spotId, current, 'HELD');
  }
  static confirm(spotId: string, current: SpotStatus) {
    return this.transition(spotId, current, 'RESERVED');
  }
  static expireHold(spotId: string, current: SpotStatus) {
    return this.transition(spotId, current, 'FREE');
  }
  static checkIn(spotId: string, current: SpotStatus) {
    return this.transition(spotId, current, 'OCCUPIED');
  }
  static release(spotId: string, current: SpotStatus) {
    return this.transition(spotId, current, 'RELEASED');
  }
  static free(spotId: string, current: SpotStatus) {
    return this.transition(spotId, current, 'FREE');
  }
  static block(spotId: string, current: SpotStatus) {
    return this.transition(spotId, current, 'BLOCKED');
  }
  static unblock(spotId: string, current: SpotStatus) {
    return this.transition(spotId, current, 'FREE');
  }
}
