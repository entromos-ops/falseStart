"use client";

import type { LeaderboardEntry } from "@/lib/challenge/types";

type LeaderboardProps = {
  entries: LeaderboardEntry[];
};

export default function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <section className="leaderboard" aria-label="Today's leaderboard">
      <div className="section-heading">
        <h2>Today</h2>
        <span>Top 50</span>
      </div>

      {entries.length === 0 ? (
        <p className="empty-state">No ranked scores yet.</p>
      ) : (
        <ol className="leaderboard-list">
          {entries.slice(0, 8).map((entry) => (
            <li key={entry.attemptId}>
              <span className="rank">#{entry.rank}</span>
              <span className="leader-name">{entry.displayName}</span>
              <strong>{entry.score.toLocaleString()}</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
