"use client";

import { useEffect, useState } from "react";
import {
  getEntity,
  ITEM_LABELS,
  JOURNAL_PHRASES,
  REALM_QUESTS,
  SKILL_LABELS,
  type RealmEntity,
  type RealmQuest
} from "@/lib/realm/content";
import {
  currentQuest,
  skillLevel,
  supportStageFor,
  xpToNextLevel,
  type RealmActionOption
} from "@/lib/realm/engine";
import type {
  EntityId,
  ItemId,
  RealmAction,
  RealmState,
  SkillId,
  SupportMode
} from "@/lib/realm/types";

export type RealmPanelTab =
  | "inventory"
  | "skills"
  | "phrases"
  | "settings"
  | null;

export type RealmPanelsProps = {
  state: RealmState;
  selectedEntityId: EntityId | null;
  actions: RealmActionOption[];
  tab: RealmPanelTab;
  now: number;
  onAction: (action: RealmAction) => void;
  onAdvance: () => void;
  onCloseSelection: () => void;
  onTabChange: (tab: RealmPanelTab) => void;
  onSpeak: (text: string) => void;
  onSupportChange: (mode: SupportMode) => void;
  onReset: () => void;
  onShare: () => void;
};

const OVERLAY_TABS: Array<{
  id: Exclude<RealmPanelTab, null>;
  label: string;
  shortLabel: string;
}> = [
  { id: "inventory", label: "Backpack", shortLabel: "Pack" },
  { id: "skills", label: "Skills", shortLabel: "Skills" },
  { id: "phrases", label: "Phrasebook", shortLabel: "Phrases" },
  { id: "settings", label: "Settings", shortLabel: "Settings" }
];

const MASTERY_LABELS = ["New", "Familiar", "Practicing", "Remembered"];

function Icon({
  name
}: {
  name: Exclude<RealmPanelTab, null> | "sound" | "close" | "compass";
}) {
  if (name === "sound") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 9v6h4l5 4V5L9 9H5Z" />
        <path d="M17 8.5c1.3 1.8 1.3 5.2 0 7M19.5 6c2.6 3.3 2.6 8.7 0 12" />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m7 7 10 10M17 7 7 17" />
      </svg>
    );
  }

  if (name === "compass") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="m14.7 9.3-1.4 4-4 1.4 1.4-4 4-1.4Z" />
      </svg>
    );
  }

  if (name === "inventory") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 7V5.8C8 4.8 8.9 4 10 4h4c1.1 0 2 .8 2 1.8V7M6 8.5C6 7.7 6.7 7 7.5 7h9c.8 0 1.5.7 1.5 1.5V20H6V8.5Z" />
        <path d="M8.5 13h7v4h-7z" />
      </svg>
    );
  }

  if (name === "skills") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 18 7.5-7.5M9 5l3 3-2.2 2.2L6.5 7 9 5ZM15 13l4 4-2 2-4-4" />
      </svg>
    );
  }

  if (name === "phrases") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5.5C5 4.7 5.7 4 6.5 4H12v15H6.5c-.8 0-1.5.7-1.5 1.5v-15ZM19 5.5c0-.8-.7-1.5-1.5-1.5H12v15h5.5c.8 0 1.5.7 1.5 1.5v-15Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </svg>
  );
}

