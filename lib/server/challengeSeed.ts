import { createHash, createHmac } from "crypto";
import { CHALLENGE_VERSION } from "@/lib/challenge/constants";
import { generateChallenge } from "@/lib/challenge/generator";
import type { ChallengeEvent } from "@/lib/challenge/types";

function getDailySecret(): string {
  return process.env.DAILY_CHALLENGE_SECRET || "dev-only-daily-secret";
}

export function getDailySeed(
  challengeDate: string,
  challengeVersion = CHALLENGE_VERSION
): string {
  return createHmac("sha256", getDailySecret())
    .update(`${challengeDate}:v${challengeVersion}`)
    .digest("hex");
}

export function generateDailyChallenge(
  challengeDate: string,
  challengeVersion = CHALLENGE_VERSION
): ChallengeEvent[] {
  return generateChallenge(getDailySeed(challengeDate, challengeVersion));
}

export function sequenceHash(events: ChallengeEvent[]): string {
  return createHash("sha256").update(JSON.stringify(events)).digest("hex");
}
