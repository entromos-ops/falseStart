import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statements = [
  `PRAGMA foreign_keys = ON`,
  `CREATE TABLE IF NOT EXISTS "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "Attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "challengeDate" TEXT NOT NULL,
    "challengeVersion" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "sequenceHash" TEXT NOT NULL,
    "score" INTEGER,
    "trueHits" INTEGER,
    "misses" INTEGER,
    "fakeoutResists" INTEGER,
    "falseStarts" INTEGER,
    "avgReactionMs" REAL,
    "bestReactionMs" REAL,
    "maxStreak" INTEGER,
    "suspiciousFlags" JSONB,
    "rawActions" JSONB,
    "eventResults" JSONB,
    CONSTRAINT "Attempt_playerId_fkey"
      FOREIGN KEY ("playerId") REFERENCES "Player" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Attempt_playerId_challengeDate_idx"
    ON "Attempt"("playerId", "challengeDate")`,
  `CREATE INDEX IF NOT EXISTS "Attempt_challengeDate_score_idx"
    ON "Attempt"("challengeDate", "score")`
];

try {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  console.log("SQLite schema is ready.");
} finally {
  await prisma.$disconnect();
}
