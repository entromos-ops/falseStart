"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { scoreAttempt } from "@/lib/challenge/scoring";
import type { ChallengeEvent, PlayerAction } from "@/lib/challenge/types";

type GameRunnerProps = {
  events: ChallengeEvent[];
  mode: "daily" | "practice";
  onComplete: (actions: PlayerAction[]) => void;
};

function getCurrentEvent(events: ChallengeEvent[], elapsedMs: number) {
  return events.find((event) => elapsedMs < event.feedbackEndMs) ?? null;
}

function getPhase(event: ChallengeEvent | null, elapsedMs: number) {
  if (!event) {
    return "done";
  }

  if (elapsedMs < event.cueStartMs) {
    return "waiting";
  }

  if (elapsedMs < event.cueEndMs) {
    return event.kind === "true_signal" ? "strike" : "hold";
  }

  return "feedback";
}

export default function GameRunner({ events, mode, onComplete }: GameRunnerProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const startRef = useRef(0);
  const actionsRef = useRef<PlayerAction[]>([]);
  const completedRef = useRef(false);
  const totalMs = events[events.length - 1]?.feedbackEndMs ?? 0;
  const currentEvent = getCurrentEvent(events, elapsedMs);
  const phase = getPhase(currentEvent, elapsedMs);
  const currentIndex = currentEvent?.index ?? events.length - 1;

  useEffect(() => {
    document.body.classList.add("gameplay-lock");
    startRef.current = performance.now();
    let frame = 0;

    function tick(now: number) {
      const nextElapsed = now - startRef.current;
      setElapsedMs(nextElapsed);

      if (nextElapsed >= totalMs && !completedRef.current) {
        completedRef.current = true;
        onComplete(actionsRef.current);
        return;
      }

      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);

    return () => {
      document.body.classList.remove("gameplay-lock");
      cancelAnimationFrame(frame);
    };
  }, [onComplete, totalMs]);

  const completedEvents = useMemo(
    () => events.filter((event) => event.feedbackEndMs <= elapsedMs),
    [elapsedMs, events]
  );
  const localScore = useMemo(
    () => scoreAttempt(completedEvents, actionsRef.current).score,
    [completedEvents, tapCount]
  );

  const feedbackLabel = useMemo(() => {
    if (!currentEvent || phase !== "feedback") {
      return null;
    }

    const result = scoreAttempt([currentEvent], actionsRef.current).eventResults[0];
    if (!result) {
      return null;
    }

    if (result.outcome === "hit") {
      return "HIT";
    }
    if (result.outcome === "miss") {
      return "TOO SLOW";
    }
    if (result.outcome === "fakeout_resist") {
      return "STEADY";
    }

    return "FLINCHED";
  }, [currentEvent, phase, tapCount]);

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const tMs = performance.now() - startRef.current;

    if (tMs < 0 || tMs > totalMs || completedRef.current) {
      return;
    }

    actionsRef.current = [...actionsRef.current, { tMs }];
    setTapCount((count) => count + 1);
    navigator.vibrate?.(20);
  }

  const signalText =
    phase === "strike"
      ? "STRIKE"
      : phase === "hold"
        ? "HOLD"
        : phase === "feedback"
          ? feedbackLabel ?? "..."
          : "WAIT";

  return (
    <main className={`game-active phase-${phase}`}>
      <div className="game-hud">
        <span>{mode === "daily" ? "Daily" : "Practice - not ranked"}</span>
        <strong>
          Event {Math.min(currentIndex + 1, events.length)} / {events.length}
        </strong>
        <span>{localScore.toLocaleString()}</span>
      </div>

      <button
        className="tap-zone"
        type="button"
        onPointerDown={handlePointerDown}
        aria-label="Reaction tap zone"
      >
        <span className="signal-ring" aria-hidden="true" />
        <span className="signal-text">{signalText}</span>
        <span className="signal-subtext">
          {phase === "strike"
            ? "Tap now"
            : phase === "hold"
              ? "Hands off"
              : phase === "feedback"
                ? "Reset"
                : "Stay ready"}
        </span>
      </button>

      <div className="progress-rail" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (elapsedMs / totalMs) * 100)}%` }} />
      </div>
    </main>
  );
}
