import { MASTERY_KEYS, QUESTS } from "./content";
import type {
  ActionResult,
  GameAction,
  GameState,
  ItemMastery,
  Quest,
  ResourceCost,
  ResourceId,
  SupportMode,
  SupportStage
} from "./types";

const SAVE_INTERVALS = [
  5 * 60_000,
  4 * 60 * 60_000,
  24 * 60 * 60_000,
  3 * 24 * 60 * 60_000
];

function blankMastery(): ItemMastery {
  return {
    seen: 0,
    correct: 0,
    unhintedCorrect: 0,
    hints: 0,
    stage: 0,
    lastReviewedAt: null,
    dueAt: null
  };
}

export function createInitialState(): GameState {
  return {
    schemaVersion: 1,
    contentVersion: 1,
    revision: 0,
    started: false,
    completed: false,
    questIndex: 0,
    questProgress: 0,
    questComplete: false,
    inventory: {
      board: 0,
      apple: 0,
      coin: 3,
      flower: 0
    },
    builtItems: [],
    placements: [],
    completedQuestIds: [],
    hintedQuestIds: [],
    mastery: {},
    supportMode: "adaptive",
    lastSavedAt: null
  };
}

export function startGame(state: GameState): GameState {
  if (state.started) return state;
  return { ...state, started: true, revision: state.revision + 1 };
}

export function currentQuest(state: GameState): Quest | null {
  return QUESTS[state.questIndex] ?? null;
}

function hasResources(state: GameState, resources?: ResourceCost): boolean {
  if (!resources) return true;
  return Object.entries(resources).every(
    ([resource, amount]) =>
      state.inventory[resource as ResourceId] >= (amount ?? 0)
  );
}

function changeResources(
  inventory: GameState["inventory"],
  resources: ResourceCost | undefined,
  direction: 1 | -1
): GameState["inventory"] {
  const next = { ...inventory };
  if (!resources) return next;
  for (const [resource, amount] of Object.entries(resources)) {
    const key = resource as ResourceId;
    next[key] = Math.max(0, next[key] + direction * (amount ?? 0));
  }
  return next;
}

function recordSuccess(state: GameState, quest: Quest, now: number): GameState {
  const existing = state.mastery[quest.masteryKey] ?? blankMastery();
  const usedHint = state.hintedQuestIds.includes(quest.id);
  const unhintedCorrect = existing.unhintedCorrect + (usedHint ? 0 : 1);
  const stage = Math.min(3, unhintedCorrect) as SupportStage;
  const interval = SAVE_INTERVALS[Math.min(stage, SAVE_INTERVALS.length - 1)];

  return {
    ...state,
    mastery: {
      ...state.mastery,
      [quest.masteryKey]: {
        ...existing,
        seen: existing.seen + 1,
        correct: existing.correct + 1,
        unhintedCorrect,
        stage,
        lastReviewedAt: now,
        dueAt: now + interval
      }
    }
  };
}

function completeQuest(state: GameState, quest: Quest, now: number): GameState {
  if (state.questComplete || state.completedQuestIds.includes(quest.id)) {
    return state;
  }

  let inventory = changeResources(state.inventory, quest.consume, -1);
  inventory = changeResources(inventory, quest.reward, 1);

  const withWorldChange: GameState = {
    ...state,
    inventory,
    questComplete: true,
    completedQuestIds: [...state.completedQuestIds, quest.id],
    revision: state.revision + 1,
    builtItems:
      quest.kind === "build" && !state.builtItems.includes(quest.target)
        ? [...state.builtItems, quest.target]
        : state.builtItems,
    placements:
      quest.kind === "place" && !state.placements.includes(quest.target)
        ? [...state.placements, quest.target]
        : state.placements
  };

  return recordSuccess(withWorldChange, quest, now);
}

function wrong(state: GameState, quest: Quest): ActionResult {
  return { state, outcome: "wrong", message: quest.wrong };
}

