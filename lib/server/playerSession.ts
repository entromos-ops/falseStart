import { createHmac, randomInt } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE_NAME = "false_start_player";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.DAILY_CHALLENGE_SECRET ||
    "dev-only-session-secret"
  );
}

function signPlayerId(playerId: string): string {
  return createHmac("sha256", getSessionSecret()).update(playerId).digest("hex");
}

function sealPlayerId(playerId: string): string {
  return `${playerId}.${signPlayerId(playerId)}`;
}

function verifyCookieValue(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const [playerId, signature] = value.split(".");
  if (!playerId || !signature) {
    return null;
  }

  return signature === signPlayerId(playerId) ? playerId : null;
}

function defaultDisplayName(): string {
  return `Player${randomInt(1000, 10000)}`;
}

export async function getOrCreatePlayer() {
  const cookieStore = await cookies();
  const cookiePlayerId = verifyCookieValue(cookieStore.get(COOKIE_NAME)?.value);

  if (cookiePlayerId) {
    const existingPlayer = await prisma.player.findUnique({
      where: { id: cookiePlayerId }
    });

    if (existingPlayer) {
      return existingPlayer;
    }
  }

  // Clearing cookies can bypass anonymous limits in the MVP. Serious ranked
  // play should replace this with real authentication.
  const player = await prisma.player.create({
    data: {
      displayName: defaultDisplayName()
    }
  });

  cookieStore.set(COOKIE_NAME, sealPlayerId(player.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS
  });

  return player;
}

export function sanitizeDisplayName(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const cleaned = input.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 20);
  return cleaned.length > 0 ? cleaned : null;
}
