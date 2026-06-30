import { describe, expect, it } from "vitest";
import {
  FAKEOUT_RESIST_POINTS,
  FALSE_START_PENALTY,
  MISS_PENALTY
} from "@/lib/challenge/constants";
import { scoreAttempt } from "@/lib/challenge/scoring";
import type { ChallengeEvent } from "@/lib/challenge/types";

function trueEvent(index = 0): ChallengeEvent {
  const offset = index * 2300;
  return {
    index,
    kind: "true_signal",
    waitStartMs: offset,
    cueStartMs: offset + 1000,
    cueEndMs: offset + 1750,
    feedbackEndMs: offset + 2250,
    visualVariant: 0
  };
}

function fakeoutEvent(index = 0): ChallengeEvent {
  const offset = index * 2300;
  return {
    index,
    kind: "fakeout",
    waitStartMs: offset,
    cueStartMs: offset + 1000,
    cueEndMs: offset + 1550,
    feedbackEndMs: offset + 2050,
    visualVariant: 1
  };
}

describe("scoreAttempt", () => {
  it("scores a perfect true-signal tap", () => {
    const event = trueEvent();
    const result = scoreAttempt([event], [{ tMs: event.cueStartMs + 180 }]);

    expect(result.score).toBe(1000);
    expect(result.trueHits).toBe(1);
    expect(result.eventResults[0]).toMatchObject({
      outcome: "hit",
      reactionMs: 180
    });
  });

  it("penalizes a missed true signal", () => {
    const result = scoreAttempt([trueEvent()], []);

    expect(result.score).toBe(-MISS_PENALTY);
    expect(result.misses).toBe(1);
    expect(result.eventResults[0].outcome).toBe("miss");
  });

  it("rewards a resisted fakeout", () => {
    const result = scoreAttempt([fakeoutEvent()], []);

    expect(result.score).toBe(FAKEOUT_RESIST_POINTS);
    expect(result.fakeoutResists).toBe(1);
    expect(result.eventResults[0].outcome).toBe("fakeout_resist");
  });

  it("penalizes tapping during a fakeout", () => {
    const event = fakeoutEvent();
    const result = scoreAttempt([event], [{ tMs: event.cueStartMs + 100 }]);

    expect(result.score).toBe(-FALSE_START_PENALTY);
    expect(result.falseStarts).toBe(1);
    expect(result.eventResults[0].outcome).toBe("false_start");
  });

  it("penalizes an early true-signal tap", () => {
    const event = trueEvent();
    const result = scoreAttempt([event], [{ tMs: event.cueStartMs - 50 }]);

    expect(result.score).toBe(-FALSE_START_PENALTY);
    expect(result.falseStarts).toBe(1);
    expect(result.eventResults[0].outcome).toBe("false_start");
  });

  it("adds streak bonus across successful events", () => {
    const first = trueEvent(0);
    const second = fakeoutEvent(1);
    const third = trueEvent(2);
    const result = scoreAttempt(
      [first, second, third],
      [
        { tMs: first.cueStartMs + 180 },
        { tMs: third.cueStartMs + 180 }
      ]
    );

    expect(result.score).toBe(1000 + FAKEOUT_RESIST_POINTS + 1050);
    expect(result.maxStreak).toBe(3);
  });

  it("flags suspicious reactions under the minimum threshold", () => {
    const events = [trueEvent(0), trueEvent(1), trueEvent(2)];
    const result = scoreAttempt(
      events,
      events.map((event) => ({ tMs: event.cueStartMs + 60 }))
    );

    expect(result.suspiciousFlags).toContain(
      "more_than_two_reactions_under_100ms"
    );
    expect(result.suspiciousFlags).toContain("average_reaction_under_140ms");
  });
});
