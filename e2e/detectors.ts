// Driver taps get shorter with ?speed, but Web Audio (cries and jingles)
// still finishes on the real clock. Keep the same liveness budget at every
// speed: roughly the former 60 taps at speed 1 (120 ms + tap + 40 ms gap).
export const NO_PROGRESS_MS = 12_000;

export class ProgressWatchdog {
  private signature: string | undefined;
  private changedAt = 0;
  private reported = false;

  sample(signature: string, wallTime: number): boolean {
    if (signature !== this.signature) {
      this.signature = signature;
      this.changedAt = wallTime;
      this.reported = false;
    }
    if (!this.reported && wallTime - this.changedAt >= NO_PROGRESS_MS) {
      this.reported = true;
      return true;
    }
    return false;
  }
}

/** Filter by the task's execution interval, not observer delivery time.
 * An entry can arrive after loading has already finished. */
export class GameplayTasks {
  private readyAt = Infinity;
  private loads: { start: number; end: number }[] = [];

  ready(wallTime: number) {
    if (this.readyAt === Infinity) this.readyAt = wallTime;
  }

  loading(wallTime: number): (finishedAt: number) => void {
    const interval = { start: wallTime, end: Infinity };
    this.loads.push(interval);
    return (finishedAt) => { interval.end = finishedAt; };
  }

  includes(start: number, duration: number): boolean {
    const end = start + duration;
    return start >= this.readyAt
      && !this.loads.some((load) => start < load.end && end > load.start);
  }
}

/** Only dialogue progress, excluding blinking cursors and idle animation
 * clocks which continue ticking even when the game is stuck. */
export function dialogueProgress(box: unknown): unknown[] {
  const b = box as Record<string, unknown> | undefined;
  return ["visible", "page", "top", "line", "chars", "scroll", "waiting", "done", "finished"]
    .map((key) => b?.[key]);
}
