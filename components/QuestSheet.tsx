import { QUESTS } from "@/lib/game/content";
import type {
  GameAction,
  GameState,
  Quest,
  SupportStage
} from "@/lib/game/types";

type QuestSheetProps = {
  state: GameState;
  quest: Quest | null;
  supportStage: SupportStage;
  translationVisible: boolean;
  onRevealTranslation: () => void;
  onSpeak: (text: string) => void;
  onAction: (action: GameAction) => void;
  onAdvance: () => void;
  onOpenJournal: () => void;
};

const STAGE_LABELS = ["Paired", "Supported", "Target-led", "Recall"] as const;

function actionCopy(quest: Quest): string {
  if (quest.kind === "gather") return "Tap the glowing grove";
  if (quest.kind === "give") return "Tap Alma in the plaza";
  if (quest.kind === "buy") return "Tap el mercado";
  if (quest.kind === "place") return "Choose a plot on the map";
  return quest.instruction;
}

export default function QuestSheet({
  state,
  quest,
  supportStage,
  translationVisible,
  onRevealTranslation,
  onSpeak,
  onAction,
  onAdvance,
  onOpenJournal
}: QuestSheetProps) {
  if (!quest) {
    return (
      <aside className="quest-sheet quest-sheet-complete">
        <div className="sheet-handle" aria-hidden="true" />
        <p className="eyebrow">Morning one complete</p>
        <h2>The plaza feels like yours.</h2>
        <p className="complete-copy">
          You changed the village and used Spanish to do it. Your progress is
          saved on this device.
        </p>
        <button className="primary-action" type="button" onClick={onOpenJournal}>
          Open your phrasebook
        </button>
      </aside>
    );
  }

  const canShowEnglish = supportStage === 0 || translationVisible;
  const showGlosses = supportStage < 3 && quest.phrase.glosses;
  const isExpanded = quest.kind === "choice" || quest.kind === "build";

  return (
    <aside
      className={`quest-sheet ${isExpanded ? "quest-sheet-expanded" : ""} ${
        state.questComplete ? "quest-sheet-success" : ""
      }`}
      aria-live="polite"
    >
      <div className="sheet-handle" aria-hidden="true" />

      <div className="quest-meta">
        <span>{quest.chapter}</span>
        <span>
          Step {Math.min(state.questIndex + 1, QUESTS.length)} of {QUESTS.length}
        </span>
      </div>

      {state.questComplete ? (
        <div className="quest-success-content">
          <div className="success-mark" aria-hidden="true">
            <span />
          </div>
          <div>
            <p className="eyebrow">World changed</p>
            <h2>{quest.title}</h2>
          </div>
          <p>{quest.success}</p>
          <button className="primary-action" type="button" onClick={onAdvance}>
            {state.questIndex === QUESTS.length - 1 ? "Finish the morning" : "Continue"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : (
        <>
          <div className="speaker-row">
            <div className={`speaker-avatar speaker-${quest.speaker.toLowerCase()}`} aria-hidden="true">
              <i />
              <b />
            </div>
            <div className="speaker-copy">
              <strong>{quest.speaker}</strong>
              <span>{quest.speakerRole}</span>
            </div>
            <button
              className="round-control listen-control"
              type="button"
              aria-label={`Hear ${quest.speaker}'s Spanish phrase`}
              onClick={() => onSpeak(quest.phrase.es)}
            >
              <span className="speaker-icon" aria-hidden="true">
                <i />
              </span>
            </button>
          </div>

          <div className="phrase-block">
            <div className="phrase-stage">
              <span>{STAGE_LABELS[supportStage]}</span>
              <i />
            </div>
            <p className="target-phrase" lang="es-MX">
              {quest.phrase.es}
            </p>
            {canShowEnglish ? (
              <p className="native-phrase">{quest.phrase.en}</p>
            ) : null}
            {showGlosses ? (
              <div className="gloss-row" aria-label="Phrase meanings">
                {quest.phrase.glosses?.map((gloss) => (
                  <span key={`${quest.id}-${gloss.es}`}>
                    <b lang="es-MX">{gloss.es}</b>
                    <small>{gloss.en}</small>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="quest-actions">
            {quest.choices ? (
              <div className="choice-grid" aria-label="Response choices">
                {quest.choices.map((choice) => (
                  <button
                    key={choice.id}
                    className="choice-button"
                    type="button"
                    onClick={() =>
                      onAction({ type: "choice", target: choice.id })
                    }
                  >
                    <strong lang="es-MX">{choice.es}</strong>
                    {supportStage < 2 || translationVisible ? (
                      <span>{choice.en}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : quest.kind === "build" ? (
              <button
                className="primary-action build-action"
                type="button"
                onClick={() => onAction({ type: "build", target: "bench" })}
              >
                <span className="mini-hammer" aria-hidden="true" />
                Construir el banco
                <small>3 tablas</small>
              </button>
            ) : (
              <div className="map-instruction">
                <span className="instruction-pulse" aria-hidden="true" />
                <div>
                  <strong>{actionCopy(quest)}</strong>
                  {quest.required > 1 ? (
                    <small>
                      {state.questProgress} / {quest.required}
                    </small>
                  ) : (
                    <small>{quest.instruction}</small>
                  )}
                </div>
              </div>
            )}

            {!canShowEnglish ? (
              <button
                className="text-control"
                type="button"
                onClick={onRevealTranslation}
              >
                Show English
              </button>
            ) : null}
          </div>
        </>
      )}
    </aside>
  );
}