export function applyQuestAction(
  state: GameState,
  action: GameAction,
  now = Date.now()
): ActionResult {
  const quest = currentQuest(state);
  if (!state.started || state.completed || !quest || state.questComplete) {
    return { state, outcome: "ignored", message: "Nothing changed." };
  }

  if (action.type !== quest.kind || action.target !== quest.target) {
    return wrong(state, quest);
  }

  if (!hasResources(state, quest.requires)) {
    return wrong(state, quest);
  }

  if (quest.kind === "gather") {
    const nextProgress = Math.min(quest.required, state.questProgress + 1);
    const resource = quest.target as ResourceId;
    const inventory = {
      ...state.inventory,
      [resource]: state.inventory[resource] + 1
    };
    let nextState: GameState = {
      ...state,
      inventory,
      questProgress: nextProgress,
      revision: state.revision + 1
    };
    if (nextProgress >= quest.required) {
      nextState = completeQuest(nextState, quest, now);
    }
    return {
      state: nextState,
      outcome: nextProgress >= quest.required ? "complete" : "progress",
      message:
        nextProgress >= quest.required
          ? quest.success
          : `${nextProgress} / ${quest.required} tablas`,
      delta: { resource, amount: 1 }
    };
  }

  if (quest.kind === "buy") {
    if (!hasResources(state, quest.cost)) return wrong(state, quest);
    let inventory = changeResources(state.inventory, quest.cost, -1);
    const resource = quest.target as ResourceId;
    inventory = { ...inventory, [resource]: inventory[resource] + 1 };
    const nextProgress = Math.min(quest.required, state.questProgress + 1);
    let nextState: GameState = {
      ...state,
      inventory,
      questProgress: nextProgress,
      revision: state.revision + 1
    };
    if (nextProgress >= quest.required) {
      nextState = completeQuest(nextState, quest, now);
    }
    return {
      state: nextState,
      outcome: nextProgress >= quest.required ? "complete" : "progress",
      message:
        nextProgress >= quest.required
          ? quest.success
          : `${nextProgress} / ${quest.required} manzanas`,
      delta: { resource, amount: 1 }
    };
  }

  if (quest.kind === "build") {
    if (!hasResources(state, quest.cost)) return wrong(state, quest);
    const nextState = completeQuest(
      { ...state, inventory: changeResources(state.inventory, quest.cost, -1) },
      quest,
      now
    );
    return { state: nextState, outcome: "complete", message: quest.success };
  }

  const nextState = completeQuest(state, quest, now);
  return { state: nextState, outcome: "complete", message: quest.success };
}

export function advanceQuest(state: GameState): GameState {
  if (!state.questComplete) return state;
  const nextIndex = state.questIndex + 1;
  return {
    ...state,
    questIndex: nextIndex,
    questProgress: 0,
    questComplete: false,
    completed: nextIndex >= QUESTS.length,
    revision: state.revision + 1
  };
}

export function revealHint(state: GameState): GameState {
  const quest = currentQuest(state);
  if (!quest || state.hintedQuestIds.includes(quest.id)) return state;
  const existing = state.mastery[quest.masteryKey] ?? blankMastery();
  return {
    ...state,
    hintedQuestIds: [...state.hintedQuestIds, quest.id],
    mastery: {
      ...state.mastery,
      [quest.masteryKey]: {
        ...existing,
        seen: existing.seen + 1,
        hints: existing.hints + 1
      }
    },
    revision: state.revision + 1
  };
}

export function setSupportMode(state: GameState, mode: SupportMode): GameState {
  if (state.supportMode === mode) return state;
  return { ...state, supportMode: mode, revision: state.revision + 1 };
}

export function selectSupportStage(
  state: GameState,
  masteryKey: string
): SupportStage {
  const base = state.mastery[masteryKey]?.stage ?? 0;
  if (state.supportMode === "gentle") {
    return Math.max(0, base - 1) as SupportStage;
  }
  if (state.supportMode === "bold") {
    return Math.min(3, base + 1) as SupportStage;
  }
  return base;
}

export function immersionPercent(state: GameState): number {
  const completedShare = state.completedQuestIds.length / QUESTS.length;
  const masteryShare =
    MASTERY_KEYS.reduce(
      (sum, key) => sum + (state.mastery[key]?.stage ?? 0),
      0
    ) /
    (MASTERY_KEYS.length * 3);
  // A single morning should make the world noticeably more Spanish without
  // pretending the learner has completed a language. Future chapters and
  // delayed reviews fill the remaining blend.
  return Math.min(100, Math.round(8 + completedShare * 30 + masteryShare * 20));
}

export function knownPhraseCount(state: GameState): number {
  return Object.values(state.mastery).filter((item) => item.correct > 0).length;
}

export function serializeGame(state: GameState, now = Date.now()): string {
  return JSON.stringify({ ...state, lastSavedAt: now });
}

function isSupportMode(value: unknown): value is SupportMode {
  return value === "gentle" || value === "adaptive" || value === "bold";
}

export function parseSavedGame(raw: string | null): GameState {
  if (!raw) return createInitialState();
  try {
    const value = JSON.parse(raw) as Partial<GameState>;
    if (value.schemaVersion !== 1 || value.contentVersion !== 1) {
      return createInitialState();
    }
    const initial = createInitialState();
    return {
      ...initial,
      ...value,
      inventory: { ...initial.inventory, ...(value.inventory ?? {}) },
      builtItems: Array.isArray(value.builtItems) ? value.builtItems : [],
      placements: Array.isArray(value.placements) ? value.placements : [],
      completedQuestIds: Array.isArray(value.completedQuestIds)
        ? value.completedQuestIds.filter(
            (id): id is string => typeof id === "string"
          )
        : [],
      hintedQuestIds: Array.isArray(value.hintedQuestIds)
        ? value.hintedQuestIds.filter(
            (id): id is string => typeof id === "string"
          )
        : [],
      mastery:
        value.mastery && typeof value.mastery === "object" ? value.mastery : {},
      supportMode: isSupportMode(value.supportMode)
        ? value.supportMode
        : "adaptive",
      questIndex: Math.max(
        0,
        Math.min(QUESTS.length, Number(value.questIndex) || 0)
      ),
      questProgress: Math.max(0, Number(value.questProgress) || 0),
      revision: Math.max(0, Number(value.revision) || 0)
    };
  } catch {
    return createInitialState();
  }
}
