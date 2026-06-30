"use client";

import { FormEvent, useEffect, useState } from "react";
import type { AttemptSummary, LeaderboardEntry } from "@/lib/challenge/types";

type TodayPayload = {
  challengeDate: string;
  attemptsRemaining: number;
  player: {
    id: string;
    displayName: string | null;
  };
  playerBest: AttemptSummary | null;
  leaderboard: LeaderboardEntry[];
};

type LobbyProps = {
  today: TodayPayload | null;
  isLoading: boolean;
  error: string | null;
  onStartDaily: () => void;
  onStartPractice: () => void;
  onRefresh: () => void;
  onUpdateDisplayName: (displayName: string) => Promise<void>;
};

export default function Lobby({
  today,
  isLoading,
  error,
  onStartDaily,
  onStartPractice,
  onRefresh,
  onUpdateDisplayName
}: LobbyProps) {
  const [displayName, setDisplayName] = useState("");
  const attemptsRemaining = today?.attemptsRemaining ?? 0;

  useEffect(() => {
    setDisplayName(today?.player.displayName ?? "");
  }, [today?.player.displayName]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onUpdateDisplayName(displayName);
  }

  return (
    <div className="lobby-screen">
      <header className="title-block">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            <span />
          </div>
          <p className="date-label">{today?.challengeDate ?? "Daily seed"}</p>
        </div>
        <h1>False Start</h1>
        <p>
          Tap the real signal. Do not flinch on decoys. Everyone gets the
          same sequence. You get two attempts.
        </p>
      </header>

      <div className="attempt-meter">
        <span>Attempts left today</span>
        <strong>{isLoading ? "--" : attemptsRemaining}</strong>
      </div>

      <div className="action-stack">
        <button
          className="primary-button"
          type="button"
          onClick={onStartDaily}
          disabled={isLoading || attemptsRemaining <= 0}
        >
          Start Daily
        </button>
        <button className="secondary-button" type="button" onClick={onStartPractice}>
          Practice
        </button>
      </div>

      <form className="profile-row" onSubmit={handleProfileSubmit}>
        <label htmlFor="display-name">Display name</label>
        <div>
          <input
            id="display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={20}
            placeholder="Player1234"
          />
          <button type="submit">Save</button>
        </div>
      </form>

      {today?.playerBest ? (
        <div className="best-score">
          <span>Your best today</span>
          <strong>{today.playerBest.score.toLocaleString()}</strong>
        </div>
      ) : null}

      {error ? (
        <div className="error-banner">
          <span>{error}</span>
          <button type="button" onClick={onRefresh}>
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
