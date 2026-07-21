/**
 * Tracks biometric unlock attempts so a stale successful prompt cannot
 * unlock the app after it has been backgrounded again.
 */
export function createAuthSession() {
  let generation = 0;
  let authenticating = false;

  return {
    /** Call when the app should lock (background / inactive). */
    lock(): number {
      generation += 1;
      return generation;
    },
    beginUnlock(): number | null {
      if (authenticating) {
        return null;
      }
      authenticating = true;
      return generation;
    },
    endUnlock(): void {
      authenticating = false;
    },
    isCurrent(token: number): boolean {
      return token === generation;
    },
    get generation() {
      return generation;
    },
  };
}

export type AuthSession = ReturnType<typeof createAuthSession>;
