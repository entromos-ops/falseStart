import { describe, expect, it } from "vitest";
import {
  EVENT_COUNT,
  FAKEOUT_COUNT,
  FAKEOUT_CUE_MS,
  FEEDBACK_MS,
  TRUE_SIGNAL_COUNT,
  TRUE_SIGNAL_CUE_MS
} from "@/lib/challenge/constants";
import { generateChallenge } from "@/lib/challenge/generator";

describe("generateChallenge", () => {
  it("generates the same sequence from the same seed", () => {
    expect(generateChallenge("daily-seed")).toEqual(
      generateChallenge("daily-seed")
    );
  });

  it("generates different sequences from different seeds", () => {
    expect(generateChallenge("daily-seed-a")).not.toEqual(
      generateChallenge("daily-seed-b")
    );
  });

  it("follows the required event-count and kind-count rules", () => {
    const events = generateChallenge("count-rules");

    expect(events).toHaveLength(EVENT_COUNT);
    expect(events.filter((event) => event.kind === "true_signal")).toHaveLength(
      TRUE_SIGNAL_COUNT
    );
    expect(events.filter((event) => event.kind === "fakeout")).toHaveLength(
      FAKEOUT_COUNT
    );
  });

  it("starts with a true signal and limits early fakeouts", () => {
    const events = generateChallenge("early-rules");
    const fakeoutsInFirstThree = events
      .slice(0, 3)
      .filter((event) => event.kind === "fakeout").length;

    expect(events[0].kind).toBe("true_signal");
    expect(fakeoutsInFirstThree).toBeLessThanOrEqual(1);
  });

  it("does not generate more than two fakeouts in a row", () => {
    const events = generateChallenge("fakeout-run-rules");
    let fakeoutRun = 0;

    for (const event of events) {
      fakeoutRun = event.kind === "fakeout" ? fakeoutRun + 1 : 0;
      expect(fakeoutRun).toBeLessThanOrEqual(2);
    }
  });

  it("emits increasing absolute timings with the correct cue durations", () => {
    const events = generateChallenge("timing-rules");

    for (const event of events) {
      expect(event.cueStartMs).toBeGreaterThan(event.waitStartMs);
      expect(event.feedbackEndMs - event.cueEndMs).toBe(FEEDBACK_MS);
      expect(event.cueEndMs - event.cueStartMs).toBe(
        event.kind === "true_signal" ? TRUE_SIGNAL_CUE_MS : FAKEOUT_CUE_MS
      );

      if (event.index > 0) {
        expect(event.waitStartMs).toBe(events[event.index - 1].feedbackEndMs);
      }
    }
  });
});
