"use client";

import dynamic from "next/dynamic";
import { track } from "@vercel/analytics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ITEM_LABELS, REALM_QUESTS } from "@/lib/realm/content";
import {
  applyRealmAction,
  createInitialRealm,
  currentQuest,
  getEntityActions,
  languageBlendPercent,
  parseRealm,
  refreshRealmState,
  serializeRealm
} from "@/lib/realm/engine";
import type {
  EntityId,
  RealmAction,
  RealmState,
  SupportMode,
  TilePoint
} from "@/lib/realm/types";
import MarketDayChallenge from "./MarketDayChallenge";
import RealmPanels, { type RealmPanelTab } from "./RealmPanels";

const RealmWorld = dynamic(() => import("./RealmWorld"), {
  ssr: false,
  loading: () => (
    <div className="realm-world-loading" role="status">
      <span className="realm-loading-rune" aria-hidden="true">L</span>
      <p>Drawing the valley…</p>
    </div>
  )
});

const SAVE_KEY = "luma-realm:v2";
const BACKUP_KEY = "luma-realm:v2:backup";
const SHARE_PATH = "/?challenge=market&utm_source=player_share&utm_medium=referral&utm_campaign=market_day";

type TrackData = Record<string, string | number | boolean | null>;

function feedbackClass(kind: "good" | "soft" | "info") {
  return `realm-toast realm-toast--${kind}`;
}

