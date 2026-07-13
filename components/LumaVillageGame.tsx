"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { JOURNAL_PHRASES, QUESTS, RESOURCE_LABELS } from "@/lib/game/content";
import {
  advanceQuest,
  applyQuestAction,
  createInitialState,
  currentQuest,
  immersionPercent,
  parseSavedGame,
  revealHint,
  selectSupportStage,
  serializeGame,
  setSupportMode,
  startGame
} from "@/lib/game/engine";
import type {
  GameAction,
  GameState,
  ResourceId,
  SupportMode
} from "@/lib/game/types";
import QuestSheet from "./QuestSheet";
import VillageMap from "./VillageMap";

const SAVE_KEY = "luma-village:v1";
const BACKUP_KEY = "luma-village:v1:backup";

type Panel = "settings" | "journal" | null;
type Feedback = {
  kind: "good" | "soft" | "info";
  message: string;
  key: number;
};

const MODE_COPY: Array<{
  id: SupportMode;
  label: string;
  short: string;
  description: string;
}> = [
  {
    id: "gentle",
    label: "Gentle",
    short: "More English",
    description: "Keep translations visible for one extra successful use."
  },
  {
    id: "adaptive",
    label: "Auto",
    short: "Recommended",
    description: "Let each phrase lose support as you prove you understand it."
  },
  {
    id: "bold",
    label: "Bold",
    short: "More Spanish",
    description: "Hide English sooner. It always remains one tap away."
  }
];

function relevantResources(state: GameState): ResourceId[] {
  const quest = currentQuest(state);
  if (!quest) return ["coin"];
  if (["gather-boards", "deliver-boards", "build-bench"].includes(quest.id)) {
    return ["board"];
  }
  if (quest.id === "buy-apples") return ["apple", "coin"];
  if (quest.id === "give-apples") return ["apple"];
  if (quest.id === "place-flowers") return ["flower"];
  return ["coin"];
}