function QuestProgress({ quest, state }: { quest: RealmQuest; state: RealmState }) {
  const current = Math.min(state.questProgress, quest.required);
  const percent = Math.round((current / quest.required) * 100);

  return (
    <div className="realm-quest-progress">
      <div className="realm-progress-copy">
        <span>{quest.instruction}</span>
        <strong>
          {current}/{quest.required} {quest.progressLabel}
        </strong>
      </div>
      <div
        className="realm-progress-track"
        role="progressbar"
        aria-label={`${quest.title} progress`}
        aria-valuemin={0}
        aria-valuemax={quest.required}
        aria-valuenow={current}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function PhraseCard({
  quest,
  state,
  englishVisible,
  onRevealEnglish,
  onSpeak
}: {
  quest: RealmQuest;
  state: RealmState;
  englishVisible: boolean;
  onRevealEnglish: () => void;
  onSpeak: (text: string) => void;
}) {
  const supportStage = supportStageFor(state, quest.phrase.id);
  const showEnglish = supportStage === 0 || englishVisible;
  const showGlosses = supportStage < 2;

  return (
    <section className="realm-phrase" aria-label="Current Spanish phrase">
      <div className="realm-phrase-topline">
        <span>{quest.speaker}</span>
        <button
          type="button"
          className="realm-icon-button"
          onClick={() => onSpeak(quest.phrase.es)}
          aria-label={`Hear: ${quest.phrase.es}`}
        >
          <Icon name="sound" />
        </button>
      </div>
      <p className="realm-spanish" lang="es-MX">
        {quest.phrase.es}
      </p>
      {showEnglish ? <p className="realm-english">{quest.phrase.en}</p> : null}
      {showGlosses && quest.phrase.glosses.length > 0 ? (
        <div className="realm-glosses" aria-label="Phrase hints">
          {quest.phrase.glosses.map((gloss) => (
            <span key={`${quest.id}-${gloss.es}`}>
              <b lang="es-MX">{gloss.es}</b>
              <small>{gloss.en}</small>
            </span>
          ))}
        </div>
      ) : null}
      {!showEnglish ? (
        <button
          type="button"
          className="realm-link-button"
          onClick={onRevealEnglish}
        >
          Show English
        </button>
      ) : null}
    </section>
  );
}

function InteractionArea({
  quest,
  state,
  selectedEntity,
  actionOptions,
  englishVisible,
  onAction,
  onAdvance,
  onDismissEntity
}: {
  quest: RealmQuest;
  state: RealmState;
  selectedEntity: RealmEntity | null;
  actionOptions: RealmActionOption[];
  englishVisible: boolean;
  onAction: (action: RealmAction) => void;
  onAdvance: () => void;
  onDismissEntity: () => void;
}) {
  const isTarget = selectedEntity
    ? quest.targetIds.includes(selectedEntity.id)
    : false;
  const showChoiceEnglish =
    supportStageFor(state, quest.phrase.id) === 0 || englishVisible;
  const showActionEnglish = showChoiceEnglish;

  if (state.questComplete) {
    return (
      <section className="realm-success" aria-live="polite">
        <span className="realm-success-mark" aria-hidden="true">
          ✓
        </span>
        <div>
          <small>World changed</small>
          <strong>{quest.success}</strong>
        </div>
        <button
          type="button"
          className="realm-primary-button"
          onClick={onAdvance}
        >
          {state.questIndex >= REALM_QUESTS.length - 1
            ? "Finish this chapter"
            : "Continue the journey"}
          <span aria-hidden="true">→</span>
        </button>
      </section>
    );
  }

  return (
    <section className="realm-interaction" aria-live="polite">
      {selectedEntity ? (
        <div className="realm-entity-heading">
          <div className={`realm-entity-seal realm-kind-${selectedEntity.kind}`} aria-hidden="true">
            {selectedEntity.spanishName.slice(0, 1)}
          </div>
          <div>
            <span lang="es-MX">{selectedEntity.spanishName}</span>
            <strong>{selectedEntity.name}</strong>
          </div>
          <button
            type="button"
            className="realm-icon-button realm-dismiss"
            onClick={onDismissEntity}
            aria-label={`Close ${selectedEntity.name}`}
          >
            <Icon name="close" />
          </button>
        </div>
      ) : (
        <div className="realm-map-prompt">
          <Icon name="compass" />
          <div>
            <strong>Explore the realm</strong>
            <span>{quest.instruction}</span>
          </div>
        </div>
      )}

      {selectedEntity && !isTarget ? (
        <p className="realm-entity-description">{selectedEntity.description}</p>
      ) : null}

      {selectedEntity && isTarget && quest.choices ? (
        <div className="realm-intents" aria-label="Choose what you mean">
          <span className="realm-section-label">Choose your intent</span>
          {quest.choices.map((choice, index) => (
            <button
              type="button"
              className="realm-intent-button"
              key={choice.id}
              onClick={() => onAction({ type: "choose", choiceId: choice.id })}
            >
              <small>{showChoiceEnglish ? choice.intent : `Respuesta ${index + 1}`}</small>
              <strong lang="es-MX">{choice.es}</strong>
              {showChoiceEnglish ? <span>{choice.en}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {selectedEntity && actionOptions.length > 0 && !(isTarget && quest.choices) ? (
        <div className="realm-action-list" aria-label={`${selectedEntity.name} actions`}>
          {actionOptions.map((option) => (
            <button
              type="button"
              className="realm-primary-button"
              key={option.id}
              disabled={!option.enabled}
              onClick={() => onAction(option.action)}
            >
              <span>
                {showActionEnglish ? <i>{option.intent}</i> : null}
                <b lang="es-MX">{option.es}</b>
                {showActionEnglish ? <small>{option.en}</small> : null}
              </span>
              {option.note ? <em>{option.note}</em> : null}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function FreeplayArea({
  selectedEntity,
  actionOptions,
  onAction,
  onDismissEntity
}: {
  selectedEntity: RealmEntity | null;
  actionOptions: RealmActionOption[];
  onAction: (action: RealmAction) => void;
  onDismissEntity: () => void;
}) {
  return (
    <section className="realm-interaction" aria-live="polite">
      {selectedEntity ? (
        <div className="realm-entity-heading">
          <div className={`realm-entity-seal realm-kind-${selectedEntity.kind}`} aria-hidden="true">
            {selectedEntity.spanishName.slice(0, 1)}
          </div>
          <div>
            <span lang="es-MX">{selectedEntity.spanishName}</span>
            <strong>{selectedEntity.name}</strong>
          </div>
          <button
            type="button"
            className="realm-icon-button realm-dismiss"
            onClick={onDismissEntity}
            aria-label={`Close ${selectedEntity.name}`}
          >
            <Icon name="close" />
          </button>
        </div>
      ) : (
        <div className="realm-map-prompt">
          <Icon name="compass" />
          <div>
            <strong>Your life in the valley</strong>
            <span>Farm the plots, trade with Rosa, cook with Nico, or gather wood.</span>
          </div>
        </div>
      )}

      {selectedEntity && actionOptions.length > 0 ? (
        <div className="realm-action-list" aria-label={`${selectedEntity.name} actions`}>
          {actionOptions.map((option) => (
            <button
              type="button"
              className="realm-primary-button"
              key={option.id}
              disabled={!option.enabled}
              onClick={() => onAction(option.action)}
            >
              <span>
                <i>{option.intent}</i>
                <b lang="es-MX">{option.es}</b>
                <small>{option.en}</small>
              </span>
              {option.note ? <em>{option.note}</em> : null}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function BackpackPanel({ state }: { state: RealmState }) {
  const itemIds = Object.keys(state.inventory) as ItemId[];

  return (
    <div className="realm-inventory-grid">
      {itemIds.map((itemId) => {
        const item = ITEM_LABELS[itemId];
        const quantity = state.inventory[itemId];
        return (
          <article className={quantity === 0 ? "is-empty" : ""} key={itemId}>
            <span className="realm-item-icon" aria-hidden="true">
              {item.icon}
            </span>
            <div>
              <strong lang="es-MX">{item.es}</strong>
              <small>{item.en}</small>
            </div>
            <b aria-label={`${quantity} ${item.en}`}>{quantity}</b>
          </article>
        );
      })}
    </div>
  );
}

function SkillsPanel({ state }: { state: RealmState }) {
  return (
    <div className="realm-skills-list">
      {(Object.keys(state.skills) as SkillId[]).map((skillId) => {
        const skill = state.skills[skillId];
        const label = SKILL_LABELS[skillId];
        const level = skillLevel(skill.xp);
        const progress = xpToNextLevel(skill.xp).percent;

        return (
          <article key={skillId}>
            <span className="realm-skill-icon" aria-hidden="true">
              {label.icon}
            </span>
            <div>
              <span lang="es-MX">{label.es}</span>
              <strong>{label.en}</strong>
              <div className="realm-mini-track" aria-hidden="true">
                <i style={{ width: `${progress}%` }} />
              </div>
            </div>
            <b>
              <small>Level</small>
              {level}
            </b>
          </article>
        );
      })}
    </div>
  );
}

function PhrasebookPanel({
  state,
  onSpeak
}: {
  state: RealmState;
  onSpeak: (text: string) => void;
}) {
  const discovered = new Set(state.discoveredPhraseIds);
  const phrases = JOURNAL_PHRASES.filter((phrase) => discovered.has(phrase.id));

  if (phrases.length === 0) {
    return (
      <div className="realm-empty-state">
        <Icon name="phrases" />
        <strong>Your phrasebook is waiting.</strong>
        <p>Meet someone in the valley to discover your first useful phrase.</p>
      </div>
    );
  }

  return (
    <div className="realm-phrase-list">
      {phrases.map((phrase) => {
        const mastery = state.phraseMastery[phrase.id];
        return (
          <article key={phrase.id}>
            <div>
              <strong lang="es-MX">{phrase.es}</strong>
              <span>{phrase.en}</span>
              <small>{MASTERY_LABELS[mastery?.stage ?? 0]}</small>
            </div>
            <button
              type="button"
              className="realm-icon-button"
              onClick={() => onSpeak(phrase.es)}
              aria-label={`Hear: ${phrase.es}`}
            >
              <Icon name="sound" />
            </button>
          </article>
        );
      })}
    </div>
  );
}

function SettingsPanel({
  state,
  onSupportChange,
  onReset,
  onShare
}: {
  state: RealmState;
  onSupportChange: (mode: SupportMode) => void;
  onReset: () => void;
  onShare: () => void;
}) {
  const modes: Array<{ id: SupportMode; title: string; copy: string }> = [
    {
      id: "gentle",
      title: "Gentle",
      copy: "Keep English close while Spanish becomes familiar."
    },
    {
      id: "adaptive",
      title: "Auto",
      copy: "Fade support phrase by phrase as your confidence grows."
    },
    {
      id: "bold",
      title: "Bold",
      copy: "Lead with Spanish and ask for help only when you want it."
    }
  ];

  return (
    <div className="realm-settings">
      <fieldset>
        <legend>Language support</legend>
        {modes.map((mode) => (
          <button
            type="button"
            key={mode.id}
            className={state.supportMode === mode.id ? "is-active" : ""}
            aria-pressed={state.supportMode === mode.id}
            onClick={() => onSupportChange(mode.id)}
          >
            <span>
              <strong>{mode.title}</strong>
              <small>{mode.copy}</small>
            </span>
            <i aria-hidden="true" />
          </button>
        ))}
      </fieldset>
      <div className="realm-audio-note">
        <Icon name="sound" />
        <p>
          Audio only plays when you tap a listen button. Captions remain visible.
        </p>
      </div>
      <button type="button" className="realm-settings-share" onClick={onShare}>
        <span><strong>Invite a friend</strong><small>Send them the 60-second Market Day challenge.</small></span>
        <b aria-hidden="true">↗</b>
      </button>
      <button type="button" className="realm-reset-button" onClick={onReset}>
        Start this realm again
      </button>
    </div>
  );
}

function RealmOverlay({
  tab,
  state,
  onTabChange,
  onSpeak,
  onSupportChange,
  onReset,
  onShare
}: Pick<
  RealmPanelsProps,
  | "tab"
  | "state"
  | "onTabChange"
  | "onSpeak"
  | "onSupportChange"
  | "onReset"
  | "onShare"
>) {
  useEffect(() => {
    if (!tab) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onTabChange(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onTabChange, tab]);

  if (!tab) return null;

  const title = OVERLAY_TABS.find((item) => item.id === tab)?.label;

  return (
    <div className="realm-overlay-backdrop" role="presentation">
      <section
        className="realm-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="realm-overlay-title"
      >
        <header>
          <div>
            <span>Luma journal</span>
            <h2 id="realm-overlay-title">{title}</h2>
          </div>
          <button
            type="button"
            className="realm-icon-button"
            autoFocus
            onClick={() => onTabChange(null)}
            aria-label={`Close ${title}`}
          >
            <Icon name="close" />
          </button>
        </header>

        <nav className="realm-overlay-tabs" aria-label="Journal sections">
          {OVERLAY_TABS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={tab === item.id ? "is-active" : ""}
              aria-pressed={tab === item.id}
              onClick={() => onTabChange(item.id)}
            >
              <Icon name={item.id} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="realm-overlay-content">
          {tab === "inventory" ? <BackpackPanel state={state} /> : null}
          {tab === "skills" ? <SkillsPanel state={state} /> : null}
          {tab === "phrases" ? (
            <PhrasebookPanel state={state} onSpeak={onSpeak} />
          ) : null}
          {tab === "settings" ? (
            <SettingsPanel
              state={state}
              onSupportChange={onSupportChange}
              onReset={onReset}
              onShare={onShare}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default function RealmPanels({
  state,
  selectedEntityId,
  actions,
  tab,
  now,
  onAction,
  onAdvance,
  onCloseSelection,
  onTabChange,
  onSpeak,
  onSupportChange,
  onReset,
  onShare
}: RealmPanelsProps) {
  const [englishVisible, setEnglishVisible] = useState(false);
  const quest = currentQuest(state);
  const selectedEntity = selectedEntityId ? getEntity(selectedEntityId) : null;
  const saveLabel =
    state.lastSavedAt > 0 && now - state.lastSavedAt < 5_000
      ? "Saved just now"
      : "Progress saved";

  useEffect(() => {
    setEnglishVisible(false);
  }, [state.questIndex, selectedEntityId]);

  return (
    <>
      <aside
        className={`realm-panel-shell ${selectedEntity || state.questComplete ? "is-engaged" : "is-resting"}`}
        aria-label="Adventure controls"
      >
        <div className="realm-sheet-handle" aria-hidden="true" />

        {quest ? (
          <>
            <header className="realm-quest-heading">
              <div>
                <span>{quest.chapter}</span>
                <h2>{quest.title}</h2>
              </div>
              <strong>
                {Math.min(state.questIndex + 1, REALM_QUESTS.length)}
                <small>/{REALM_QUESTS.length}</small>
              </strong>
            </header>
            <QuestProgress quest={quest} state={state} />
            <PhraseCard
              quest={quest}
              state={state}
              englishVisible={englishVisible}
              onRevealEnglish={() => setEnglishVisible(true)}
              onSpeak={onSpeak}
            />
            <InteractionArea
              quest={quest}
              state={state}
              selectedEntity={selectedEntity}
              actionOptions={actions}
              englishVisible={englishVisible}
              onAction={onAction}
              onAdvance={onAdvance}
              onDismissEntity={onCloseSelection}
            />
          </>
        ) : (
          <>
            <section className="realm-chapter-complete">
              <span aria-hidden="true">✦</span>
              <p>First chapter complete</p>
              <h2>The north road is open.</h2>
              <strong>You built a life here—and used Spanish to do it.</strong>
              <div className="realm-passport-card">
                <small>MY SPANISH PASSPORT</small>
                {REALM_QUESTS.filter((_, index) => [0, 1, 7, 9].includes(index)).map((item) => (
                  <span key={item.id}><b aria-hidden="true">✓</b>{item.capability}</span>
                ))}
              </div>
              <button
                type="button"
                className="realm-primary-button"
                onClick={onShare}
              >
                <span><strong>Share my Spanish passport</strong><small>Challenge a friend to Market Day</small></span>
                <em aria-hidden="true">↗</em>
              </button>
              <button
                type="button"
                className="realm-secondary-button realm-passport-review"
                onClick={() => onTabChange("phrases")}
              >
                Review what you can do
              </button>
            </section>
            <FreeplayArea
              selectedEntity={selectedEntity}
              actionOptions={actions}
              onAction={onAction}
              onDismissEntity={onCloseSelection}
            />
          </>
        )}

        {state.lastEvent ? (
          <div
            className={`realm-event realm-event-${state.lastEvent.kind}`}
            role="status"
          >
            <strong>{state.lastEvent.title}</strong>
            <span>{state.lastEvent.message}</span>
          </div>
        ) : null}

        <span className="realm-save-status">{saveLabel}</span>

        <nav className="realm-panel-nav" aria-label="Player menu">
          {OVERLAY_TABS.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-label={item.label}
              aria-pressed={tab === item.id}
              onClick={() => onTabChange(item.id)}
            >
              <Icon name={item.id} />
              <span>{item.shortLabel}</span>
            </button>
          ))}
        </nav>
      </aside>

      <RealmOverlay
        tab={tab}
        state={state}
        onTabChange={onTabChange}
        onSpeak={onSpeak}
        onSupportChange={onSupportChange}
        onReset={onReset}
        onShare={onShare}
      />

      <style jsx>{`
        :global(.realm-panel-shell),
        :global(.realm-overlay) {
          --ink: #203b35;
          --muted: #65736a;
          --cream: #f7f0dc;
          --paper: #efe2bf;
          --paper-deep: #e2cfa2;
          --green: #2f6b52;
          --green-dark: #1f4b3b;
          --gold: #d9a843;
          --terracotta: #b95f47;
          color: var(--ink);
          font-family: var(--font-body, ui-sans-serif, system-ui, sans-serif);
        }

        :global(.realm-panel-shell) {
          position: fixed;
          z-index: 30;
          inset: auto 0 0;
          max-height: min(58dvh, 560px);
          overflow: auto;
          overscroll-behavior: contain;
          padding: 10px 18px calc(82px + env(safe-area-inset-bottom));
          border: 1px solid rgba(69, 75, 49, 0.25);
          border-bottom: 0;
          border-radius: 28px 28px 0 0;
          background-color: var(--cream);
          background-image: radial-gradient(rgba(83, 70, 37, 0.07) 0.7px, transparent 0.7px),
            linear-gradient(145deg, rgba(255, 255, 255, 0.5), transparent 48%);
          background-size: 6px 6px, auto;
          box-shadow: 0 -18px 50px rgba(25, 41, 32, 0.24);
          scrollbar-width: thin;
          transition: max-height 220ms ease;
        }

        :global(.realm-panel-shell.is-resting) {
          max-height: min(45dvh, 410px);
        }

        :global(.realm-sheet-handle) {
          width: 46px;
          height: 5px;
          margin: 0 auto 12px;
          border-radius: 99px;
          background: rgba(32, 59, 53, 0.24);
        }

        :global(.realm-quest-heading) {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 16px;
        }

        :global(.realm-quest-heading span),
        :global(.realm-overlay header span),
        :global(.realm-section-label) {
          display: block;
          color: var(--terracotta);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        :global(.realm-quest-heading h2) {
          margin: 3px 0 0;
          font: 700 clamp(1.25rem, 5vw, 1.55rem) / 1.08 var(--font-display, ui-serif, Georgia, serif);
        }

        :global(.realm-quest-heading > strong) {
          display: grid;
          place-items: center;
          min-width: 48px;
          min-height: 48px;
          border: 1px solid rgba(71, 91, 68, 0.22);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.47);
          color: var(--green-dark);
          font-size: 1rem;
        }

        :global(.realm-quest-heading > strong small) {
          margin-left: 1px;
          color: var(--muted);
          font-size: 0.68rem;
        }

        :global(.realm-quest-progress) {
          margin-top: 12px;
        }

        :global(.realm-progress-copy) {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 7px;
          font-size: 0.82rem;
        }

        :global(.realm-progress-copy span) {
          color: var(--muted);
        }

        :global(.realm-progress-copy strong) {
          flex: none;
          font-size: 0.74rem;
        }

        :global(.realm-progress-track),
        :global(.realm-mini-track) {
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(40, 66, 55, 0.12);
        }

        :global(.realm-progress-track span),
        :global(.realm-mini-track i) {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, var(--green), #72a86f);
          transition: width 260ms ease;
        }

        :global(.realm-phrase) {
          position: relative;
          margin-top: 14px;
          padding: 15px 15px 14px;
          border: 1px solid rgba(83, 86, 53, 0.2);
          border-radius: 18px;
          background: rgba(255, 253, 244, 0.72);
          box-shadow: 0 8px 20px rgba(58, 65, 45, 0.06);
        }

        :global(.realm-phrase-topline) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 34px;
          color: var(--green);
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        :global(.realm-spanish) {
          margin: 3px 42px 0 0;
          font: 700 clamp(1.08rem, 4.5vw, 1.28rem) / 1.32 var(--font-display, ui-serif, Georgia, serif);
        }

        :global(.realm-english) {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 0.88rem;
          line-height: 1.4;
        }

        :global(.realm-icon-button) {
          display: inline-grid;
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          place-items: center;
          border: 1px solid rgba(47, 107, 82, 0.2);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.64);
          color: var(--green);
          cursor: pointer;
        }

        :global(.realm-icon-button svg),
        :global(.realm-panel-nav svg),
        :global(.realm-overlay-tabs svg),
        :global(.realm-empty-state svg),
        :global(.realm-audio-note svg),
        :global(.realm-map-prompt > svg) {
          width: 22px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        :global(.realm-glosses) {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 11px;
        }

        :global(.realm-glosses span) {
          display: grid;
          gap: 1px;
          padding: 6px 9px;
          border-radius: 9px;
          background: rgba(212, 230, 204, 0.65);
        }

        :global(.realm-glosses b) {
          font-size: 0.76rem;
        }

        :global(.realm-glosses small) {
          color: var(--muted);
          font-size: 0.65rem;
        }

        :global(.realm-link-button) {
          min-height: 44px;
          margin: 8px -8px -8px;
          padding: 8px;
          border: 0;
          background: transparent;
          color: var(--green);
          font: inherit;
          font-size: 0.82rem;
          font-weight: 800;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
        }

        :global(.realm-interaction),
        :global(.realm-success) {
          margin-top: 12px;
        }

        :global(.realm-entity-heading),
        :global(.realm-map-prompt) {
          display: flex;
          align-items: center;
          gap: 11px;
          min-height: 58px;
        }

        :global(.realm-entity-seal) {
          display: grid;
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          place-items: center;
          border-radius: 15px;
          background: #d7e4cd;
          color: var(--green-dark);
          font: 800 1.15rem var(--font-display, ui-serif, Georgia, serif);
        }

        :global(.realm-kind-npc) {
          background: #efd0b2;
          color: #7b4535;
        }

        :global(.realm-kind-tree),
        :global(.realm-kind-plot) {
          background: #cdddbd;
        }

        :global(.realm-entity-heading > div:nth-child(2)) {
          display: grid;
          min-width: 0;
        }

        :global(.realm-entity-heading > div:nth-child(2) span) {
          color: var(--green);
          font-weight: 800;
        }

        :global(.realm-entity-heading > div:nth-child(2) strong) {
          overflow: hidden;
          color: var(--muted);
          font-size: 0.77rem;
          font-weight: 600;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        :global(.realm-dismiss) {
          margin-left: auto;
        }

        :global(.realm-map-prompt > svg) {
          width: 32px;
          color: var(--terracotta);
        }

        :global(.realm-map-prompt div) {
          display: grid;
          gap: 2px;
        }

        :global(.realm-map-prompt span),
        :global(.realm-entity-description) {
          color: var(--muted);
          font-size: 0.82rem;
          line-height: 1.4;
        }

        :global(.realm-entity-description) {
          margin: 2px 0 0 59px;
        }

        :global(.realm-intents),
        :global(.realm-action-list) {
          display: grid;
          gap: 9px;
          margin-top: 10px;
        }

        :global(.realm-intent-button),
        :global(.realm-primary-button),
        :global(.realm-secondary-button) {
          width: 100%;
          min-height: 56px;
          border-radius: 15px;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        :global(.realm-intent-button) {
          display: grid;
          gap: 2px;
          padding: 11px 14px;
          border: 1px solid rgba(47, 107, 82, 0.2);
          background: rgba(255, 255, 255, 0.58);
          color: var(--ink);
        }

        :global(.realm-intent-button small) {
          color: var(--terracotta);
          font-size: 0.69rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        :global(.realm-intent-button strong) {
          font-size: 0.94rem;
        }

        :global(.realm-intent-button span) {
          color: var(--muted);
          font-size: 0.77rem;
        }

        :global(.realm-primary-button),
        :global(.realm-secondary-button) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 11px 15px;
          border: 1px solid transparent;
          font-weight: 800;
        }

        :global(.realm-primary-button) {
          background: linear-gradient(145deg, var(--green), var(--green-dark));
          color: #fffdf3;
          box-shadow: 0 7px 16px rgba(30, 74, 58, 0.18);
        }

        :global(.realm-secondary-button) {
          border-color: rgba(47, 107, 82, 0.25);
          background: rgba(255, 255, 255, 0.56);
          color: var(--green-dark);
        }

        :global(.realm-primary-button > span:first-child),
        :global(.realm-secondary-button > span:first-child) {
          display: grid;
          gap: 1px;
        }

        :global(.realm-primary-button small),
        :global(.realm-secondary-button small) {
          font-size: 0.73rem;
          font-weight: 500;
          opacity: 0.76;
        }

        :global(.realm-primary-button i) {
          margin-bottom: 2px;
          font-size: 0.67rem;
          font-style: normal;
          font-weight: 700;
          letter-spacing: 0.04em;
          opacity: 0.72;
          text-transform: uppercase;
        }

        :global(.realm-primary-button em),
        :global(.realm-secondary-button em) {
          font-size: 0.7rem;
          font-style: normal;
          opacity: 0.78;
        }

        :global(.realm-primary-button:disabled),
        :global(.realm-secondary-button:disabled) {
          cursor: not-allowed;
          filter: grayscale(0.7);
          opacity: 0.54;
        }

        :global(.realm-success) {
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: 10px;
          padding: 13px;
          border: 1px solid rgba(77, 130, 74, 0.28);
          border-radius: 17px;
          background: rgba(220, 235, 207, 0.64);
        }

        :global(.realm-success-mark) {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border-radius: 50%;
          background: var(--green);
          color: white;
          font-weight: 900;
        }

        :global(.realm-success > div) {
          display: grid;
          gap: 2px;
        }

        :global(.realm-success small) {
          color: var(--green);
          font-size: 0.68rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        :global(.realm-success > .realm-primary-button) {
          grid-column: 1 / -1;
        }

        :global(.realm-event) {
          display: grid;
          gap: 2px;
          margin-top: 10px;
          padding: 10px 12px;
          border-left: 4px solid var(--gold);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.45);
          font-size: 0.78rem;
        }

        :global(.realm-event span) {
          color: var(--muted);
        }

        :global(.realm-event-good) {
          border-color: var(--green);
        }

        :global(.realm-event-soft) {
          border-color: var(--terracotta);
        }

        :global(.realm-save-status) {
          display: block;
          margin: 10px 2px 0;
          color: var(--muted);
          font-size: 0.66rem;
          font-weight: 700;
          text-align: right;
        }

        :global(.realm-panel-nav) {
          position: fixed;
          z-index: 32;
          inset: auto 0 0;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          padding: 7px 10px calc(7px + env(safe-area-inset-bottom));
          border-top: 1px solid rgba(63, 72, 50, 0.15);
          background: rgba(247, 240, 220, 0.96);
          backdrop-filter: blur(16px);
        }

        :global(.realm-panel-nav button),
        :global(.realm-overlay-tabs button) {
          display: grid;
          min-width: 0;
          min-height: 54px;
          place-items: center;
          gap: 2px;
          border: 0;
          border-radius: 12px;
          background: transparent;
          color: var(--muted);
          font: inherit;
          font-size: 0.66rem;
          font-weight: 800;
          cursor: pointer;
        }

        :global(.realm-panel-nav button[aria-pressed="true"]),
        :global(.realm-overlay-tabs button.is-active) {
          background: rgba(47, 107, 82, 0.11);
          color: var(--green-dark);
        }

        :global(.realm-panel-nav svg) {
          width: 21px;
        }

        :global(.realm-chapter-complete) {
          display: grid;
          justify-items: center;
          padding: 24px 10px 10px;
          text-align: center;
        }

        :global(.realm-chapter-complete > span) {
          color: var(--gold);
          font-size: 2rem;
        }

        :global(.realm-chapter-complete p) {
          margin: 8px 0 3px;
          color: var(--terracotta);
          font-size: 0.74rem;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        :global(.realm-chapter-complete h2) {
          margin: 0;
          font: 700 1.6rem var(--font-display, ui-serif, Georgia, serif);
        }

        :global(.realm-chapter-complete > strong) {
          margin: 8px 0 14px;
          color: var(--muted);
          font-size: 0.85rem;
          font-weight: 500;
        }

        :global(.realm-passport-card) {
          width: 100%;
          display: grid;
          gap: 7px;
          margin-bottom: 12px;
          padding: 13px;
          border: 1px solid rgba(47, 107, 82, 0.2);
          border-radius: 15px 15px 7px 15px;
          background: rgba(255, 255, 255, 0.52);
          text-align: left;
        }

        :global(.realm-passport-card > small) {
          color: var(--terracotta);
          font-size: 0.65rem;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        :global(.realm-passport-card > span) {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--ink);
          font-size: 0.76rem;
          font-weight: 750;
        }

        :global(.realm-passport-card > span b) {
          display: grid;
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          place-items: center;
          border-radius: 50%;
          color: #fffdf3;
          background: var(--green);
          font-size: 0.65rem;
        }

        :global(.realm-passport-review) {
          min-height: 46px;
          margin-top: 8px;
          justify-content: center;
          text-align: center;
        }

        :global(.realm-overlay-backdrop) {
          position: fixed;
          z-index: 80;
          inset: 0;
          display: grid;
          align-items: end;
          background: rgba(17, 34, 28, 0.48);
          backdrop-filter: blur(4px);
        }

        :global(.realm-overlay) {
          max-height: min(84dvh, 760px);
          overflow: hidden;
          border: 1px solid rgba(75, 72, 44, 0.28);
          border-radius: 26px 26px 0 0;
          background: var(--cream);
          box-shadow: 0 -20px 60px rgba(15, 32, 25, 0.28);
        }

        :global(.realm-overlay > header) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 18px 12px;
        }

        :global(.realm-overlay h2) {
          margin: 2px 0 0;
          font: 700 1.55rem var(--font-display, ui-serif, Georgia, serif);
        }

        :global(.realm-overlay-tabs) {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
          padding: 0 12px 10px;
          border-bottom: 1px solid rgba(63, 72, 50, 0.15);
        }

        :global(.realm-overlay-tabs button span) {
          overflow: hidden;
          max-width: 100%;
          text-overflow: ellipsis;
        }

        :global(.realm-overlay-content) {
          max-height: calc(min(84dvh, 760px) - 154px);
          overflow: auto;
          padding: 16px 16px calc(22px + env(safe-area-inset-bottom));
          overscroll-behavior: contain;
        }

        :global(.realm-inventory-grid) {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        :global(.realm-inventory-grid article),
        :global(.realm-skills-list article),
        :global(.realm-phrase-list article) {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 68px;
          padding: 11px;
          border: 1px solid rgba(66, 82, 62, 0.16);
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.54);
        }

        :global(.realm-inventory-grid article.is-empty) {
          opacity: 0.48;
        }

        :global(.realm-item-icon),
        :global(.realm-skill-icon) {
          display: grid;
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          place-items: center;
          border-radius: 12px;
          background: rgba(215, 228, 205, 0.75);
          color: var(--green-dark);
          font-size: 1.2rem;
        }

        :global(.realm-inventory-grid article > div),
        :global(.realm-skills-list article > div) {
          display: grid;
          min-width: 0;
        }

        :global(.realm-inventory-grid article > div strong),
        :global(.realm-skills-list article > div > span) {
          overflow: hidden;
          font-size: 0.82rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        :global(.realm-inventory-grid article > div small),
        :global(.realm-skills-list article > div > strong) {
          color: var(--muted);
          font-size: 0.68rem;
        }

        :global(.realm-inventory-grid article > b) {
          margin-left: auto;
          font-size: 1rem;
        }

        :global(.realm-skills-list),
        :global(.realm-phrase-list) {
          display: grid;
          gap: 10px;
        }

        :global(.realm-skills-list article > div) {
          flex: 1;
        }

        :global(.realm-mini-track) {
          height: 5px;
          margin-top: 7px;
        }

        :global(.realm-skills-list article > b) {
          display: grid;
          justify-items: center;
          min-width: 46px;
          color: var(--green-dark);
          font-size: 1.22rem;
        }

        :global(.realm-skills-list article > b small) {
          color: var(--muted);
          font-size: 0.58rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        :global(.realm-phrase-list article > div) {
          display: grid;
          flex: 1;
          gap: 2px;
        }

        :global(.realm-phrase-list article strong) {
          font: 700 0.95rem var(--font-display, ui-serif, Georgia, serif);
        }

        :global(.realm-phrase-list article span) {
          color: var(--muted);
          font-size: 0.76rem;
        }

        :global(.realm-phrase-list article small) {
          width: fit-content;
          margin-top: 4px;
          padding: 3px 6px;
          border-radius: 6px;
          background: rgba(47, 107, 82, 0.1);
          color: var(--green);
          font-size: 0.62rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        :global(.realm-empty-state) {
          display: grid;
          justify-items: center;
          padding: 30px 20px;
          text-align: center;
        }

        :global(.realm-empty-state svg) {
          width: 42px;
          margin-bottom: 12px;
          color: var(--green);
        }

        :global(.realm-empty-state p) {
          max-width: 32ch;
          margin: 6px 0;
          color: var(--muted);
          font-size: 0.85rem;
        }

        :global(.realm-settings fieldset) {
          display: grid;
          gap: 9px;
          margin: 0;
          padding: 0;
          border: 0;
        }

        :global(.realm-settings legend) {
          margin-bottom: 9px;
          font: 700 1.05rem var(--font-display, ui-serif, Georgia, serif);
        }

        :global(.realm-settings fieldset button) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 68px;
          padding: 11px 13px;
          border: 1px solid rgba(66, 82, 62, 0.18);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.52);
          color: var(--ink);
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        :global(.realm-settings fieldset button > span) {
          display: grid;
          gap: 3px;
        }

        :global(.realm-settings fieldset button small) {
          color: var(--muted);
          font-size: 0.75rem;
          line-height: 1.35;
        }

        :global(.realm-settings fieldset button > i) {
          width: 20px;
          height: 20px;
          flex: 0 0 20px;
          border: 2px solid #8c968e;
          border-radius: 50%;
        }

        :global(.realm-settings fieldset button.is-active) {
          border-color: var(--green);
          background: rgba(215, 228, 205, 0.65);
        }

        :global(.realm-settings fieldset button.is-active > i) {
          border: 6px solid var(--green);
        }

        :global(.realm-audio-note) {
          display: flex;
          gap: 11px;
          margin-top: 16px;
          padding: 12px;
          border-radius: 13px;
          background: rgba(221, 211, 175, 0.45);
          color: var(--muted);
        }

        :global(.realm-audio-note svg) {
          width: 23px;
          flex: 0 0 23px;
          color: var(--green);
        }

        :global(.realm-audio-note p) {
          margin: 0;
          font-size: 0.78rem;
          line-height: 1.45;
        }

        :global(.realm-settings-share) {
          width: 100%;
          min-height: 58px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 12px;
          padding: 10px 13px;
          border: 1px solid rgba(47, 107, 82, 0.25);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.56);
          color: var(--green-dark);
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        :global(.realm-settings-share > span) {
          display: grid;
          gap: 2px;
        }

        :global(.realm-settings-share small) {
          color: var(--muted);
          font-size: 0.72rem;
          font-weight: 500;
        }

        :global(.realm-settings-share b) {
          font-size: 1.1rem;
        }

        :global(.realm-reset-button) {
          width: 100%;
          min-height: 50px;
          margin-top: 20px;
          border: 1px solid rgba(185, 95, 71, 0.32);
          border-radius: 13px;
          background: transparent;
          color: #944b3b;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        :global(button:focus-visible) {
          outline: 3px solid #f2bd51;
          outline-offset: 2px;
        }

        @media (min-width: 900px) {
          :global(.realm-panel-shell) {
            position: relative;
            inset: auto;
            width: min(390px, 32vw);
            height: 100%;
            max-height: none;
            padding: 22px 22px 92px;
            border: 1px solid rgba(69, 75, 49, 0.25);
            border-radius: 24px;
            box-shadow: 0 18px 55px rgba(25, 41, 32, 0.22);
          }

          :global(.realm-panel-shell.is-resting) {
            max-height: none;
          }

          :global(.realm-sheet-handle) {
            display: none;
          }

          :global(.realm-panel-nav) {
            position: absolute;
            inset: auto 14px 14px;
            padding: 4px;
            border: 1px solid rgba(63, 72, 50, 0.12);
            border-radius: 16px;
            background: rgba(255, 252, 241, 0.66);
            backdrop-filter: none;
          }

          :global(.realm-overlay-backdrop) {
            align-items: center;
            justify-items: center;
            padding: 24px;
          }

          :global(.realm-overlay) {
            width: min(720px, 86vw);
            border-radius: 25px;
          }

          :global(.realm-overlay-content) {
            padding: 20px 22px 24px;
          }

          :global(.realm-inventory-grid) {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          :global(.realm-progress-track span),
          :global(.realm-mini-track i) {
            transition: none;
          }
        }
      `}</style>
    </>
  );
}
