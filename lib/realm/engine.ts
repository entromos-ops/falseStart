import {
  ENTITY_DEFINITIONS,
  ITEM_LABELS,
  PLOT_IDS,
  REALM_QUESTS,
  START_TILE,
  TREE_IDS,
  WORLD_SIZE,
  getQuest,
  type RealmChoice,
  type RealmQuest
} from "./content";
import type {
  ActionResult,
  EntityId,
  ItemId,
  PhraseMastery,
  PlotState,
  RealmAction,
  RealmState,
  SkillId,
  SupportMode,
  TilePoint
} from "./types";

export const CROP_GROW_MS = 18_000;
export const TREE_RESPAWN_MS = 12_000;

export type RealmActionOption = {
  id: string;
  intent: string;
  es: string;
  en: string;
  enabled: boolean;
  note?: string;
  action: RealmAction;
};

function emptyInventory(): Record<ItemId, number> {
  return {
    coin: 3,
    log: 0,
    seed: 0,
    carrot: 0,
    bread: 0,
    stew: 0,
    axe: 1,
    "watering-can": 1
  };
}

function emptySkills(): RealmState["skills"] {
  return {
    woodcutting: { xp: 0 },
    farming: { xp: 0 },
    cooking: { xp: 0 },
    trading: { xp: 0 }
  };
}

function emptyPlots(): PlotState[] {
  return PLOT_IDS.map((id) => ({
    id: id as PlotState["id"],
    stage: "untilled",
    plantedAt: null,
    wateredAt: null
  }));
}

export function createInitialRealm(now = Date.now()): RealmState {
  return {
    schemaVersion: 2,
    contentVersion: 1,
    started: false,
    completed: false,
    player: { ...START_TILE },
    questIndex: 0,
    questProgress: 0,
    questComplete: false,
    inventory: emptyInventory(),
    skills: emptySkills(),
    plots: emptyPlots(),
    treeReadyAt: {},
    world: {
      irrigationRepaired: false,
      marketRestored: false,
      northRoadOpen: false
    },
    supportMode: "adaptive",
    phraseMastery: {},
    discoveredPhraseIds: [],
    lastEvent: null,
    lastSavedAt: now
  };
}

function cloneRealm(state: RealmState): RealmState {
  return {
    ...state,
    player: { ...state.player },
    inventory: { ...state.inventory },
    skills: {
      woodcutting: { ...state.skills.woodcutting },
      farming: { ...state.skills.farming },
      cooking: { ...state.skills.cooking },
      trading: { ...state.skills.trading }
    },
    plots: state.plots.map((plot) => ({ ...plot })),
    treeReadyAt: { ...state.treeReadyAt },
    world: { ...state.world },
    phraseMastery: Object.fromEntries(
      Object.entries(state.phraseMastery).map(([key, value]) => [
        key,
        { ...value }
      ])
    ),
    discoveredPhraseIds: [...state.discoveredPhraseIds],
    lastEvent: state.lastEvent ? { ...state.lastEvent } : null
  };
}

function event(
  state: RealmState,
  kind: "good" | "soft" | "info",
  title: string,
  message: string,
  now: number
): RealmState {
  state.lastEvent = { kind, title, message, at: now };
  state.lastSavedAt = now;
  return state;
}

function result(
  state: RealmState,
  accepted: boolean,
  completedQuest: boolean,
  message: string
): ActionResult {
  return { state, accepted, completedQuest, message };
}

export function currentQuest(state: RealmState): RealmQuest | null {
  if (state.completed) return null;
  return getQuest(state.questIndex);
}

export function skillLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 45)) + 1);
}

export function xpForLevel(level: number): number {
  const normalized = Math.max(0, level - 1);
  return normalized * normalized * 45;
}

