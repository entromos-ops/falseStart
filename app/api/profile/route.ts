import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import {
  getOrCreatePlayer,
  sanitizeDisplayName
} from "@/lib/server/playerSession";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const player = await getOrCreatePlayer();
  const body = (await request.json().catch(() => null)) as {
    displayName?: unknown;
  } | null;
  const displayName = sanitizeDisplayName(body?.displayName);

  if (!displayName) {
    return NextResponse.json(
      { error: "Use letters, numbers, spaces, underscores, or hyphens." },
      { status: 400 }
    );
  }

  const updatedPlayer = await prisma.player.update({
    where: { id: player.id },
    data: { displayName }
  });

  return NextResponse.json({
    player: {
      id: updatedPlayer.id,
      displayName: updatedPlayer.displayName
    }
  });
}
