import { ATTEMPT_EXPIRY_MS, ATTEMPTS_PER_DAY } from "@/lib/challenge/constants";
import type { AttemptSummary } from "@/lib/challenge/types";
import { prisma } from "./db";

const COUNTED_STATUSES = ["started", "submitted", "expired"];

function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function expireStaleAttempts(
  playerId: string,
  challengeDate: string,
  now = new Date()
) {
  await prisma.attempt.updateMany({
    where: {
      playerId,
      challengeDate,
      status: "started",
      startedAt: {
        lt: new Date(now.getTime() - ATTEMPT_EXPIRY_MS)
      }
    },
    data: {
      status: "expired"
    }
  });
}

export async function getAttemptsUsed(
  playerId: string,
  challengeDate: string
): Promise<number> {
  return prisma.attempt.count({
    where: {
      playerId,
      challengeDate,
      status: {
        in: COUNTED_STATUSES
      }
    }
  });
}

export function attemptsRemaining(used: number): number {
  return Math.max(0, ATTEMPTS_PER_DAY - used);
}

export function attemptToSummary(attempt: {
  id: string;
  score: number | null;
  trueHits: number | null;
  misses: number | null;
  fakeoutResists: number | null;
  falseStarts: number | null;
  avgReactionMs: number | null;
  bestReactionMs: number | null;
  maxStreak: number | null;
  submittedAt: Date | null;
  suspiciousFlags: unknown;
}): AttemptSummary | null {
  if (attempt.score === null || !attempt.submittedAt) {
    return null;
  }

  return {
    attemptId: attempt.id,
    score: attempt.score,
    trueHits: attempt.trueHits ?? 0,
    misses: attempt.misses ?? 0,
    fakeoutResists: attempt.fakeoutResists ?? 0,
    falseStarts: attempt.falseStarts ?? 0,
    avgReactionMs: attempt.avgReactionMs,
    bestReactionMs: attempt.bestReactionMs,
    maxStreak: attempt.maxStreak ?? 0,
    submittedAt: attempt.submittedAt.toISOString(),
    suspiciousFlags: jsonStringArray(attempt.suspiciousFlags)
  };
}

export async function getPlayerBestAttempt(
  playerId: string,
  challengeDate: string
): Promise<AttemptSummary | null> {
  const attempts = await prisma.attempt.findMany({
    where: {
      playerId,
      challengeDate,
      status: "submitted",
      score: {
        not: null
      }
    }
  });

  const sorted = attempts.sort(compareAttempts);
  return sorted[0] ? attemptToSummary(sorted[0]) : null;
}

export function compareAttempts(
  first: {
    score: number | null;
    falseStarts: number | null;
    avgReactionMs: number | null;
    submittedAt: Date | null;
  },
  second: {
    score: number | null;
    falseStarts: number | null;
    avgReactionMs: number | null;
    submittedAt: Date | null;
  }
): number {
  const firstScore = first.score ?? Number.NEGATIVE_INFINITY;
  const secondScore = second.score ?? Number.NEGATIVE_INFINITY;

  if (firstScore !== secondScore) {
    return secondScore - firstScore;
  }

  const firstFalseStarts = first.falseStarts ?? Number.POSITIVE_INFINITY;
  const secondFalseStarts = second.falseStarts ?? Number.POSITIVE_INFINITY;

  if (firstFalseStarts !== secondFalseStarts) {
    return firstFalseStarts - secondFalseStarts;
  }

  const firstAverage = first.avgReactionMs ?? Number.POSITIVE_INFINITY;
  const secondAverage = second.avgReactionMs ?? Number.POSITIVE_INFINITY;

  if (firstAverage !== secondAverage) {
    return firstAverage - secondAverage;
  }

  return (
    (first.submittedAt?.getTime() ?? Number.POSITIVE_INFINITY) -
    (second.submittedAt?.getTime() ?? Number.POSITIVE_INFINITY)
  );
}
