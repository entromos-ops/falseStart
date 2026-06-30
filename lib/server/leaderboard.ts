import type { LeaderboardEntry } from "@/lib/challenge/types";
import { attemptToSummary, compareAttempts } from "./attempts";
import { prisma } from "./db";

function hasSuspiciousFlags(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

export async function getDailyLeaderboard(
  challengeDate: string
): Promise<LeaderboardEntry[]> {
  const attempts = await prisma.attempt.findMany({
    where: {
      challengeDate,
      status: "submitted",
      score: {
        not: null
      }
    },
    include: {
      player: true
    }
  });

  const bestByPlayer = new Map<string, (typeof attempts)[number]>();

  for (const attempt of attempts) {
    if (hasSuspiciousFlags(attempt.suspiciousFlags)) {
      continue;
    }

    const currentBest = bestByPlayer.get(attempt.playerId);
    if (!currentBest || compareAttempts(attempt, currentBest) < 0) {
      bestByPlayer.set(attempt.playerId, attempt);
    }
  }

  return [...bestByPlayer.values()]
    .sort(compareAttempts)
    .slice(0, 50)
    .map((attempt, index) => {
      const summary = attemptToSummary(attempt);
      if (!summary) {
        throw new Error("Submitted leaderboard attempt is missing a summary");
      }

      return {
        ...summary,
        rank: index + 1,
        playerId: attempt.playerId,
        displayName: attempt.player.displayName || "Anonymous"
      };
    });
}
