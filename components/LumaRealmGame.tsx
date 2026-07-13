"use client";

import dynamic from "next/dynamic";
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

  const act = useCallback((action: RealmAction) => {
    const result = applyRealmAction(stateRef.current, action, Date.now());
    commit(result.state);
    if (result.completedQuest && "vibrate" in navigator) navigator.vibrate([18, 35, 22]);
    else if (!result.accepted && "vibrate" in navigator) navigator.vibrate(12);
  }, [commit]);

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

  if (!hydrated) {
    return (
      <main className="realm-boot" aria-label="Loading Luma Village">
        <span className="realm-loading-rune" aria-hidden="true">L</span>
        <p>Waking the valley…</p>
      </main>
    );
  }

  if (!state.started) {
    return (
      <main className="realm-intro">
        <div className="intro-sun" aria-hidden="true" />
        <div className="intro-landscape" aria-hidden="true">
          <span className="intro-mountain intro-mountain--one" />
          <span className="intro-mountain intro-mountain--two" />
          <span className="intro-house" />
          <span className="intro-tree intro-tree--one" />
          <span className="intro-tree intro-tree--two" />
        </div>
        <section className="intro-card">
          <div className="intro-brand"><span>L</span> LUMA VILLAGE</div>
          <p className="intro-kicker">A language-learning adventure</p>
          <h1>A world worth<br />learning.</h1>
          <p className="intro-copy">
            Build a life in a small open valley. Farm, gather, trade, and learn
            useful Spanish because the people and places make it matter.
          </p>
          <button className="intro-enter" type="button" onClick={() => act({ type: "start" })}>
            <span>Enter the valley</span><b aria-hidden="true">→</b>
          </button>
          <div className="intro-features" aria-label="Game features">
            <span>Explore freely</span><span>Grow skills</span><span>Learn by doing</span>
          </div>
          <p className="intro-save-note">Your adventure saves on this device.</p>
        </section>
      </main>
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
        />
      </div>

      <span className="realm-build-label" aria-hidden="true">
        CHAPTER {Math.min(REALM_QUESTS.length, state.questIndex + 1)} / {REALM_QUESTS.length}
      </span>
    </main>
  );
}
