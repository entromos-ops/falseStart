import { NextResponse } from "next/server";
import { ATTEMPT_EXPIRY_MS } from "@/lib/challenge/constants";
import { scoreAttempt } from "@/lib/challenge/scoring";
import type { PlayerAction } from "@/lib/challenge/types";
import {
  attemptsRemaining,
  expireStaleAttempts,
  getAttemptsUsed,
  getPlayerBestAttempt
} from "@/lib/server/attempts";
import {
  generateDailyChallenge,
  sequenceHash
} from "@/lib/server/challengeSeed";
import { prisma } from "@/lib/server/db";
import { getDailyLeaderboard } from "@/lib/server/leaderboard";
import { getOrCreatePlayer } from "@/lib/server/playerSession";

export const runtime = "nodejs";

function parseActions(value: unknown): PlayerAction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (action): action is PlayerAction =>
        typeof action === "object" &&
        action !== null &&
        typeof (action as PlayerAction).tMs === "number"
    )
    .slice(0, 500);
}

export async function POST(request: Request) {
  const player = await getOrCreatePlayer();
  const body = (await request.json().catch(() => null)) as {
    attemptId?: unknown;
    actions?: unknown;
  } | null;

  if (!body || typeof body.attemptId !== "string") {
    return NextResponse.json({ error: "Missing attemptId." }, { status: 400 });
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: body.attemptId }
  });

  if (!attempt || attempt.playerId !== player.id) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }

  if (attempt.status === "submitted") {
    return NextResponse.json(
      { error: "Attempt already submitted." },
      { status: 409 }
    );
  }

  const now = new Date();
  const attemptAgeMs = now.getTime() - attempt.startedAt.getTime();

  if (attempt.status === "expired" || attemptAgeMs > ATTEMPT_EXPIRY_MS) {
    await prisma.attempt.update({
      where: { id: attempt.id },
      data: { status: "expired" }
    });

    return NextResponse.json(
      { error: "Attempt expired. It still counts toward today's limit." },
      { status: 410 }
    );
  }

  const events = generateDailyChallenge(
    attempt.challengeDate,
    attempt.challengeVersion
  );
  const hash = sequenceHash(events);

  if (hash !== attempt.sequenceHash) {
    return NextResponse.json(
      { error: "Challenge sequence mismatch." },
      { status: 409 }
    );
  }

  const actions = parseActions(body.actions);
  const expectedDurationMs = events[events.length - 1]?.feedbackEndMs ?? 0;
  const result = scoreAttempt(events, actions, {
    submittedElapsedMs: attemptAgeMs,
    expectedDurationMs
  });

  await prisma.attempt.update({
    where: { id: attempt.id },
    data: {
      status: "submitted",
      submittedAt: now,
      score: result.score,
      trueHits: result.trueHits,
      misses: result.misses,
      fakeoutResists: result.fakeoutResists,
      falseStarts: result.falseStarts,
      avgReactionMs: result.avgReactionMs,
      bestReactionMs: result.bestReactionMs,
      maxStreak: result.maxStreak,
      suspiciousFlags: result.suspiciousFlags,
      rawActions: actions,
      eventResults: result.eventResults
    }
  });

  await expireStaleAttempts(player.id, attempt.challengeDate, now);

  const [used, playerBest, leaderboard] = await Promise.all([
    getAttemptsUsed(player.id, attempt.challengeDate),
    getPlayerBestAttempt(player.id, attempt.challengeDate),
    getDailyLeaderboard(attempt.challengeDate)
  ]);
  const publicEntry = leaderboard.find((entry) => entry.playerId === player.id);

  return NextResponse.json({
    result,
    rank: publicEntry?.rank ?? null,
    attemptsRemaining: attemptsRemaining(used),
    playerBest
  });
}
