import {
  EVENT_COUNT,
  FAKEOUT_COUNT,
  FAKEOUT_CUE_MS,
  FEEDBACK_MS,
  MAX_WAIT_MS,
  MIN_WAIT_MS,
  TRUE_SIGNAL_COUNT,
  TRUE_SIGNAL_CUE_MS
} from "./constants";
import { prngFromSeed, type RandomSource } from "./prng";
import type { ChallengeEvent, EventKind } from "./types";

function randomInt(random: RandomSource, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[], random: RandomSource): T[] {
  const output = [...items];

  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }

  return output;
}

function isValidKindSequence(kinds: EventKind[]): boolean {
  if (kinds.length !== EVENT_COUNT || kinds[0] !== "true_signal") {
    return false;
  }

  const fakeoutsInFirstThree = kinds
    .slice(0, 3)
    .filter((kind) => kind === "fakeout").length;

  if (fakeoutsInFirstThree > 1) {
    return false;
  }

  let fakeoutRun = 0;
  for (const kind of kinds) {
    if (kind === "fakeout") {
      fakeoutRun += 1;
      if (fakeoutRun > 2) {
        return false;
      }
    } else {
      fakeoutRun = 0;
    }
  }

  return true;
}

function generateKinds(random: RandomSource): EventKind[] {
  const remainingKinds: EventKind[] = [
    ...Array.from({ length: TRUE_SIGNAL_COUNT - 1 }, () => "true_signal" as const),
    ...Array.from({ length: FAKEOUT_COUNT }, () => "fakeout" as const)
  ];

  for (let attempt = 0; attempt < 500; attempt += 1) {
    const candidate: EventKind[] = [
      "true_signal",
      ...shuffle(remainingKinds, random)
    ];

    if (isValidKindSequence(candidate)) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a valid challenge sequence");
}

export function generateChallenge(seed: string): ChallengeEvent[] {
  const random = prngFromSeed(seed);
  const kinds = generateKinds(random);
  let cursorMs = 0;

  return kinds.map((kind, index) => {
    const waitStartMs = cursorMs;
    const cueStartMs = waitStartMs + randomInt(random, MIN_WAIT_MS, MAX_WAIT_MS);
    const cueDuration =
      kind === "true_signal" ? TRUE_SIGNAL_CUE_MS : FAKEOUT_CUE_MS;
    const cueEndMs = cueStartMs + cueDuration;
    const feedbackEndMs = cueEndMs + FEEDBACK_MS;

    cursorMs = feedbackEndMs;

    return {
      index,
      kind,
      waitStartMs,
      cueStartMs,
      cueEndMs,
      feedbackEndMs,
      visualVariant: randomInt(random, 0, 3)
    };
  });
}
