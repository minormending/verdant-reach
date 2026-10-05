import { describe, expect, it } from "vitest";
import { Follower, POP_FRAMES, followerLine } from "./follower";

const run = (f: Follower, n: number) => { for (let i = 0; i < n; i++) f.tick(); };

describe("follower", () => {
  it("starts tucked into the player's tile and pops out where the player was", () => {
    const f = new Follower();
    f.place(5, 5, "up");
    expect(f.tucked).toBe(true);
    expect(f.occupies(5, 5)).toBe(false);
    f.follow(5, 5, 8); // the player steps away from (5,5)
    expect(f.tucked).toBe(false);
    expect([f.x, f.y]).toEqual([5, 5]);
    expect(f.pop).toBe(POP_FRAMES);
    expect(f.occupies(5, 5)).toBe(true);
  });

  it("walks one tile behind, matching the player's pace, and mirrors for left/right", () => {
    const f = new Follower();
    f.place(5, 5);
    f.follow(5, 5, 8);
    run(f, POP_FRAMES);
    f.follow(6, 5, 8); // player went (6,5) -> (7,5)
    expect(f.step).toMatchObject({ fx: 5, tx: 6, dur: 8, hop: false });
    expect(f.flip).toBe(true);
    expect(f.pixel().lift).toBe(0);
    run(f, 4);
    expect(f.pixel().px).toBe(5 * 16 + 8);
    expect(f.pixel().lift).toBeGreaterThan(0); // the little hop
    run(f, 4);
    expect(f.moving).toBe(false);
    f.follow(5, 5, 8);
    expect(f.flip).toBe(false);
    f.follow(5, 4, 8); // queued while moving
    run(f, 8);
    expect(f.step).toMatchObject({ fx: 5, fy: 5, tx: 5, ty: 4 });
    expect(f.flip).toBe(false); // vertical moves keep the last mirror
  });

  it("hops a straight two-tile gap (a ledge) and pops in after anything farther", () => {
    const f = new Follower();
    f.place(3, 3);
    f.follow(3, 3, 8);
    run(f, POP_FRAMES);
    f.follow(3, 5, 8); // player hopped a ledge from (3,4)... follower crosses (3,3)->(3,5)
    expect(f.step?.hop).toBe(true);
    expect(f.step?.dur).toBeGreaterThanOrEqual(12);
    run(f, 6);
    expect(f.pixel().lift).toBeGreaterThan(4);
    run(f, 20);
    f.follow(9, 9, 8);
    expect(f.moving).toBe(false);
    expect([f.x, f.y]).toEqual([9, 9]);
    expect(f.pop).toBe(POP_FRAMES);
  });

  it("catches up on queued steps instead of falling behind", () => {
    const f = new Follower();
    f.place(0, 0);
    f.follow(0, 0, 4);
    run(f, POP_FRAMES);
    f.follow(0, 2, 4); // hop takes 12 frames
    run(f, 4);
    f.follow(0, 3, 4);
    run(f, 8); // hop done; the queued step started late, so it is shorter
    expect(f.step).toMatchObject({ ty: 3 });
    expect(f.step!.dur).toBeLessThanOrEqual(4);
  });
});

describe("follower lines", () => {
  const base = { name: "ACORNY", friendship: 70, hpFrac: 1, status: null, activity: "any" as const, time: "day" as const, outdoor: true };
  it("reflects friendship, status and health", () => {
    expect(followerLine({ ...base, friendship: 250 }, 0).emote).toBe("♪");
    expect(followerLine({ ...base, friendship: 10 }, 0).text).toMatch(/distance/);
    expect(followerLine({ ...base, status: "blight" }, 0).text).toMatch(/BLIGHT/);
    expect(followerLine({ ...base, hpFrac: 0 }, 0).text).toMatch(/wilted/);
    expect(followerLine({ ...base, hpFrac: 0.1 }, 0).emote).toBe("...");
    expect(followerLine({ ...base, activity: "night", time: "night" }, 0.1).text).toMatch(/night/);
    for (const r of [0, 0.3, 0.6, 0.99]) {
      for (const f of [0, 80, 160, 255]) expect(followerLine({ ...base, friendship: f }, r).text).toContain("ACORNY");
    }
  });
});
