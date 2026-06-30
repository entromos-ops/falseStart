import { NextResponse } from "next/server";
import { getChallengeDate } from "@/lib/server/challengeDate";
import { getDailyLeaderboard } from "@/lib/server/leaderboard";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const challengeDate = searchParams.get("date") || getChallengeDate();
  const entries = await getDailyLeaderboard(challengeDate);

  return NextResponse.json({
    challengeDate,
    entries
  });
}
