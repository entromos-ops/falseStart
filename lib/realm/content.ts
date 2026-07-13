import type {
  EntityId,
  ItemId,
  QuestId,
  SkillId,
  TilePoint
} from "./types";

export type RealmPhrase = {
  id: string;
  es: string;
  en: string;
  glosses: Array<{ es: string; en: string }>;
};

export type RealmChoice = {
  id: string;
  intent: string;
  es: string;
  en: string;
  correct: boolean;
};

export type RealmQuest = {
  id: QuestId;
  chapter: string;
  title: string;
  speaker: string;
  description: string;
  targetIds: EntityId[];
  actionId: string;
  required: number;
  phrase: RealmPhrase;
  choices?: RealmChoice[];
  instruction: string;
  progressLabel: string;
  success: string;
  wrong: string;
  capability: string;
  skill?: SkillId;
  xpPerAction?: number;
};

export type RealmEntity = {
  id: EntityId;
  kind: "npc" | "tree" | "plot" | "station" | "landmark" | "gate";
  name: string;
  spanishName: string;
  description: string;
  tile: TilePoint;
};

export const WORLD_SIZE = { width: 24, height: 18 } as const;
export const START_TILE: TilePoint = { x: 11, y: 11 };

export const ENTITY_DEFINITIONS: Record<EntityId, RealmEntity> = {
  ines: {
    id: "ines",
    kind: "npc",
    name: "Inés",
    spanishName: "La agricultora",
    description: "A patient farmer restoring the old north field.",
    tile: { x: 8, y: 11 }
  },
  rosa: {
    id: "rosa",
    kind: "npc",
    name: "Rosa",
    spanishName: "La comerciante",
    description: "The market keeper who knows the value of a good harvest.",
    tile: { x: 16, y: 8 }
  },
  nico: {
    id: "nico",
    kind: "npc",
    name: "Nico",
    spanishName: "El cocinero",
    description: "The inn cook, always looking for something fresh.",
    tile: { x: 13, y: 5 }
  },
  "irrigation-gate": {
    id: "irrigation-gate",
    kind: "landmark",
    name: "Broken irrigation gate",
    spanishName: "El canal de riego",
    description: "Three sturdy logs could make the water flow again.",
    tile: { x: 6, y: 12 }
  },
  well: {
    id: "well",
    kind: "landmark",
    name: "Village well",
    spanishName: "El pozo",
    description: "Clear water for the fields and kitchen.",
    tile: { x: 10, y: 9 }
  },
  "market-stall": {
    id: "market-stall",
    kind: "station",
    name: "Market stall",
    spanishName: "El mercado",
    description: "Trade farm goods with Rosa.",
    tile: { x: 17, y: 8 }
  },
  stove: {
    id: "stove",
    kind: "station",
    name: "Inn stove",
    spanishName: "La cocina",
    description: "A warm hearth for simple village recipes.",
    tile: { x: 13, y: 4 }
  },
  "north-gate": {
    id: "north-gate",
    kind: "gate",
    name: "North road",
    spanishName: "El camino al norte",
    description: "A closed road leading beyond the valley.",
    tile: { x: 11, y: 1 }
  },
  "bank-chest": {
    id: "bank-chest",
    kind: "station",
    name: "Storage chest",
    spanishName: "El baúl",
    description: "A future home for the things you collect.",
    tile: { x: 10, y: 6 }
  },
  "tree-1": {
    id: "tree-1",
    kind: "tree",
    name: "Pine tree",
    spanishName: "El pino",
    description: "A harvestable tree in the western grove.",
    tile: { x: 3, y: 9 }
  },
  "tree-2": {
    id: "tree-2",
    kind: "tree",
    name: "Pine tree",
    spanishName: "El pino",
    description: "A harvestable tree in the western grove.",
    tile: { x: 4, y: 7 }
  },
  "tree-3": {
    id: "tree-3",
    kind: "tree",
    name: "Oak tree",
    spanishName: "El roble",
    description: "A broad tree beside the farm path.",
    tile: { x: 3, y: 12 }
  },
  "tree-4": {
    id: "tree-4",
    kind: "tree",
    name: "Oak tree",
    spanishName: "El roble",
    description: "A broad tree beside the farm path.",
    tile: { x: 5, y: 14 }
  },
  "plot-1": {
    id: "plot-1",
    kind: "plot",
    name: "West farm plot",
    spanishName: "La parcela uno",
    description: "A small patch of soil ready to become useful.",
    tile: { x: 7, y: 14 }
  },
  "plot-2": {
    id: "plot-2",
    kind: "plot",
    name: "Middle farm plot",
    spanishName: "La parcela dos",
    description: "A small patch of soil ready to become useful.",
    tile: { x: 8, y: 14 }
  },
  "plot-3": {
    id: "plot-3",
    kind: "plot",
    name: "East farm plot",
    spanishName: "La parcela tres",
    description: "A small patch of soil ready to become useful.",
    tile: { x: 9, y: 14 }
  }
};