export default function LumaRealmGame() {
  const [state, setState] = useState<RealmState>(() => createInitialRealm());
  const stateRef = useRef(state);
  const [hydrated, setHydrated] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<EntityId | null>(null);
  const [tab, setTab] = useState<RealmPanelTab>(null);
  const [now, setNow] = useState(() => Date.now());
  const [challengeRequested, setChallengeRequested] = useState(false);
  const [shareNotice, setShareNotice] = useState("");

  const quest = currentQuest(state);
  const blend = languageBlendPercent(state);
  const actions = useMemo(
    () => selectedEntityId ? getEntityActions(state, selectedEntityId, now) : [],
    [now, selectedEntityId, state]
  );

  const commit = useCallback((next: RealmState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const safeTrack = useCallback((eventName: string, data?: TrackData) => {
    try {
      track(eventName, data);
    } catch {
      // Analytics must never interrupt the game.
    }
  }, []);

  const act = useCallback((action: RealmAction) => {
    const before = stateRef.current;
    const beforeQuest = currentQuest(before);
    const result = applyRealmAction(before, action, Date.now());
    commit(result.state);
    if (action.type === "start" && result.accepted) {
      safeTrack("entered_world", {
        route: action.marketDayComplete ? "market_day" : "direct",
        support_mode: result.state.supportMode
      });
    }
    if (action.type === "set-support" && result.accepted) {
      safeTrack("support_changed", { mode: action.mode });
    }
    if (
      result.completedQuest
      && beforeQuest
      && (action.type === "choose" || action.type === "perform")
    ) {
      safeTrack("quest_completed", {
        quest: beforeQuest.id,
        quest_number: before.questIndex + 1
      });
    }
    if (!before.completed && result.state.completed) {
      safeTrack("chapter_completed", { chapter: "luma_valley" });
    }
    if (result.completedQuest && "vibrate" in navigator) navigator.vibrate([18, 35, 22]);
    else if (!result.accepted && "vibrate" in navigator) navigator.vibrate(12);
  }, [commit, safeTrack]);

  useEffect(() => {
    let restored = createInitialRealm();
    try {
      const primary = window.localStorage.getItem(SAVE_KEY);
      const backup = window.localStorage.getItem(BACKUP_KEY);
      restored = parseRealm(primary ?? backup, Date.now());
    } catch {
      // Browsers that block local storage can still play for the current session.
    }
    stateRef.current = restored;
    setState(restored);
    setNow(Date.now());
    const params = new URLSearchParams(window.location.search);
    setChallengeRequested(params.get("challenge") === "market");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const previous = window.localStorage.getItem(SAVE_KEY);
      if (previous) window.localStorage.setItem(BACKUP_KEY, previous);
      window.localStorage.setItem(SAVE_KEY, serializeRealm(state));
    } catch {
      // Keep the in-memory session playable if storage is unavailable or full.
    }
  }, [hydrated, state]);

  useEffect(() => {
    if (!hydrated || !state.started) return;
    const timer = window.setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      const refreshed = refreshRealmState(stateRef.current, tick);
      if (refreshed !== stateRef.current) commit(refreshed);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [commit, hydrated, state.started]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (tab) setTab(null);
      else setSelectedEntityId(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [tab]);

  useEffect(() => {
    if (!shareNotice) return;
    const timer = window.setTimeout(() => setShareNotice(""), 3_500);
    return () => window.clearTimeout(timer);
  }, [shareNotice]);

  function handleSelectEntity(id: EntityId) {
    setSelectedEntityId(id);
    setTab(null);
    act({ type: "interact", entityId: id, now: Date.now() });
  }

  function handleMove(point: TilePoint) {
    setSelectedEntityId(null);
    act({ type: "move", point });
  }

  function handleTabChange(next: RealmPanelTab) {
    setTab((current) => current === next ? null : next);
    if (next) setSelectedEntityId(null);
  }

  function handleSupportChange(mode: SupportMode) {
    act({ type: "set-support", mode });
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-MX";
    utterance.rate = 0.86;
    const voice = window.speechSynthesis
      .getVoices()
      .find((candidate) => candidate.lang.toLowerCase().startsWith("es"));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }

  async function shareGame(surface: "challenge" | "passport" | "settings") {
    const url = `${window.location.origin}${SHARE_PATH}`;
    const text = surface === "challenge"
      ? "I just completed my first Spanish market conversation in Luma Village. Can you?"
      : "I found a cozy RPG where useful Spanish is part of the world. Try Market Day with me.";

    safeTrack("share_clicked", { surface });
    try {
      if (navigator.share) {
        await navigator.share({ title: "Luma Village · Market Day", text, url });
        setShareNotice("Challenge sent. ¡Buena suerte!");
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShareNotice("Challenge link copied.");
        return;
      }
      setShareNotice(`Share this link: ${url}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard?.writeText(`${text} ${url}`);
        setShareNotice("Challenge link copied.");
      } catch {
        setShareNotice(`Share this link: ${url}`);
      }
    }
  }

  function resetProgress() {
    if (!window.confirm("Start over with a new arrival in Luma Valley?")) return;
    const next = createInitialRealm();
    try {
      window.localStorage.removeItem(SAVE_KEY);
      window.localStorage.removeItem(BACKUP_KEY);
    } catch {
      // Resetting the active session does not depend on storage availability.
    }
    commit(next);
    setSelectedEntityId(null);
    setTab(null);
  }

  if (!state.started) {
    return (
      <MarketDayChallenge
        autoStart={hydrated && challengeRequested}
        shareNotice={shareNotice}
        onComplete={() => act({ type: "start", marketDayComplete: true })}
        onSkip={() => act({ type: "start" })}
        onShare={() => shareGame("challenge")}
        onSpeak={speak}
        onTrack={safeTrack}
      />
    );
  }

  return (
    <main className="realm-app">
      <header className="realm-header">
        <div className="realm-brand" aria-label="Luma Village">
          <span className="realm-brand-mark" aria-hidden="true">L</span>
          <span><strong>Luma</strong><small>Valley chapter</small></span>
        </div>

        <div className="realm-language-meter" aria-label={`${blend}% Spanish blend`}>
          <div><span>Spanish blend</span><strong>{blend}%</strong></div>
          <span className="realm-meter-track"><i style={{ width: `${blend}%` }} /></span>
        </div>

        <div className="realm-wallet" aria-label={`${state.inventory.coin} coins`}>
          <span aria-hidden="true">●</span><strong>{state.inventory.coin}</strong>
          <small>{ITEM_LABELS.coin.es}</small>
        </div>
      </header>

      <div className="realm-layout">
        <section className="realm-world-column" aria-label="Luma Valley game world">
          <div className="realm-quest-ribbon">
            <span className="quest-seal" aria-hidden="true">
              {state.completed ? "✓" : state.questIndex + 1}
            </span>
            <div>
              <small>{state.completed ? "Valley chapter complete" : quest?.chapter}</small>
              <strong>{state.completed ? "The north road is open" : quest?.title}</strong>
              {!state.completed && quest ? (
                <p>{quest.instruction} <b>{state.questProgress}/{quest.required}</b></p>
              ) : <p>Keep farming, gathering, and growing your skills.</p>}
            </div>
          </div>

          <RealmWorld
            state={state}
            selectedEntityId={selectedEntityId}
            questTargetIds={quest?.targetIds ?? []}
            onSelectEntity={handleSelectEntity}
            onMove={handleMove}
          />

          <div className="realm-world-hint" aria-hidden="true">
            <span>Tap ground to walk</span><i /> <span>Tap people and places to act</span>
          </div>

          {state.lastEvent && Date.now() - state.lastEvent.at < 4_000 ? (
            <div className={feedbackClass(state.lastEvent.kind)} key={state.lastEvent.at} role="status">
              <strong>{state.lastEvent.title}</strong>
              <span>{state.lastEvent.message}</span>
            </div>
          ) : null}
        </section>

        <RealmPanels
          state={state}
          selectedEntityId={selectedEntityId}
          actions={actions}
          tab={tab}
          now={now}
          onAction={act}
          onAdvance={() => act({ type: "advance", now: Date.now() })}
          onCloseSelection={() => setSelectedEntityId(null)}
          onTabChange={handleTabChange}
          onSpeak={speak}
          onSupportChange={handleSupportChange}
          onReset={resetProgress}
          onShare={() => shareGame("passport")}
        />
      </div>

      {shareNotice ? (
        <div className="realm-share-toast" role="status">{shareNotice}</div>
      ) : null}

      <span className="realm-build-label" aria-hidden="true">
        CHAPTER {Math.min(REALM_QUESTS.length, state.questIndex + 1)} / {REALM_QUESTS.length}
      </span>
    </main>
  );
}
