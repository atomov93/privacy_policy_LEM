import {createAuthSession} from '../src/services/appLockSession';

describe('app lock auth session', () => {
  it('coalesces overlapping unlock attempts', () => {
    const session = createAuthSession();
    session.lock();
    expect(session.beginUnlock()).toBe(1);
    expect(session.beginUnlock()).toBeNull();
    session.endUnlock();
    expect(session.beginUnlock()).toBe(1);
  });

  it('ignores a stale successful prompt after locking again', () => {
    const session = createAuthSession();
    const first = session.lock();
    const token = session.beginUnlock();
    expect(token).toBe(first);
    const second = session.lock();
    expect(second).not.toBe(first);
    expect(session.isCurrent(token!)).toBe(false);
    session.endUnlock();
  });
});
