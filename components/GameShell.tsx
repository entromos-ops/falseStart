"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { generateChallenge } from "@/lib/challenge/generator";
import { scoreAttempt } from "@/lib/challenge/scoring";
import type {
  AttemptResult,
  AttemptSummary,
  ChallengeEvent,
  LeaderboardEntry,
  PlayerAction
} from "@/lib/challenge/types";
import GameRunner from "./GameRunner";
import Leaderboard from "./Leaderboard";
import Lobby from "./Lobby";
import ResultsPanel from "./ResultsPanel";

type TodayPayload = {
  challengeDate: string;
  challengeVersion: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  player: {
    id: string;
    displayName: string | null;
  };
  playerBest: AttemptSummary | null;
  leaderboard: LeaderboardEntry[];
};

type DailyRun = {
  mode: "daily";
  attemptId: string;
  challengeDate: string;
  events: ChallengeEvent[];
};

type PracticeRun = {
  mode: "practice";
  events: ChallengeEvent[];
};

type ActiveRun = DailyRun | PracticeRun;

type ResultState = {
  mode: "daily" | "practice";
  result: AttemptResult;
  rank: number | null;
  attemptsRemaining: number;
  playerBest: AttemptSummary | null;
};

function makePracticeSeed(): string {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Math.random()}-${Date.now()}`;

  return `practice:${randomPart}`;
}

export default function GameShell() {
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<"lobby" | "countdown" | "run" | "results">(
    "lobby"
  );
  const [countdown, setCountdown] = useState(3);
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);
  const [resultState, setResultState] = useState<ResultState | null>(null);

  const refreshToday = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/challenge/today", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Could not load today's challenge.");
      }

      setToday((await response.json()) as TodayPayload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load today's challenge."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshToday();
  }, [refreshToday]);

  useEffect(() => {
    if (screen !== "countdown") {
      return;
    }

    setCountdown(3);
    const ticks = [2, 1, 0];
    const timers = ticks.map((value, index) =>
      window.setTimeout(() => {
        setCountdown(value);
        if (value === 0) {
          setScreen("run");
        }
      }, (index + 1) * 800)
    );

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [screen]);

  const startDaily = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch("/api/challenge/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "No daily attempts remaining.");
        await refreshToday();
        return;
      }

      setActiveRun({
        mode: "daily",
        attemptId: payload.attemptId,
        challengeDate: payload.challengeDate,
        events: payload.events
      });
      setToday((current) =>
        current
          ? {
              ...current,
              attemptsUsed: Math.min(2, current.attemptsUsed + 1),
              attemptsRemaining: payload.attemptsRemaining
            }
          : current
      );
      setScreen("countdown");
    } catch {
      setError("Could not start the daily challenge.");
    }
  }, [refreshToday]);

  const startPractice = useCallback(() => {
    setError(null);
    setActiveRun({
      mode: "practice",
      events: generateChallenge(makePracticeSeed())
    });
    setScreen("countdown");
  }, []);

  const submitDaily = useCallback(
    async (run: DailyRun, actions: PlayerAction[]) => {
      const response = await fetch("/api/challenge/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          attemptId: run.attemptId,
          actions
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Could not submit attempt.");
      }

      setResultState({
        mode: "daily",
        result: payload.result,
        rank: payload.rank,
        attemptsRemaining: payload.attemptsRemaining,
        playerBest: payload.playerBest
      });

      await refreshToday();
    },
    [refreshToday]
  );

  const handleRunComplete = useCallback(
    async (actions: PlayerAction[]) => {
      if (!activeRun) {
        return;
      }

      if (activeRun.mode === "practice") {
        const result = scoreAttempt(activeRun.events, actions);
        setResultState({
          mode: "practice",
          result,
          rank: null,
          attemptsRemaining: today?.attemptsRemaining ?? 0,
          playerBest: today?.playerBest ?? null
        });
        setScreen("results");
        return;
      }

      try {
        await submitDaily(activeRun, actions);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Could not submit attempt."
        );
      } finally {
        setScreen("results");
      }
    },
    [activeRun, submitDaily, today?.attemptsRemaining, today?.playerBest]
  );

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      setError(null);

      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ displayName })
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Could not update display name.");
        return;
      }

      setToday((current) =>
        current
          ? {
              ...current,
              player: payload.player
            }
          : current
      );
    },
    []
  );

  const leaderboard = useMemo(
    () => today?.leaderboard ?? [],
    [today?.leaderboard]
  );

  if (screen === "run" && activeRun) {
    return (
      <GameRunner
        events={activeRun.events}
        mode={activeRun.mode}
        onComplete={handleRunComplete}
      />
    );
  }

  return (
    <main className="app-shell">
      <section className="app-frame" aria-live="polite">
        {screen === "countdown" && activeRun ? (
          <div className="countdown-screen">
            <p className="mode-label">
              {activeRun.mode === "daily"
                ? "Daily attempt consumed"
                : "Practice - not ranked"}
            </p>
            <div className="countdown-number">{countdown || "GO"}</div>
            <p className="countdown-copy">
              Tap on STRIKE. Ignore FAKEOUT.
            </p>
          </div>
        ) : null}

        {screen === "lobby" ? (
          <>
            <Lobby
              today={today}
              isLoading={isLoading}
              error={error}
              onStartDaily={startDaily}
              onStartPractice={startPractice}
              onRefresh={refreshToday}
              onUpdateDisplayName={updateDisplayName}
            />
            <Leaderboard entries={leaderboard} />
          </>
        ) : null}

        {screen === "results" && resultState ? (
          <ResultsPanel
            resultState={resultState}
            canRetry={resultState.attemptsRemaining > 0}
            onRetry={startDaily}
            onPractice={startPractice}
            onHome={() => setScreen("lobby")}
          />
        ) : null}
      </section>
    </main>
  );
}
