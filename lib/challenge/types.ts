export type EventKind = "true_signal" | "fakeout";

export type ChallengeEvent = {
  index: number;
  kind: EventKind;
  waitStartMs: number;
  cueStartMs: number;
  cueEndMs: number;
  feedbackEndMs: number;
  visualVariant: number;
};

export type PlayerAction = {
  tMs: number;
};

export type EventOutcome =
  | "hit"
  | "miss"
  | "fakeout_resist"
  | "false_start";

export type EventResult = {
  index: number;
  kind: EventKind;
  outcome: EventOutcome;
  reactionMs: number | null;
  scoreDelta: number;
  streakAfter: number;
};

export type AttemptResult = {
  score: number;
  trueHits: number;
  misses: number;
  fakeoutResists: number;
  falseStarts: number;
  avgReactionMs: number | null;
  bestReactionMs: number | null;
  maxStreak: number;
  suspiciousFlags: string[];
  eventResults: EventResult[];
};

export type AttemptStatus = "started" | "submitted" | "expired";

export type AttemptSummary = {
  attemptId: string;
  score: number;
  trueHits: number;
  misses: number;
  fakeoutResists: number;
  falseStarts: number;
  avgReactionMs: number | null;
  bestReactionMs: number | null;
  maxStreak: number;
  submittedAt: string;
  suspiciousFlags: string[];
};

export type LeaderboardEntry = AttemptSummary & {
  rank: number;
  playerId: string;
  displayName: string;
};
