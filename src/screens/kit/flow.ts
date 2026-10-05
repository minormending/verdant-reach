// Frame-driven async flows for scenes.
//
// All input is read synchronously inside `update` (input.pressed() is only
// valid during the frame). Async code never reads input directly: it awaits
// Tasks, which are ticked from the scene's update and resolve their promises.

import type { Button, GameContext, Input, Scene } from "../../contracts";

export interface Task {
  /** Called once per frame; return true when finished. */
  update(input: Input): boolean;
}

interface Pending {
  task: Task;
  resolve: () => void;
}

export class Flow {
  private pending: Pending[] = [];
  frame = 0;

  constructor(public input: Input) {}

  tick(): void {
    this.frame++;
    for (const p of [...this.pending]) {
      let done = false;
      try {
        done = p.task.update(this.input);
      } catch (e) {
        console.error("[flow] task failed", e);
        done = true;
      }
      if (done) {
        const i = this.pending.indexOf(p);
        if (i >= 0) this.pending.splice(i, 1);
        p.resolve();
      }
    }
  }

  run(task: Task): Promise<void> {
    return new Promise((resolve) => this.pending.push({ task, resolve }));
  }

  /** Run a task that produces a value (read after it finishes). */
  async get<T>(task: Task & { result: T }): Promise<T> {
    await this.run(task);
    return task.result;
  }

  wait(frames: number): Promise<void> {
    let n = Math.max(0, Math.floor(frames));
    return this.run({ update: () => n-- <= 0 });
  }

  /** Wait until A or B (or any of `buttons`) is pressed. Resolves with the button. */
  async button(buttons: Button[] = ["a", "b"]): Promise<Button> {
    const t = {
      result: buttons[0] as Button,
      update(input: Input) {
        for (const b of buttons) if (input.pressed(b)) { t.result = b; return true; }
        return false;
      },
    };
    return this.get(t);
  }

  /** Run a per-frame animation for `frames` frames; `step(i)` sees 0..frames-1. */
  animate(frames: number, step: (i: number, t: number) => void): Promise<void> {
    let i = 0;
    const n = Math.max(1, Math.floor(frames));
    return this.run({
      update: () => {
        step(i, n <= 1 ? 1 : i / (n - 1));
        i++;
        return i >= n;
      },
    });
  }

  until(pred: () => boolean): Promise<void> {
    return this.run({ update: () => pred() });
  }
}

/**
 * Push a scene driven by an async `main`. The scene pops itself and resolves
 * with main's result. If main throws, it logs and resolves with `fallback`
 * so a bug can never soft-lock the game.
 */
export function runFlowScene<T>(
  ctx: GameContext,
  opts: {
    transparent?: boolean;
    draw: (g: CanvasRenderingContext2D) => void;
    main: (flow: Flow) => Promise<T>;
    fallback: T;
    enter?: () => void;
    exit?: () => void;
  },
): Promise<T> {
  return ctx.scenes.run<T>((done) => {
    const flow = new Flow(ctx.input);
    let started = false;
    let finished = false;
    let drawErr = false;
    const finish = (r: T) => {
      if (finished) return;
      finished = true;
      done(r);
    };
    const scene: Scene = {
      transparent: opts.transparent,
      enter: opts.enter,
      exit: opts.exit,
      update() {
        if (!started) {
          started = true;
          opts.main(flow).then(finish, (e) => {
            console.error("[screens] flow crashed", e);
            finish(opts.fallback);
          });
        }
        flow.tick();
      },
      draw(g) {
        try {
          opts.draw(g);
        } catch (e) {
          if (!drawErr) console.error("[screens] draw failed", e);
          drawErr = true;
        }
      },
    };
    return scene;
  });
}
