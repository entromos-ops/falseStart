"use client";

import type { AttemptResult, AttemptSummary } from "@/lib/challenge/types";

type ResultState = {
  mode: "daily" | "practice";
  result: AttemptResult;
  rank: number | null;
  attemptsRemaining: number;
  playerBest: AttemptSummary | null;
};

type ResultsPanelProps = {
  resultState: ResultState;
  canRetry: boolean;
  onRetry: () => void;
  onPractice: () => void;
  onHome: () => void;
};

function formatMs(value: number | null): string {
  return value === null ? "--" : `${Math.round(value)}ms`;
}

export default function ResultsPanel({
  resultState,
  canRetry,
  onRetry,
  onPractice,
  onHome
}: ResultsPanelProps) {
  const { result } = resultState;
  const isRanked = resultState.mode === "daily" && resultState.rank !== null;

  async function shareResult() {
    const text = `False Start: ${result.score.toLocaleString()} points, ${
      result.trueHits
    } hits, ${result.falseStarts} false starts.`;

    if (navigator.share) {
      await navigator.share({
        title: "False Start",
        text,
        url: window.location.href
      });
      return;
    }

    await navigator.clipboard?.writeText(`${text} ${window.location.href}`);
  }

  return (
    <div className="results-screen">
      <div className="result-hero">
        <span>{resultState.mode === "daily" ? "Daily result" : "Practice run"}</span>
        <h1>{result.score.toLocaleString()}</h1>
        <p>
          {isRanked
            ? `Rank #${resultState.rank} today`
            : result.suspiciousFlags.length > 0
              ? "Saved, not public-ranked"
              : "Not ranked"}
        </p>
      </div>

      <div className="stats-grid">
        <div>
          <span>Hits</span>
          <strong>{result.trueHits} / 9</strong>
        </div>
        <div>
          <span>Fakeouts</span>
          <strong>{result.fakeoutResists} / 5</strong>
        </div>
        <div>
          <span>False starts</span>
          <strong>{result.falseStarts}</strong>
        </div>
        <div>
          <span>Misses</span>
          <strong>{result.misses}</strong>
        </div>
        <div>
          <span>Average</span>
          <strong>{formatMs(result.avgReactionMs)}</strong>
        </div>
        <div>
          <span>Best</span>
          <strong>{formatMs(result.bestReactionMs)}</strong>
        </div>
        <div>
          <span>Max streak</span>
          <strong>{result.maxStreak}</strong>
        </div>
        <div>
          <span>Attempts left</span>
          <strong>{resultState.attemptsRemaining}</strong>
        </div>
      </div>

      {result.suspiciousFlags.length > 0 ? (
        <p className="flag-note">
          This run was flagged for review and is hidden from the public board.
        </p>
      ) : null}

      <div className="action-stack">
        {resultState.mode === "daily" && canRetry ? (
          <button className="primary-button" type="button" onClick={onRetry}>
            Retry Daily
          </button>
        ) : null}
        <button className="secondary-button" type="button" onClick={onPractice}>
          Practice
        </button>
        <button className="secondary-button" type="button" onClick={shareResult}>
          Share Result
        </button>
        <button className="ghost-button" type="button" onClick={onHome}>
          Back to Lobby
        </button>
      </div>
    </div>
  );
}