export const TREE_IDS: EntityId[] = ["tree-1", "tree-2", "tree-3", "tree-4"];
export const PLOT_IDS: EntityId[] = ["plot-1", "plot-2", "plot-3"];

export const ITEM_LABELS: Record<
  ItemId,
  { es: string; en: string; icon: string }
> = {
  coin: { es: "moneda", en: "coin", icon: "◉" },
  log: { es: "tronco", en: "log", icon: "▰" },
  seed: { es: "semilla", en: "seed", icon: "◆" },
  carrot: { es: "zanahoria", en: "carrot", icon: "▲" },
  bread: { es: "pan", en: "bread", icon: "▰" },
  stew: { es: "guiso", en: "stew", icon: "●" },
  axe: { es: "hacha", en: "axe", icon: "⌁" },
  "watering-can": { es: "regadera", en: "watering can", icon: "◒" }
};

export const SKILL_LABELS: Record<
  SkillId,
  { es: string; en: string; icon: string }
> = {
  woodcutting: { es: "Tala", en: "Woodcutting", icon: "♣" },
  farming: { es: "Agricultura", en: "Farming", icon: "✦" },
  trading: { es: "Comercio", en: "Trading", icon: "◈" },
  cooking: { es: "Cocina", en: "Cooking", icon: "♨" }
};

