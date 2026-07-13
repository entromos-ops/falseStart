export type SupportMode = "gentle" | "adaptive" | "bold";

export type SkillId = "woodcutting" | "farming" | "cooking" | "trading";

export type ItemId =
  | "coin"
  | "log"
  | "seed"
  | "carrot"
  | "bread"
  | "stew"
  | "axe"
  | "watering-can";

export type PlotStage = "untilled" | "tilled" | "planted" | "watered" | "ready";

export type EntityId =
  | "ines"
  | "rosa"
  | "nico"
  | "irrigation-gate"
  | "well"
  | "market-stall"
  | "stove"
  | "north-gate"
  | "bank-chest"
  | "tree-1"
  | "tree-2"
  | "tree-3"
  | "tree-4"
  | "plot-1"
  | "plot-2"
  | "plot-3";

export type QuestId =
  | "meet-ines"
  | "gather-wood"
  | "repair-irrigation"
  | "till-soil"
  | "plant-seeds"
  | "water-crops"
  | "harvest-crops"
  | "trade-harvest"
  | "cook-stew"
  | "open-road";

export type TilePoint = {
  x: number;
  y: number;
};

export type SkillProgress = {
  xp: number;
};

export type PlotState = {
  id: Extract<EntityId, `plot-${number}`>;
  stage: PlotStage;
  plantedAt: number | null;
  wateredAt: number | null;
};

export type PhraseMastery = {
  correct: number;
  wrong: number;
  stage: 0 | 1 | 2 | 3;
  lastSeenAt: number | null;
};

export type RealmEvent = {
  kind: "good" | "soft" | "info";
  title: string;
  message: string;
  at: number;
};

export type RealmState = {
  schemaVersion: 2;
  contentVersion: 1;
  started: boolean;
  completed: boolean;
  player: TilePoint;
  questIndex: number;
  questProgress: number;
  questComplete: boolean;
  inventory: Record<ItemId, number>;
  skills: Record<SkillId, SkillProgress>;
  plots: PlotState[];
  treeReadyAt: Partial<Record<EntityId, number>>;
  world: {
    irrigationRepaired: boolean;
    marketRestored: boolean;
    northRoadOpen: boolean;
  };
  supportMode: SupportMode;
  phraseMastery: Record<string, PhraseMastery>;
  discoveredPhraseIds: string[];
  lastEvent: RealmEvent | null;
  lastSavedAt: number;
};

export type RealmAction =
  | { type: "start"; marketDayComplete?: boolean }
  | { type: "move"; point: TilePoint }
  | { type: "interact"; entityId: EntityId; now?: number }
  | { type: "choose"; choiceId: string; now?: number }
  | { type: "perform"; actionId: string; entityId?: EntityId; now?: number }
  | { type: "advance"; now?: number }
  | { type: "set-support"; mode: SupportMode };

export type ActionResult = {
  state: RealmState;
  accepted: boolean;
  completedQuest: boolean;
  message: string;
};
