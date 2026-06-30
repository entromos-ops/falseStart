import { NextResponse } from "next/server";
import { CHALLENGE_VERSION } from "@/lib/challenge/constants";
import {
  attemptsRemaining,
  expireStaleAttempts,
  getAttemptsUsed,
  getPlayerBestAttempt
} from "@/lib/server/attempts";
import { getChallengeDate } from "@/lib/server/challengeDate";
import { getDailyLeaderboard } from "@/lib/server/leaderboard";
import { getOrCreatePlayer } from "@/lib/server/playerSession";

export const runtime = "nodejs";

export async function GET() {
  const player = await getOrCreatePlayer();
  const challengeDate = getChallengeDate();

  await expireStaleAttempts(player.id, challengeDate);

  const attemptsUsed = await getAttemptsUsed(player.id, challengeDate);
  const [playerBest, leaderboard] = await Promise.all([
    getPlayerBestAttempt(player.id, challengeDate),
    getDailyLeaderboard(challengeDate)
  ]);

  return NextResponse.json({
    challengeDate,
    challengeVersion: CHALLENGE_VERSION,
    attemptsUsed,
    attemptsRemaining: attemptsRemaining(attemptsUsed),
    player: {
      id: player.id,
      displayName: player.displayName
    },
    playerBest,
    leaderboard
  });
}
