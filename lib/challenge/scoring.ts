import {
  FAKEOUT_RESIST_POINTS,
  FALSE_START_PENALTY,
  IDEAL_REACTION_MS,
  MAX_HIT_POINTS,
  MAX_VALID_REACTION_MS,
  MIN_HIT_POINTS,
  MIN_VALID_REACTION_MS,
  MISS_PENALTY,
  STREAK_BONUS_CAP,
  STREAK_BONUS_PER_EVENT
} from "./constants";
import type {
  AttemptResult,
  ChallengeEvent,
  EventResult,
  PlayerAction
} from "./types";

export type ScoringOptions = {
  submittedElapsedMs?: number;
  expectedDurationMs?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hitPoints(reactionMs: number): number {
  if (reactionMs <= IDEAL_REACTION_MS) {
    return MAX_HIT_POINTS;
  }

  const progress =
    (MAX_VALID_REACTION_MS - reactionMs) /
    (MAX_VALID_REACTION_MS - IDEAL_REACTION_MS);
  const speedBonus = 700 * clamp(progress, 0, 1);

  return Math.round(
    clamp(MIN_HIT_POINTS + speedBonus, MIN_HIT_POINTS, MAX_HIT_POINTS)
  );
}

function variance(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return (
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    values.length
  );
}

function maxActionsPerSecond(actions: PlayerAction[]): number {
  let max = 0;
  let left = 0;

  for (let right = 0; right < actions.length; right += 1) {
    while (actions[right].tMs - actions[left].tMs > 1000) {
      left += 1;
    }

    max = Math.max(max, right - left + 1);
  }

  return max;
}

function cleanActions(actions: PlayerAction[]): PlayerAction[] {
  return actions
    .filter(
      (action) =>
        Number.isFinite(action.tMs) && action.tMs >= 0 && action.tMs < 600000
    )
    .sort((a, b) => a.tMs - b.tMs)
    .slice(0, 500);
}

export function scoreAttempt(
  events: ChallengeEvent[],
  actions: PlayerAction[],
  options: ScoringOptions = {}
): AttemptResult {
  const sortedActions = cleanActions(actions);
  const suspiciousFlags = new Set<string>();
  const validReactions: number[] = [];
  const eventResults: EventResult[] = [];

  let score = 0;
  let trueHits = 0;
  let misses = 0;
  let fakeoutResists = 0;
  let falseStarts = 0;
  let streak = 0;
  let maxStreak = 0;

  for (const event of events) {
    const phaseActions = sortedActions.filter(
      (action) => action.tMs >= event.waitStartMs && action.tMs < event.cueEndMs
    );

    if (event.kind === "true_signal") {
      const earlyAction = phaseActions.find(
        (action) => action.tMs < event.cueStartMs
      );

      if (earlyAction) {
        score -= FALSE_START_PENALTY;
        falseStarts += 1;
        streak = 0;
        eventResults.push({
          index: event.index,
          kind: event.kind,
          outcome: "false_start",
          reactionMs: null,
          scoreDelta: -FALSE_START_PENALTY,
          streakAfter: streak
        });
        continue;
      }

      const hitAction = phaseActions.find(
        (action) => action.tMs >= event.cueStartMs
      );

      if (hitAction) {
        const reactionMs = Math.round(hitAction.tMs - event.cueStartMs);
        const streakBonus = Math.min(
          streak * STREAK_BONUS_PER_EVENT,
          STREAK_BONUS_CAP
        );
        const delta = hitPoints(reactionMs) + streakBonus;

        score += delta;
        trueHits += 1;
        streak += 1;
        maxStreak = Math.max(maxStreak, streak);
        validReactions.push(reactionMs);

        eventResults.push({
          index: event.index,
          kind: event.kind,
          outcome: "hit",
          reactionMs,
          scoreDelta: delta,
          streakAfter: streak
        });
      } else {
        score -= MISS_PENALTY;
        misses += 1;
        streak = 0;
        eventResults.push({
          index: event.index,
          kind: event.kind,
          outcome: "miss",
          reactionMs: null,
          scoreDelta: -MISS_PENALTY,
          streakAfter: streak
        });
      }

      continue;
    }

    if (phaseActions.length > 0) {
      score -= FALSE_START_PENALTY;
      falseStarts += 1;
      streak = 0;
      eventResults.push({
        index: event.index,
        kind: event.kind,
        outcome: "false_start",
        reactionMs: null,
        scoreDelta: -FALSE_START_PENALTY,
        streakAfter: streak
      });
    } else {
      score += FAKEOUT_RESIST_POINTS;
      fakeoutResists += 1;
      streak += 1;
      maxStreak = Math.max(maxStreak, streak);
      eventResults.push({
        index: event.index,
        kind: event.kind,
        outcome: "fakeout_resist",
        reactionMs: null,
        scoreDelta: FAKEOUT_RESIST_POINTS,
        streakAfter: streak
      });
    }
  }

  const underMinReactionCount = validReactions.filter(
    (reactionMs) => reactionMs < MIN_VALID_REACTION_MS
  ).length;
  const avgReactionMs =
    validReactions.length > 0
      ? Math.round(
          validReactions.reduce((sum, value) => sum + value, 0) /
            validReactions.length
        )
      : null;
  const bestReactionMs =
    validReactions.length > 0 ? Math.min(...validReactions) : null;

  if (underMinReactionCount > 2) {
    suspiciousFlags.add("more_than_two_reactions_under_100ms");
  }

  if (avgReactionMs !== null && avgReactionMs < 140) {
    suspiciousFlags.add("average_reaction_under_140ms");
  }

  if (validReactions.length >= 5 && variance(validReactions) < 225) {
    suspiciousFlags.add("reaction_variance_extremely_low");
  }

  if (maxActionsPerSecond(sortedActions) >= 75) {
    suspiciousFlags.add("impossible_action_density");
  }

  if (
    options.submittedElapsedMs !== undefined &&
    options.expectedDurationMs !== undefined &&
    options.submittedElapsedMs > options.expectedDurationMs + 30000
  ) {
    suspiciousFlags.add("submission_too_late");
  }

  return {
    score,
    trueHits,
    misses,
    fakeoutResists,
    falseStarts,
    avgReactionMs,
    bestReactionMs,
    maxStreak,
    suspiciousFlags: [...suspiciousFlags],
    eventResults
  };
}