export default function LumaVillageGame() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const stateRef = useRef(state);
  const [hydrated, setHydrated] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const feedbackTimer = useRef<number | null>(null);

  const quest = currentQuest(state);
  const supportStage = quest
    ? selectSupportStage(state, quest.masteryKey)
    : 3;
  const immersion = immersionPercent(state);
  const inventoryIds = relevantResources(state);
  const unlockedPhraseCount = state.completed
    ? JOURNAL_PHRASES.length
    : Math.min(
        JOURNAL_PHRASES.length,
        Math.max(2, state.completedQuestIds.length * 2)
      );
  const phraseCount = unlockedPhraseCount;

  function commit(next: GameState) {
    stateRef.current = next;
    setState(next);
  }

  useEffect(() => {
    const primary = window.localStorage.getItem(SAVE_KEY);
    const backup = window.localStorage.getItem(BACKUP_KEY);
    let restored = parseSavedGame(primary);
    if (!primary && backup) restored = parseSavedGame(backup);
    stateRef.current = restored;
    setState(restored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const previous = window.localStorage.getItem(SAVE_KEY);
    if (previous) window.localStorage.setItem(BACKUP_KEY, previous);
    window.localStorage.setItem(SAVE_KEY, serializeGame(state));
  }, [hydrated, state]);

  useEffect(() => {
    if (!feedback) return;
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 2400);
    return () => {
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    };
  }, [feedback]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel(null);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const worldMood = useMemo(() => {
    if (state.completed) return "A lived-in plaza";
    if (state.placements.includes("plot-bench")) return "The plaza is blooming";
    if (state.placements.includes("plot-tree")) return "A place to sit";
    return "A quiet first morning";
  }, [state.completed, state.placements]);

  function announce(kind: Feedback["kind"], message: string) {
    setFeedback({ kind, message, key: Date.now() });
  }

  function handleAction(action: GameAction) {
    const result = applyQuestAction(stateRef.current, action);
    if (result.state !== stateRef.current) commit(result.state);
    if (result.outcome === "progress" || result.outcome === "complete") {
      if ("vibrate" in navigator) navigator.vibrate(12);
      announce("good", result.message);
    } else if (result.outcome === "wrong") {
      if ("vibrate" in navigator) navigator.vibrate([12, 28, 12]);
      announce("soft", result.message);
    }
  }

  function handleAdvance() {
    const next = advanceQuest(stateRef.current);
    commit(next);
    setFeedback(null);
  }

  function handleRevealTranslation() {
    commit(revealHint(stateRef.current));
    announce("info", "English support restored. No penalty.");
  }

  function handleStart() {
    commit(startGame(stateRef.current));
    announce("info", "Morning one begins with Alma in the plaza.");
  }

  function handleSupportMode(mode: SupportMode) {
    commit(setSupportMode(stateRef.current, mode));
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) {
      announce("soft", "Audio is not available in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-MX";
    utterance.rate = 0.88;
    const spanishVoice = window.speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith("es"));
    if (spanishVoice) utterance.voice = spanishVoice;
    window.speechSynthesis.speak(utterance);
  }

  function resetProgress() {
    if (!window.confirm("Start Luma Village over from the first morning?")) return;
    const next = createInitialState();
    window.localStorage.removeItem(SAVE_KEY);
    window.localStorage.removeItem(BACKUP_KEY);
    commit(next);
    setPanel(null);
    setFeedback(null);
  }

  if (!hydrated) {
    return (
      <main className="luma-loading" aria-label="Loading Luma Village">
        <div className="loading-mark" aria-hidden="true">
          <span />
        </div>
        <p>Waking the village…</p>
      </main>
    );
  }

  return (
    <main className="luma-shell">
      <header className="game-header">
        <div className="brand-lockup">
          <div className="luma-mark" aria-hidden="true">
            <span />
          </div>
          <div>
            <strong>Luma</strong>
            <span>Morning 1</span>
          </div>
        </div>

        <div className="header-progress" aria-label={`${immersion}% Spanish blend`}>
          <div>
            <span>Spanish blend</span>
            <strong>{immersion}%</strong>
          </div>
          <div className="blend-track" aria-hidden="true">
            <span style={{ width: `${immersion}%` }} />
          </div>
        </div>

        <div className="header-actions">
          <button
            className="language-button"
            type="button"
            onClick={() => setPanel("settings")}
            aria-label="Change Spanish support level"
          >
            <b>ES</b>
            <span>
              {state.supportMode === "adaptive"
                ? "Auto"
                : state.supportMode === "gentle"
                  ? "Gentle"
                  : "Bold"}
            </span>
          </button>
          <button
            className="journal-button"
            type="button"
            onClick={() => setPanel("journal")}
            aria-label="Open phrasebook"
          >
            <span className="book-icon" aria-hidden="true">
              <i />
            </span>
            <b>{phraseCount}</b>
          </button>
        </div>
      </header>

      <div className="game-grid">
        <section className="world-column">
          <div className="world-caption">
            <div>
              <p>{worldMood}</p>
              <span>Tap the world to act</span>
            </div>
            <div className="inventory-row" aria-label="Relevant inventory">
              {inventoryIds.map((resource) => {
                const labels = RESOURCE_LABELS[resource];
                return (
                  <span className={`inventory-chip resource-${resource}`} key={resource}>
                    <i aria-hidden="true" />
                    <b>{state.inventory[resource]}</b>
                    <small>{labels.es}</small>
                  </span>
                );
              })}
            </div>
          </div>
          <VillageMap
            state={state}
            quest={quest}
            supportStage={supportStage}
            immersion={immersion}
            feedback={feedback}
            onAction={handleAction}
          />
        </section>

        <QuestSheet
          state={state}
          quest={quest}
          supportStage={supportStage}
          translationVisible={quest ? state.hintedQuestIds.includes(quest.id) : false}
          onRevealTranslation={handleRevealTranslation}
          onSpeak={speak}
          onAction={handleAction}
          onAdvance={handleAdvance}
          onOpenJournal={() => setPanel("journal")}
        />
      </div>

      {!state.started ? (
        <div className="intro-backdrop" role="presentation">
          <section className="intro-card" role="dialog" aria-modal="true" aria-labelledby="intro-title">
            <div className="intro-scene" aria-hidden="true">
              <span className="intro-sun" />
              <span className="intro-hill intro-hill-back" />
              <span className="intro-hill intro-hill-front" />
              <span className="intro-home" />
              <span className="intro-tree" />
            </div>
            <p className="eyebrow">Welcome to Luma Village</p>
            <h1 id="intro-title">Build a place.<br />Learn its language.</h1>
            <p>
              The village begins familiar. Spanish appears in useful chunks as
              you gather, trade, build, and talk with your neighbors.
            </p>
            <div className="language-path" aria-label="English gradually becomes Spanish">
              <span>English</span>
              <i aria-hidden="true">→</i>
              <strong>Español</strong>
            </div>
            <button className="primary-action intro-action" type="button" onClick={handleStart}>
              Enter the village
              <span aria-hidden="true">→</span>
            </button>
            <small>Latin American Spanish · progress stays on this device</small>
          </section>
        </div>
      ) : null}

      {panel ? (
        <div className="panel-backdrop" role="presentation" onMouseDown={() => setPanel(null)}>
          <section
            className={`overlay-panel panel-${panel}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${panel}-title`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <p className="eyebrow">
                  {panel === "settings" ? "Language blend" : "Your phrasebook"}
                </p>
                <h2 id={`${panel}-title`}>
                  {panel === "settings" ? "Choose your support" : "Words from your world"}
                </h2>
              </div>
              <button className="close-button" type="button" onClick={() => setPanel(null)} aria-label="Close panel">
                <span aria-hidden="true" />
              </button>
            </div>

            {panel === "settings" ? (
              <>
                <p className="panel-intro">
                  This changes how quickly English fades. Individual phrases still
                  adapt to what you understand.
                </p>
                <div className="mode-list">
                  {MODE_COPY.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={state.supportMode === mode.id ? "is-selected" : ""}
                      onClick={() => handleSupportMode(mode.id)}
                    >
                      <span className="mode-radio" aria-hidden="true"><i /></span>
                      <span>
                        <strong>{mode.label}</strong>
                        <small>{mode.short}</small>
                        <p>{mode.description}</p>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="settings-footer">
                  <div>
                    <strong>Device-local progress</strong>
                    <span>Saved automatically after every world change.</span>
                  </div>
                  <button className="danger-link" type="button" onClick={resetProgress}>
                    Start over
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="journal-summary">
                  <strong>{unlockedPhraseCount}</strong>
                  <span>of {JOURNAL_PHRASES.length} phrases discovered this morning</span>
                </div>
                <div className="phrase-list">
                  {JOURNAL_PHRASES.map((phrase, index) => {
                    const unlocked = index < unlockedPhraseCount;
                    return (
                      <div className={unlocked ? "" : "is-locked"} key={phrase.id}>
                        <span className="phrase-number">{String(index + 1).padStart(2, "0")}</span>
                        <span>
                          <strong lang="es-MX">{unlocked ? phrase.es : "Phrase waiting…"}</strong>
                          <small>{unlocked ? phrase.en : "Keep changing the village"}</small>
                        </span>
                        {unlocked ? (
                          <button type="button" onClick={() => speak(phrase.es)} aria-label={`Hear ${phrase.es}`}>
                            <span className="speaker-icon" aria-hidden="true"><i /></span>
                          </button>
                        ) : (
                          <i className="lock-dot" aria-hidden="true" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}