export const REALM_QUESTS: RealmQuest[] = [
  {
    id: "meet-ines",
    chapter: "Una nueva parcela",
    title: "Meet the farmer",
    speaker: "Inés",
    description: "Introduce yourself to the farmer beside the north field.",
    targetIds: ["ines"],
    actionId: "greet-ines",
    required: 1,
    phrase: {
      id: "greet-ines",
      es: "Buenos días, Inés. Mucho gusto.",
      en: "Good morning, Inés. Nice to meet you.",
      glosses: [
        { es: "Buenos días", en: "Good morning" },
        { es: "Mucho gusto", en: "Nice to meet you" }
      ]
    },
    choices: [
      {
        id: "greet-correct",
        intent: "Greet Inés",
        es: "Buenos días, Inés. Mucho gusto.",
        en: "Good morning, Inés. Nice to meet you.",
        correct: true
      },
      {
        id: "greet-night",
        intent: "Say good night",
        es: "Buenas noches, Inés.",
        en: "Good night, Inés.",
        correct: false
      }
    ],
    instruction: "Tap Inés near the farm.",
    progressLabel: "greeting",
    success: "Inés welcomes you and shares three carrot seeds.",
    wrong: "It is morning in the valley. Try the morning greeting.",
    capability: "Greet a new neighbor"
  },
  {
    id: "gather-wood",
    chapter: "Agua para la huerta",
    title: "Gather repair wood",
    speaker: "Inés",
    description: "The old irrigation gate needs three sturdy logs.",
    targetIds: TREE_IDS,
    actionId: "chop-tree",
    required: 3,
    phrase: {
      id: "chop-three-logs",
      es: "Corta tres troncos, por favor.",
      en: "Chop three logs, please.",
      glosses: [
        { es: "corta", en: "chop" },
        { es: "tres troncos", en: "three logs" }
      ]
    },
    instruction: "Explore the western grove and tap trees.",
    progressLabel: "logs",
    success: "You have enough wood to repair the channel.",
    wrong: "Look for a tree in the western grove.",
    capability: "Follow a quantity request",
    skill: "woodcutting",
    xpPerAction: 12
  },
  {
    id: "repair-irrigation",
    chapter: "Agua para la huerta",
    title: "Repair the irrigation",
    speaker: "Inés",
    description: "Use the logs at the broken gate beside the plots.",
    targetIds: ["irrigation-gate"],
    actionId: "repair-irrigation",
    required: 1,
    phrase: {
      id: "repair-channel",
      es: "Repara el canal de riego.",
      en: "Repair the irrigation channel.",
      glosses: [
        { es: "repara", en: "repair" },
        { es: "el canal de riego", en: "the irrigation channel" }
      ]
    },
    instruction: "Tap the broken irrigation gate.",
    progressLabel: "repair",
    success: "Water runs toward the garden again.",
    wrong: "Bring three logs to the broken irrigation gate.",
    capability: "Follow a practical instruction",
    skill: "farming",
    xpPerAction: 18
  },
  {
    id: "till-soil",
    chapter: "La primera cosecha",
    title: "Prepare the soil",
    speaker: "Inés",
    description: "Turn over the soil in all three farm plots.",
    targetIds: PLOT_IDS,
    actionId: "till-plot",
    required: 3,
    phrase: {
      id: "prepare-three-plots",
      es: "Prepara la tierra en tres parcelas.",
      en: "Prepare the soil in three plots.",
      glosses: [
        { es: "prepara la tierra", en: "prepare the soil" },
        { es: "tres parcelas", en: "three plots" }
      ]
    },
    instruction: "Tap each farm plot once.",
    progressLabel: "plots tilled",
    success: "All three plots are ready.",
    wrong: "Use one of the three farm plots.",
    capability: "Understand farm instructions",
    skill: "farming",
    xpPerAction: 7
  },
  {
    id: "plant-seeds",
    chapter: "La primera cosecha",
    title: "Plant the seeds",
    speaker: "Inés",
    description: "Plant one seed in every prepared plot.",
    targetIds: PLOT_IDS,
    actionId: "plant-seed",
    required: 3,
    phrase: {
      id: "plant-each-plot",
      es: "Planta una semilla en cada parcela.",
      en: "Plant one seed in each plot.",
      glosses: [
        { es: "planta", en: "plant" },
        { es: "una semilla", en: "one seed" },
        { es: "cada parcela", en: "each plot" }
      ]
    },
    instruction: "Tap each tilled plot to plant a seed.",
    progressLabel: "seeds planted",
    success: "Three seeds rest in the dark soil.",
    wrong: "Plant only in a tilled farm plot.",
    capability: "Understand one and each",
    skill: "farming",
    xpPerAction: 8
  },
  {
    id: "water-crops",
    chapter: "La primera cosecha",
    title: "Water the plants",
    speaker: "Inés",
    description: "Use the watering can on each planted plot.",
    targetIds: PLOT_IDS,
    actionId: "water-plot",
    required: 3,
    phrase: {
      id: "water-three-plants",
      es: "Riega las tres plantas.",
      en: "Water the three plants.",
      glosses: [
        { es: "riega", en: "water" },
        { es: "las tres plantas", en: "the three plants" }
      ]
    },
    instruction: "Tap each planted plot to water it.",
    progressLabel: "plots watered",
    success: "The soil glistens. The crop is growing now.",
    wrong: "Water a plot that already has a seed.",
    capability: "Follow a familiar action verb",
    skill: "farming",
    xpPerAction: 8
  },
  {
    id: "harvest-crops",
    chapter: "La primera cosecha",
    title: "Harvest the carrots",
    speaker: "Inés",
    description: "Explore while the crop grows, then return for the harvest.",
    targetIds: PLOT_IDS,
    actionId: "harvest-carrot",
    required: 3,
    phrase: {
      id: "harvest-three-carrots",
      es: "Cosecha las tres zanahorias.",
      en: "Harvest the three carrots.",
      glosses: [
        { es: "cosecha", en: "harvest" },
        { es: "las tres zanahorias", en: "the three carrots" }
      ]
    },
    instruction: "Wait for the golden glow, then tap each plant.",
    progressLabel: "carrots harvested",
    success: "Your first harvest fills the basket.",
    wrong: "A watered plant needs a little more time.",
    capability: "Recognize a new food word",
    skill: "farming",
    xpPerAction: 16
  },
  {
    id: "trade-harvest",
    chapter: "Del campo a la mesa",
    title: "Trade at the market",
    speaker: "Rosa",
    description: "Offer two carrots to Rosa and keep one for the inn.",
    targetIds: ["rosa", "market-stall"],
    actionId: "trade-carrots",
    required: 1,
    phrase: {
      id: "trade-two-carrots",
      es: "Quiero vender dos zanahorias.",
      en: "I want to sell two carrots.",
      glosses: [
        { es: "quiero vender", en: "I want to sell" },
        { es: "dos zanahorias", en: "two carrots" }
      ]
    },
    choices: [
      {
        id: "trade-correct",
        intent: "Sell two carrots",
        es: "Quiero vender dos zanahorias.",
        en: "I want to sell two carrots.",
        correct: true
      },
      {
        id: "trade-buy",
        intent: "Buy two carrots",
        es: "Quiero comprar dos zanahorias.",
        en: "I want to buy two carrots.",
        correct: false
      }
    ],
    instruction: "Tap Rosa at the market.",
    progressLabel: "trade",
    success: "Rosa pays five coins and adds broth for the inn.",
    wrong: "You are selling the carrots, not buying them.",
    capability: "Sell food and state a quantity",
    skill: "trading",
    xpPerAction: 30
  },
  {
    id: "cook-stew",
    chapter: "Del campo a la mesa",
    title: "Cook a warm meal",
    speaker: "Nico",
    description: "Use the last carrot and Rosa's broth at the inn stove.",
    targetIds: ["nico", "stove"],
    actionId: "cook-stew",
    required: 1,
    phrase: {
      id: "cook-carrot-stew",
      es: "Cocina un guiso de zanahoria.",
      en: "Cook a carrot stew.",
      glosses: [
        { es: "cocina", en: "cook" },
        { es: "un guiso", en: "a stew" }
      ]
    },
    instruction: "Tap the stove inside the village inn.",
    progressLabel: "stew cooked",
    success: "The village has a warm meal to share.",
    wrong: "Use the stove beside Nico at the inn.",
    capability: "Follow a cooking instruction",
    skill: "cooking",
    xpPerAction: 35
  },
  {
    id: "open-road",
    chapter: "Un camino nuevo",
    title: "Open the north road",
    speaker: "Inés",
    description: "Bring the warm stew to the road keeper and name the direction.",
    targetIds: ["north-gate"],
    actionId: "open-north-road",
    required: 1,
    phrase: {
      id: "road-to-north",
      es: "El camino está al norte.",
      en: "The road is to the north.",
      glosses: [
        { es: "el camino", en: "the road" },
        { es: "al norte", en: "to the north" }
      ]
    },
    choices: [
      {
        id: "road-correct",
        intent: "Say the road is north",
        es: "El camino está al norte.",
        en: "The road is to the north.",
        correct: true
      },
      {
        id: "road-south",
        intent: "Say the road is south",
        es: "El camino está al sur.",
        en: "The road is to the south.",
        correct: false
      }
    ],
    instruction: "Travel to the gate at the top of the valley.",
    progressLabel: "road opened",
    success: "The gate opens. A new region waits beyond Luma Village.",
    wrong: "Look at the map again. The gate is north of the village.",
    capability: "Describe a landmark's direction"
  }
];

export const JOURNAL_PHRASES: RealmPhrase[] = [
  ...REALM_QUESTS.map((quest) => quest.phrase),
  {
    id: "please",
    es: "Por favor.",
    en: "Please.",
    glosses: []
  },
  {
    id: "thank-you",
    es: "Gracias.",
    en: "Thank you.",
    glosses: []
  },
  {
    id: "here-you-go",
    es: "Aquí tienes.",
    en: "Here you go.",
    glosses: []
  },
  {
    id: "where-market",
    es: "¿Dónde está el mercado?",
    en: "Where is the market?",
    glosses: []
  },
  {
    id: "need-water",
    es: "Necesito agua.",
    en: "I need water.",
    glosses: []
  },
  {
    id: "how-much",
    es: "¿Cuánto cuesta?",
    en: "How much does it cost?",
    glosses: []
  }
];

export function getEntity(id: EntityId): RealmEntity {
  return ENTITY_DEFINITIONS[id];
}

export function getQuest(index: number): RealmQuest | null {
  return REALM_QUESTS[index] ?? null;
}
