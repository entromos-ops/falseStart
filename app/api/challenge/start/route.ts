import { NextResponse } from "next/server";
import {
  ATTEMPTS_PER_DAY,
  CHALLENGE_VERSION
} from "@/lib/challenge/constants";
import {
  attemptsRemaining,
  expireStaleAttempts,
  getAttemptsUsed
} from "@/lib/server/attempts";
import { getChallengeDate } from "@/lib/server/challengeDate";
import {
  generateDailyChallenge,
  sequenceHash
} from "@/lib/server/challengeSeed";
import { prisma } from "@/lib/server/db";
import { getOrCreatePlayer } from "@/lib/server/playerSession";

export const runtime = "nodejs";

export async function POST() {
  const player = await getOrCreatePlayer();
  const challengeDate = getChallengeDate();

  await expireStaleAttempts(player.id, challengeDate);

  const attemptsUsed = await getAttemptsUsed(player.id, challengeDate);
  if (attemptsUsed >= ATTEMPTS_PER_DAY) {
    return NextResponse.json(
      {
        error: "No daily attempts remaining.",
        attemptsUsed,
        attemptsRemaining: 0
      },
      { status: 403 }
    );
  }

  const events = generateDailyChallenge(challengeDate);
  const hash = sequenceHash(events);
  const attempt = await prisma.attempt.create({
    data: {
      playerId: player.id,
      challengeDate,
      challengeVersion: CHALLENGE_VERSION,
      status: "started",
      sequenceHash: hash
    }
  });

  return NextResponse.json({
    attemptId: attempt.id,
    challengeDate,
    challengeVersion: CHALLENGE_VERSION,
    sequenceHash: hash,
    events,
    startedAt: attempt.startedAt.toISOString(),
    attemptsRemaining: attemptsRemaining(attemptsUsed + 1)
  });
}
