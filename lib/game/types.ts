export type SupportMode = "gentle" | "adaptive" | "bold";

export type SupportStage = 0 | 1 | 2 | 3;

export type ResourceId = "board" | "apple" | "coin" | "flower";

export type QuestKind =
  | "choice"
  | "gather"
  | "give"
  | "build"
  | "buy"
  | "place";

export type GameAction = {
  type: QuestKind;
  target: string;
};

export type ResourceCost = Partial<Record<ResourceId, number>>;

export type Phrase = {
  es: string;
  en: string;
  glosses?: Array<{ es: string; en: string }>;
};

export type QuestChoice = {
  id: string;
  es: string;
  en: string;
};

export type Quest = {
  id: string;
  chapter: string;
  title: string;
  speaker: string;
  speakerRole: string;
  kind: QuestKind;
  target: string;
  required: number;
  phrase: Phrase;
  masteryKey: string;
  instruction: string;
  success: string;
  wrong: string;
  choices?: QuestChoice[];
  cost?: ResourceCost;
  requires?: ResourceCost;
  consume?: ResourceCost;
  reward?: ResourceCost;
};

export type ItemMastery = {
  seen: number;
  correct: number;
  unhintedCorrect: number;
  hints: number;
  stage: SupportStage;
  lastReviewedAt: number | null;
  dueAt: number | null;
};

export type GameState = {
  schemaVersion: 1;
  contentVersion: 1;
  revision: number;
  started: boolean;
  completed: boolean;
  questIndex: number;
  questProgress: number;
  questComplete: boolean;
  inventory: Record<ResourceId, number>;
  builtItems: string[];
  placements: string[];
  completedQuestIds: string[];
  hintedQuestIds: string[];
  mastery: Record<string, ItemMastery>;
  supportMode: SupportMode;
  lastSavedAt: number | null;
};

export type ActionOutcome = "wrong" | "progress" | "complete" | "ignored";

export type ActionResult = {
  state: GameState;
  outcome: ActionOutcome;
  message: string;
  delta?: {
    resource: ResourceId;
    amount: number;
  };
};
