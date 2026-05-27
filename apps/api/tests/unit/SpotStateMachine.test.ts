import { describe, it, expect } from 'vitest';
import { SpotStateMachine } from '@dxc/domain';
import { InvalidTransitionError, SpotBlockedError } from '@dxc/domain';

describe('SpotStateMachine', () => {
  it('FREE → HELD via hold()', () => {
    const r = SpotStateMachine.hold('s1', 'FREE');
    expect(r.newStatus).toBe('HELD');
    expect(r.event.type).toBe('PlaceStatusChangedEvent');
    expect(r.event.from).toBe('FREE');
    expect(r.event.to).toBe('HELD');
  });

  it('HELD → RESERVED via confirm()', () => {
    const r = SpotStateMachine.confirm('s1', 'HELD');
    expect(r.newStatus).toBe('RESERVED');
  });

  it('HELD → FREE via expireHold()', () => {
    const r = SpotStateMachine.expireHold('s1', 'HELD');
    expect(r.newStatus).toBe('FREE');
  });

  it('RESERVED → OCCUPIED via checkIn()', () => {
    const r = SpotStateMachine.checkIn('s1', 'RESERVED');
    expect(r.newStatus).toBe('OCCUPIED');
  });

  it('OCCUPIED → RELEASED via release()', () => {
    const r = SpotStateMachine.release('s1', 'OCCUPIED');
    expect(r.newStatus).toBe('RELEASED');
  });

  it('RELEASED → FREE via free()', () => {
    const r = SpotStateMachine.free('s1', 'RELEASED');
    expect(r.newStatus).toBe('FREE');
  });

  it('FREE → BLOCKED via block()', () => {
    const r = SpotStateMachine.block('s1', 'FREE');
    expect(r.newStatus).toBe('BLOCKED');
  });

  it('BLOCKED → FREE via unblock()', () => {
    const r = SpotStateMachine.unblock('s1', 'BLOCKED');
    expect(r.newStatus).toBe('FREE');
  });

  it('throws SpotBlockedError if trying to hold a BLOCKED spot', () => {
    expect(() => SpotStateMachine.hold('s1', 'BLOCKED')).toThrow(SpotBlockedError);
  });

  it('throws InvalidTransitionError for FREE → OCCUPIED', () => {
    expect(() => SpotStateMachine.transition('s1', 'FREE', 'OCCUPIED')).toThrow(InvalidTransitionError);
  });

  it('throws InvalidTransitionError for OCCUPIED → HELD', () => {
    expect(() => SpotStateMachine.transition('s1', 'OCCUPIED', 'HELD')).toThrow(InvalidTransitionError);
  });

  it('event contains spotId and timestamp', () => {
    const r = SpotStateMachine.hold('abc', 'FREE');
    expect(r.event.spotId).toBe('abc');
    expect(r.event.timestamp).toBeInstanceOf(Date);
  });

  it('block() works from HELD', () => {
    const r = SpotStateMachine.block('s1', 'HELD');
    expect(r.newStatus).toBe('BLOCKED');
  });

  it('block() works from RESERVED', () => {
    const r = SpotStateMachine.block('s1', 'RESERVED');
    expect(r.newStatus).toBe('BLOCKED');
  });

  it('block() works from OCCUPIED', () => {
    const r = SpotStateMachine.block('s1', 'OCCUPIED');
    expect(r.newStatus).toBe('BLOCKED');
  });

  it('RELEASED can transition to BLOCKED', () => {
    const r = SpotStateMachine.block('s1', 'RELEASED');
    expect(r.newStatus).toBe('BLOCKED');
  });

  it('BLOCKED cannot go to HELD', () => {
    expect(() => SpotStateMachine.transition('s1', 'BLOCKED', 'HELD')).toThrow(SpotBlockedError);
  });
});