export function xpToNextLevel(xp: number): {
  level: number;
  current: number;
  required: number;
  percent: number;
} {
  const level = skillLevel(xp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const required = Math.max(1, ceiling - floor);
  const current = Math.max(0, xp - floor);
  return {
    level,
    current,
    required,
    percent: Math.min(100, Math.round((current / required) * 100))
  };
}

function addXp(state: RealmState, skill: SkillId | undefined, amount = 0) {
  if (!skill || amount <= 0) return;
  state.skills[skill].xp += amount;
}

function masteryFor(
  state: RealmState,
  key: string
): PhraseMastery {
  return (
    state.phraseMastery[key] ?? {
      correct: 0,
      wrong: 0,
      stage: 0,
      lastSeenAt: null
    }
  );
}

function recordMastery(
  state: RealmState,
  quest: RealmQuest,
  correct: boolean,
  now: number
) {
  const previous = masteryFor(state, quest.phrase.id);
  const nextCorrect = previous.correct + (correct ? 1 : 0);
  const nextWrong = previous.wrong + (correct ? 0 : 1);
  const nextStage = Math.min(
    3,
    Math.max(0, nextCorrect - Math.floor(nextWrong / 2))
  ) as 0 | 1 | 2 | 3;
  state.phraseMastery[quest.phrase.id] = {
    correct: nextCorrect,
    wrong: nextWrong,
    stage: nextStage,
    lastSeenAt: now
  };
  if (
    correct &&
    !state.discoveredPhraseIds.includes(quest.phrase.id)
  ) {
    state.discoveredPhraseIds.push(quest.phrase.id);
  }
}

function supportOffset(mode: SupportMode): number {
  if (mode === "gentle") return -1;
  if (mode === "bold") return 1;
  return 0;
}

export function supportStageFor(
  state: RealmState,
  phraseId: string
): 0 | 1 | 2 | 3 {
  const mastery = masteryFor(state, phraseId);
  const journeyStage = state.completed || state.questIndex >= 4 ? 1 : 0;
  const learnedStage = Math.max(mastery.stage, journeyStage);
  return Math.min(
    3,
    Math.max(0, learnedStage + supportOffset(state.supportMode))
  ) as 0 | 1 | 2 | 3;
}

export function languageBlendPercent(state: RealmState): number {
  const completedShare = state.completed
    ? 1
    : (state.questIndex + (state.questComplete ? 1 : 0)) / REALM_QUESTS.length;
  const masteryValues = Object.values(state.phraseMastery);
  const masteryShare = masteryValues.length
    ? masteryValues.reduce((sum, item) => sum + item.stage, 0) /
      (masteryValues.length * 3)
    : 0;
  return Math.round(10 + completedShare * 36 + masteryShare * 14);
}

export function refreshRealmState(
  state: RealmState,
  now = Date.now()
): RealmState {
  let changed = false;
  const next = cloneRealm(state);

  for (const [id, readyAt] of Object.entries(next.treeReadyAt)) {
    if (typeof readyAt === "number" && readyAt <= now) {
      delete next.treeReadyAt[id as EntityId];
      changed = true;
    }
  }

  next.plots = next.plots.map((plot) => {
    if (
      plot.stage === "watered" &&
      plot.wateredAt !== null &&
      now - plot.wateredAt >= CROP_GROW_MS
    ) {
      changed = true;
      return { ...plot, stage: "ready" };
    }
    return plot;
  });
  if (changed) next.lastSavedAt = now;
  return changed ? next : state;
}

function clampPoint(point: TilePoint): TilePoint {
  return {
    x: Math.max(0, Math.min(WORLD_SIZE.width - 1, Math.round(point.x))),
    y: Math.max(0, Math.min(WORLD_SIZE.height - 1, Math.round(point.y)))
  };
}

function completeQuestAction(
  state: RealmState,
  quest: RealmQuest,
  now: number
): boolean {
  if (state.questComplete) return false;
  state.questProgress = Math.min(quest.required, state.questProgress + 1);
  if (state.questProgress < quest.required) return false;
  state.questComplete = true;
  recordMastery(state, quest, true, now);
  event(state, "good", "World changed", quest.success, now);
  return true;
}

function fail(
  state: RealmState,
  quest: RealmQuest,
  message: string,
  now: number
): ActionResult {
  recordMastery(state, quest, false, now);
  event(state, "soft", "Try another way", message, now);
  return result(state, false, false, message);
}

function isTree(
  id: EntityId | undefined
): id is Extract<EntityId, `tree-${number}`> {
  return Boolean(id && TREE_IDS.includes(id));
}

function isPlot(id: EntityId | undefined): id is PlotState["id"] {
  return Boolean(id && PLOT_IDS.includes(id));
}

function plotById(state: RealmState, id: PlotState["id"]): PlotState {
  return state.plots.find((plot) => plot.id === id) as PlotState;
}

function applyChoice(
  state: RealmState,
  choiceId: string,
  now: number
): ActionResult {
  const quest = currentQuest(state);
  if (!quest?.choices) {
    return result(state, false, false, "There is no response to choose here.");
  }
  const choice = quest.choices.find((item) => item.id === choiceId);
  if (!choice || !choice.correct) {
    return fail(state, quest, quest.wrong, now);
  }

  if (quest.id === "meet-ines") {
    state.inventory.seed += 3;
  }
  if (quest.id === "trade-harvest") {
    if (state.inventory.carrot < 2) {
      return fail(state, quest, "Rosa needs two carrots for this trade.", now);
    }
    state.inventory.carrot -= 2;
    state.inventory.coin += 5;
    state.world.marketRestored = true;
    addXp(state, "trading", quest.xpPerAction ?? 0);
  }
  if (quest.id === "open-road") {
    if (state.inventory.stew < 1) {
      return fail(state, quest, "Bring the warm stew to the north gate.", now);
    }
    state.inventory.stew -= 1;
    state.world.northRoadOpen = true;
  }

  const completed = completeQuestAction(state, quest, now);
  return result(state, true, completed, quest.success);
}

function applyPerform(
  state: RealmState,
  actionId: string,
  entityId: EntityId | undefined,
  now: number
): ActionResult {
  state = refreshRealmState(state, now);
  if (state === undefined) state = createInitialRealm(now);
  const next = cloneRealm(state);
  const quest = currentQuest(next);

  if (actionId === "inspect" && entityId) {
    const entity = ENTITY_DEFINITIONS[entityId];
    event(next, "info", entity.spanishName, entity.description, now);
    return result(next, true, false, entity.description);
  }

  if (actionId === "chop-tree" && isTree(entityId)) {
    const readyAt = next.treeReadyAt[entityId] ?? 0;
    if (readyAt > now) {
      const seconds = Math.max(1, Math.ceil((readyAt - now) / 1000));
      const message = `This tree is growing back. Ready in ${seconds}s.`;
      event(next, "info", "The grove rests", message, now);
      return result(next, false, false, message);
    }
    next.inventory.log += 1;
    next.treeReadyAt[entityId] = now + TREE_RESPAWN_MS;
    addXp(next, "woodcutting", quest?.id === "gather-wood" ? 12 : 6);
    if (quest?.id === "gather-wood") {
      const completed = completeQuestAction(next, quest, now);
      if (!completed) {
        event(
          next,
          "info",
          "+1 tronco",
          `${next.questProgress} / ${quest.required} logs gathered`,
          now
        );
      }
      return result(next, true, completed, "You gather one log.");
    }
    event(next, "info", "+1 tronco", "Woodcutting XP gained.", now);
    return result(next, true, false, "You gather one log.");
  }

  if (next.completed && isPlot(entityId)) {
    const plot = plotById(next, entityId);
    if (actionId === "till-plot" && plot.stage === "untilled") {
      plot.stage = "tilled";
      addXp(next, "farming", 6);
      event(next, "info", "Tierra preparada", "The soil is ready for a seed.", now);
      return result(next, true, false, "You prepare the soil.");
    }
    if (actionId === "plant-seed" && plot.stage === "tilled" && next.inventory.seed > 0) {
      next.inventory.seed -= 1;
      plot.stage = "planted";
      plot.plantedAt = now;
      addXp(next, "farming", 7);
      event(next, "info", "Semilla plantada", "One carrot seed is in the soil.", now);
      return result(next, true, false, "You plant one seed.");
    }
    if (actionId === "water-plot" && plot.stage === "planted") {
      plot.stage = "watered";
      plot.wateredAt = now;
      addXp(next, "farming", 7);
      event(next, "info", "Planta regada", "The carrot is growing now.", now);
      return result(next, true, false, "You water the plant.");
    }
    if (actionId === "harvest-carrot" && plot.stage === "ready") {
      plot.stage = "untilled";
      plot.plantedAt = null;
      plot.wateredAt = null;
      next.inventory.carrot += 1;
      addXp(next, "farming", 14);
      event(next, "good", "+1 zanahoria", "Farming XP gained.", now);
      return result(next, true, false, "You harvest one carrot.");
    }
    event(next, "info", "La parcela", "This plot is not ready for that action yet.", now);
    return result(next, false, false, "This plot is not ready yet.");
  }

  if (
    next.completed &&
    (entityId === "rosa" || entityId === "market-stall") &&
    actionId === "buy-seed"
  ) {
    if (next.inventory.coin < 1) {
      event(next, "info", "Necesitas una moneda", "Sell a carrot before buying another seed.", now);
      return result(next, false, false, "You need one coin.");
    }
    next.inventory.coin -= 1;
    next.inventory.seed += 1;
    addXp(next, "trading", 4);
    event(next, "info", "+1 semilla", "Rosa sells you a carrot seed.", now);
    return result(next, true, false, "You buy one seed.");
  }

  if (
    next.completed &&
    (entityId === "rosa" || entityId === "market-stall") &&
    actionId === "sell-carrot"
  ) {
    if (next.inventory.carrot < 1) {
      event(next, "info", "Necesitas una zanahoria", "Harvest a carrot before selling one.", now);
      return result(next, false, false, "You need one carrot.");
    }
    next.inventory.carrot -= 1;
    next.inventory.coin += 2;
    addXp(next, "trading", 6);
    event(next, "good", "+2 monedas", "Rosa buys your carrot.", now);
    return result(next, true, false, "You sell one carrot.");
  }

  if (
    next.completed &&
    (entityId === "nico" || entityId === "stove") &&
    actionId === "cook-stew"
  ) {
    if (next.inventory.carrot < 1) {
      event(next, "info", "Necesitas una zanahoria", "Bring a fresh carrot to the stove.", now);
      return result(next, false, false, "You need one carrot.");
    }
    next.inventory.carrot -= 1;
    next.inventory.stew += 1;
    addXp(next, "cooking", 12);
    event(next, "good", "+1 guiso", "Cooking XP gained.", now);
    return result(next, true, false, "You cook a carrot stew.");
  }

  if (!quest) {
    event(next, "info", "The valley is open", "Keep exploring and growing your skills.", now);
    return result(next, false, false, "Keep exploring the valley.");
  }

  if (actionId !== quest.actionId) {
    return fail(next, quest, quest.wrong, now);
  }

  if (actionId === "repair-irrigation") {
    if (next.inventory.log < 3) return fail(next, quest, quest.wrong, now);
    next.inventory.log -= 3;
    next.world.irrigationRepaired = true;
    addXp(next, quest.skill, quest.xpPerAction);
  } else if (actionId === "till-plot" && isPlot(entityId)) {
    const plot = plotById(next, entityId);
    if (!next.world.irrigationRepaired || plot.stage !== "untilled") {
      return fail(next, quest, quest.wrong, now);
    }
    plot.stage = "tilled";
    addXp(next, quest.skill, quest.xpPerAction);
  } else if (actionId === "plant-seed" && isPlot(entityId)) {
    const plot = plotById(next, entityId);
    if (plot.stage !== "tilled" || next.inventory.seed < 1) {
      return fail(next, quest, quest.wrong, now);
    }
    next.inventory.seed -= 1;
    plot.stage = "planted";
    plot.plantedAt = now;
    addXp(next, quest.skill, quest.xpPerAction);
  } else if (actionId === "water-plot" && isPlot(entityId)) {
    const plot = plotById(next, entityId);
    if (plot.stage !== "planted") return fail(next, quest, quest.wrong, now);
    plot.stage = "watered";
    plot.wateredAt = now;
    addXp(next, quest.skill, quest.xpPerAction);
  } else if (actionId === "harvest-carrot" && isPlot(entityId)) {
    const plot = plotById(next, entityId);
    if (plot.stage !== "ready") return fail(next, quest, quest.wrong, now);
    plot.stage = "untilled";
    plot.plantedAt = null;
    plot.wateredAt = null;
    next.inventory.carrot += 1;
    addXp(next, quest.skill, quest.xpPerAction);
  } else if (actionId === "cook-stew") {
    if (next.inventory.carrot < 1) return fail(next, quest, quest.wrong, now);
    next.inventory.carrot -= 1;
    next.inventory.stew += 1;
    addXp(next, quest.skill, quest.xpPerAction);
  } else if (actionId === "greet-ines" || actionId === "trade-carrots" || actionId === "open-north-road") {
    return fail(next, quest, "Choose what you want to say.", now);
  } else {
    return fail(next, quest, quest.wrong, now);
  }

  const completed = completeQuestAction(next, quest, now);
  if (!completed) {
    event(
      next,
      "info",
      `${next.questProgress} / ${quest.required}`,
      quest.instruction,
      now
    );
  }
  return result(next, true, completed, completed ? quest.success : quest.instruction);
}

export function applyRealmAction(
  state: RealmState,
  action: RealmAction,
  fallbackNow = Date.now()
): ActionResult {
  const now = "now" in action && typeof action.now === "number"
    ? action.now
    : fallbackNow;
  const next = cloneRealm(refreshRealmState(state, now));

  if (action.type === "start") {
    const enteringForFirstTime = !next.started;
    next.started = true;
    if (action.marketDayComplete && enteringForFirstTime) {
      next.inventory.bread += 1;
      next.inventory.coin = Math.max(0, next.inventory.coin - 3);
    }
    event(
      next,
      "info",
      "Welcome to the valley",
      action.marketDayComplete
        ? "Your market bread is in your pack. Tap the ground to walk."
        : "Tap the ground to walk. Tap people and places to act.",
      now
    );
    return result(next, true, false, "Your journey begins.");
  }
  if (action.type === "move") {
    next.player = clampPoint(action.point);
    next.lastSavedAt = now;
    return result(next, true, false, "Moved.");
  }
  if (action.type === "set-support") {
    next.supportMode = action.mode;
    event(next, "info", "Language support updated", "English support will adapt from here.", now);
    return result(next, true, false, "Support updated.");
  }
  if (action.type === "advance") {
    const quest = currentQuest(next);
    if (!quest || !next.questComplete) {
      return result(next, false, false, "Finish the current task first.");
    }
    if (next.questIndex >= REALM_QUESTS.length - 1) {
      next.completed = true;
      next.world.northRoadOpen = true;
      event(next, "good", "The road is open", "The first valley chapter is complete. Your skills and farm remain playable.", now);
      return result(next, true, true, "The first valley chapter is complete.");
    }
    next.questIndex += 1;
    next.questProgress = 0;
    next.questComplete = false;
    const upcoming = currentQuest(next);
    event(next, "info", upcoming?.chapter ?? "A new task", upcoming?.description ?? "Keep exploring.", now);
    return result(next, true, false, upcoming?.description ?? "Keep exploring.");
  }
  if (action.type === "choose") {
    return applyChoice(next, action.choiceId, now);
  }
  if (action.type === "perform") {
    return applyPerform(next, action.actionId, action.entityId, now);
  }
  if (action.type === "interact") {
    const entity = ENTITY_DEFINITIONS[action.entityId];
    event(next, "info", entity.spanishName, entity.description, now);
    return result(next, true, false, entity.description);
  }
  return result(next, false, false, "Nothing happened.");
}

function choiceOptions(quest: RealmQuest): RealmActionOption[] {
  return (quest.choices ?? []).map((choice: RealmChoice) => ({
    id: choice.id,
    intent: choice.intent,
    es: choice.es,
    en: choice.en,
    enabled: true,
    action: { type: "choose", choiceId: choice.id }
  }));
}

export function getEntityActions(
  state: RealmState,
  entityId: EntityId,
  now = Date.now()
): RealmActionOption[] {
  const fresh = refreshRealmState(state, now);
  const quest = currentQuest(fresh);
  const relevant = Boolean(quest?.targetIds.includes(entityId));

  if (relevant && quest?.choices?.length) return choiceOptions(quest);

  if (isTree(entityId)) {
    const readyAt = fresh.treeReadyAt[entityId] ?? 0;
    const enabled = readyAt <= now;
    return [
      {
        id: "chop-tree",
        intent: "Chop the tree",
        es: "Talar el árbol",
        en: "Chop the tree",
        enabled,
        note: enabled ? "+1 tronco · Woodcutting XP" : `Ready in ${Math.ceil((readyAt - now) / 1000)}s`,
        action: { type: "perform", actionId: "chop-tree", entityId, now }
      }
    ];
  }

  if (fresh.completed && isPlot(entityId)) {
    const plot = plotById(fresh, entityId);
    const options: Record<PlotState["stage"], RealmActionOption> = {
      untilled: {
        id: "till-plot",
        intent: "Prepare this soil",
        es: "Preparar la tierra",
        en: "Prepare the soil",
        enabled: true,
        note: "+6 Farming XP",
        action: { type: "perform", actionId: "till-plot", entityId, now }
      },
      tilled: {
        id: "plant-seed",
        intent: "Plant one seed",
        es: "Plantar una semilla",
        en: "Plant one seed",
        enabled: fresh.inventory.seed > 0,
        note: fresh.inventory.seed > 0 ? "+7 Farming XP" : "Buy a seed from Rosa",
        action: { type: "perform", actionId: "plant-seed", entityId, now }
      },
      planted: {
        id: "water-plot",
        intent: "Water this plant",
        es: "Regar la planta",
        en: "Water the plant",
        enabled: true,
        note: "+7 Farming XP",
        action: { type: "perform", actionId: "water-plot", entityId, now }
      },
      watered: {
        id: "wait-for-crop",
        intent: "Let it grow",
        es: "Esperar la cosecha",
        en: "Wait for the crop",
        enabled: false,
        note: `Ready in ${Math.max(1, Math.ceil(cropTimeRemaining(plot, now) / 1000))}s`,
        action: { type: "perform", actionId: "inspect", entityId, now }
      },
      ready: {
        id: "harvest-carrot",
        intent: "Harvest this carrot",
        es: "Cosechar la zanahoria",
        en: "Harvest the carrot",
        enabled: true,
        note: "+14 Farming XP",
        action: { type: "perform", actionId: "harvest-carrot", entityId, now }
      }
    };
    return [options[plot.stage]];
  }

  if (fresh.completed && (entityId === "rosa" || entityId === "market-stall")) {
    return [
      {
        id: "buy-seed",
        intent: "Buy one seed",
        es: "Quiero comprar una semilla",
        en: "I want to buy one seed",
        enabled: fresh.inventory.coin > 0,
        note: "1 moneda · +4 Trading XP",
        action: { type: "perform", actionId: "buy-seed", entityId, now }
      },
      {
        id: "sell-carrot",
        intent: "Sell one carrot",
        es: "Quiero vender una zanahoria",
        en: "I want to sell one carrot",
        enabled: fresh.inventory.carrot > 0,
        note: "+2 monedas · +6 Trading XP",
        action: { type: "perform", actionId: "sell-carrot", entityId, now }
      }
    ];
  }

  if (fresh.completed && (entityId === "nico" || entityId === "stove")) {
    return [
      {
        id: "cook-stew",
        intent: "Cook a carrot stew",
        es: "Cocinar un guiso de zanahoria",
        en: "Cook a carrot stew",
        enabled: fresh.inventory.carrot > 0,
        note: "+12 Cooking XP",
        action: { type: "perform", actionId: "cook-stew", entityId, now }
      }
    ];
  }

  if (relevant && quest) {
    const labels: Record<string, { intent: string; es: string; en: string }> = {
      "repair-irrigation": { intent: "Repair the channel", es: "Reparar el canal", en: "Repair the channel" },
      "till-plot": { intent: "Prepare this soil", es: "Preparar la tierra", en: "Prepare the soil" },
      "plant-seed": { intent: "Plant one seed", es: "Plantar una semilla", en: "Plant one seed" },
      "water-plot": { intent: "Water this plant", es: "Regar la planta", en: "Water the plant" },
      "harvest-carrot": { intent: "Harvest this carrot", es: "Cosechar la zanahoria", en: "Harvest the carrot" },
      "cook-stew": { intent: "Cook the stew", es: "Cocinar el guiso", en: "Cook the stew" }
    };
    const label = labels[quest.actionId] ?? {
      intent: quest.title,
      es: quest.phrase.es,
      en: quest.phrase.en
    };
    return [
      {
        id: quest.actionId,
        ...label,
        enabled: true,
        action: { type: "perform", actionId: quest.actionId, entityId, now }
      }
    ];
  }

  const entity = ENTITY_DEFINITIONS[entityId];
  return [
    {
      id: "inspect",
      intent: entity.kind === "npc" ? `Talk to ${entity.name}` : `Inspect ${entity.name}`,
      es: entity.kind === "npc" ? `Hablar con ${entity.name}` : "Mirar",
      en: entity.kind === "npc" ? `Talk to ${entity.name}` : "Inspect",
      enabled: true,
      note: entity.description,
      action: { type: "perform", actionId: "inspect", entityId, now }
    }
  ];
}

export function relevantInventory(state: RealmState): ItemId[] {
  const quest = currentQuest(state);
  if (!quest) return ["coin", "stew", "carrot"];
  if (quest.id === "gather-wood" || quest.id === "repair-irrigation") return ["log", "axe"];
  if (quest.id === "plant-seeds") return ["seed"];
  if (quest.id === "water-crops") return ["watering-can"];
  if (quest.id === "harvest-crops" || quest.id === "trade-harvest") return ["carrot", "coin"];
  if (quest.id === "cook-stew" || quest.id === "open-road") return ["carrot", "stew"];
  return ["coin"];
}

export function itemCountLabel(state: RealmState, id: ItemId): string {
  const amount = state.inventory[id];
  const label = ITEM_LABELS[id];
  return `${amount} ${label.es}${amount === 1 ? "" : "s"}`;
}

export function cropTimeRemaining(plot: PlotState, now = Date.now()): number {
  if (plot.stage === "ready") return 0;
  if (plot.stage !== "watered" || plot.wateredAt === null) return CROP_GROW_MS;
  return Math.max(0, CROP_GROW_MS - (now - plot.wateredAt));
}

export function serializeRealm(state: RealmState, now = Date.now()): string {
  return JSON.stringify({ ...state, lastSavedAt: now });
}

export function parseRealm(raw: string | null, now = Date.now()): RealmState {
  if (!raw) return createInitialRealm(now);
  try {
    const value = JSON.parse(raw) as Partial<RealmState>;
    if (value.schemaVersion !== 2 || value.contentVersion !== 1) {
      return createInitialRealm(now);
    }
    const initial = createInitialRealm(now);
    const parsed: RealmState = {
      ...initial,
      ...value,
      player: { ...initial.player, ...value.player },
      inventory: { ...initial.inventory, ...value.inventory },
      skills: {
        woodcutting: { ...initial.skills.woodcutting, ...value.skills?.woodcutting },
        farming: { ...initial.skills.farming, ...value.skills?.farming },
        cooking: { ...initial.skills.cooking, ...value.skills?.cooking },
        trading: { ...initial.skills.trading, ...value.skills?.trading }
      },
      plots:
        Array.isArray(value.plots) && value.plots.length === 3
          ? value.plots.map((plot, index) => ({
              ...initial.plots[index],
              ...plot
            }))
          : initial.plots,
      treeReadyAt: { ...value.treeReadyAt },
      world: { ...initial.world, ...value.world },
      phraseMastery: { ...value.phraseMastery },
      discoveredPhraseIds: Array.isArray(value.discoveredPhraseIds)
        ? value.discoveredPhraseIds.filter((id): id is string => typeof id === "string")
        : [],
      lastEvent: value.lastEvent ?? null,
      lastSavedAt: typeof value.lastSavedAt === "number" ? value.lastSavedAt : now
    };
    return refreshRealmState(parsed, now);
  } catch {
    return createInitialRealm(now);
  }
}
