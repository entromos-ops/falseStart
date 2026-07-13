import type { Quest } from "./types";

export const RESOURCE_LABELS = {
  board: { en: "board", es: "tabla", pluralEs: "tablas" },
  apple: { en: "apple", es: "manzana", pluralEs: "manzanas" },
  coin: { en: "coin", es: "moneda", pluralEs: "monedas" },
  flower: { en: "flower", es: "flor", pluralEs: "flores" }
} as const;

export const LOCATION_LABELS = {
  grove: { en: "Grove", es: "Arboleda" },
  home: { en: "Home", es: "Casa" },
  plaza: { en: "Plaza", es: "Plaza" },
  workshop: { en: "Workshop", es: "Taller" },
  market: { en: "Market", es: "Mercado" },
  well: { en: "Well", es: "Pozo" },
  garden: { en: "Garden", es: "Jardín" }
} as const;

export const JOURNAL_PHRASES = [
  { id: "hello", es: "¡Hola!", en: "Hello!" },
  { id: "good-morning", es: "Buenos días.", en: "Good morning." },
  { id: "my-name", es: "Me llamo Alma.", en: "My name is Alma." },
  { id: "please", es: "Por favor.", en: "Please." },
  { id: "thanks", es: "Gracias.", en: "Thank you." },
  { id: "welcome", es: "De nada.", en: "You're welcome." },
  { id: "need", es: "Necesito tres tablas.", en: "I need three boards." },
  { id: "collect", es: "Recoge tres tablas.", en: "Collect three boards." },
  { id: "bring", es: "Tráeme las tablas.", en: "Bring me the boards." },
  { id: "here", es: "Aquí tienes.", en: "Here you go." },
  { id: "build", es: "Construye un banco.", en: "Build a bench." },
  { id: "beside", es: "Al lado de", en: "Next to" },
  { id: "put", es: "Pon el banco al lado del árbol.", en: "Put the bench next to the tree." },
  { id: "buy", es: "Compra dos manzanas.", en: "Buy two apples." },
  { id: "where", es: "¿Dónde está el banco?", en: "Where is the bench?" },
  { id: "location", es: "Está al lado del árbol.", en: "It is next to the tree." }
] as const;

export const QUESTS: Quest[] = [
  {
    id: "meet-alma",
    chapter: "A new morning",
    title: "Meet your neighbor",
    speaker: "Alma",
    speakerRole: "Your new neighbor",
    kind: "choice",
    target: "buenos-dias",
    required: 1,
    phrase: {
      es: "¡Hola! Buenos días. Me llamo Alma.",
      en: "Hello! Good morning. My name is Alma.",
      glosses: [
        { es: "Buenos días", en: "Good morning" },
        { es: "Me llamo", en: "My name is" }
      ]
    },
    masteryKey: "greeting",
    instruction: "Choose a natural morning reply.",
    success: "Alma smiles. Your first conversation belongs to this place now.",
    wrong: "Almost. It is morning in Luma Village.",
    choices: [
      { id: "buenos-dias", es: "Buenos días, Alma.", en: "Good morning, Alma." },
      { id: "buenas-noches", es: "Buenas noches, Alma.", en: "Good night, Alma." },
      { id: "hasta-luego", es: "Hasta luego, Alma.", en: "See you later, Alma." }
    ],
    reward: { coin: 1 }
  },
  {
    id: "gather-boards",
    chapter: "The plaza bench",
    title: "Gather the materials",
    speaker: "Alma",
    speakerRole: "Plaza caretaker",
    kind: "gather",
    target: "board",
    required: 3,
    phrase: {
      es: "Necesito tres tablas. Recoge tres tablas, por favor.",
      en: "I need three boards. Collect three boards, please.",
      glosses: [
        { es: "necesito", en: "I need" },
        { es: "tres tablas", en: "three boards" },
        { es: "recoge", en: "collect" }
      ]
    },
    masteryKey: "collect",
    instruction: "Tap the glowing grove three times.",
    success: "Three sturdy boards are ready for the plaza.",
    wrong: "The boards come from the grove — la arboleda."
  },
  {
    id: "deliver-boards",
    chapter: "The plaza bench",
    title: "Bring the boards",
    speaker: "Alma",
    speakerRole: "Plaza caretaker",
    kind: "give",
    target: "alma",
    required: 1,
    phrase: {
      es: "Tráeme las tres tablas, por favor.",
      en: "Bring me the three boards, please.",
      glosses: [
        { es: "tráeme", en: "bring me" },
        { es: "las tablas", en: "the boards" }
      ]
    },
    masteryKey: "bring",
    instruction: "Tap Alma in the plaza.",
    success: "“¡Gracias!” Alma lays out the wood for you.",
    wrong: "Bring the boards to Alma in the plaza.",
    requires: { board: 3 }
  },
  {
    id: "build-bench",
    chapter: "The plaza bench",
    title: "Build something useful",
    speaker: "Alma",
    speakerRole: "Plaza caretaker",
    kind: "build",
    target: "bench",
    required: 1,
    phrase: {
      es: "Construye un banco para la plaza.",
      en: "Build a bench for the plaza.",
      glosses: [
        { es: "construye", en: "build" },
        { es: "un banco", en: "a bench" }
      ]
    },
    masteryKey: "build",
    instruction: "Use the build button in the task card.",
    success: "The pieces fit. Now the bench needs a place.",
    wrong: "The plaza needs a bench — un banco.",
    cost: { board: 3 }
  },
  {
    id: "place-bench",
    chapter: "The plaza bench",
    title: "Choose the right place",
    speaker: "Alma",
    speakerRole: "Plaza caretaker",
    kind: "place",
    target: "plot-tree",
    required: 1,
    phrase: {
      es: "Pon el banco al lado del árbol.",
      en: "Put the bench next to the tree.",
      glosses: [
        { es: "pon", en: "put" },
        { es: "al lado de", en: "next to" },
        { es: "el árbol", en: "the tree" }
      ]
    },
    masteryKey: "beside",
    instruction: "Choose one of the two build plots on the map.",
    success: "The new bench settles into the shade of the tree.",
    wrong: "Casi. “Al lado del árbol” means next to the tree."
  },
  {
    id: "buy-apples",
    chapter: "A small thank-you",
    title: "Visit the market",
    speaker: "Rosa",
    speakerRole: "Market keeper",
    kind: "buy",
    target: "apple",
    required: 2,
    phrase: {
      es: "Compra dos manzanas, por favor.",
      en: "Buy two apples, please.",
      glosses: [
        { es: "compra", en: "buy" },
        { es: "dos manzanas", en: "two apples" }
      ]
    },
    masteryKey: "buy",
    instruction: "Tap the market twice. Each apple costs one coin.",
    success: "Two bright apples land in your basket.",
    wrong: "You can buy the apples at el mercado.",
    cost: { coin: 1 }
  },
  {
    id: "give-apples",
    chapter: "A small thank-you",
    title: "Bring Alma a gift",
    speaker: "Alma",
    speakerRole: "Your new neighbor",
    kind: "give",
    target: "alma",
    required: 1,
    phrase: {
      es: "Tráeme las dos manzanas, por favor.",
      en: "Bring me the two apples, please.",
      glosses: [
        { es: "tráeme", en: "bring me" },
        { es: "dos manzanas", en: "two apples" }
      ]
    },
    masteryKey: "bring",
    instruction: "Tap Alma in the plaza again.",
    success: "“Aquí tienes.” Alma trades you two flowers for the apples.",
    wrong: "Alma is waiting in the plaza.",
    requires: { apple: 2 },
    consume: { apple: 2 },
    reward: { flower: 2 }
  },
  {
    id: "place-flowers",
    chapter: "A small thank-you",
    title: "Make the plaza yours",
    speaker: "Alma",
    speakerRole: "Your new neighbor",
    kind: "place",
    target: "plot-bench",
    required: 1,
    phrase: {
      es: "Pon las flores al lado del banco.",
      en: "Put the flowers next to the bench.",
      glosses: [
        { es: "las flores", en: "the flowers" },
        { es: "al lado del banco", en: "next to the bench" }
      ]
    },
    masteryKey: "beside",
    instruction: "Tap the flower plot beside your new bench.",
    success: "Color returns to the plaza. The place is beginning to feel like yours.",
    wrong: "Look for the small plot beside the bench.",
    requires: { flower: 2 },
    consume: { flower: 2 }
  },
  {
    id: "transfer-location",
    chapter: "Your first memory",
    title: "Use it somewhere new",
    speaker: "Mateo",
    speakerRole: "Workshop carpenter",
    kind: "choice",
    target: "bench-next-tree",
    required: 1,
    phrase: {
      es: "¿Dónde está el banco?",
      en: "Where is the bench?",
      glosses: [
        { es: "dónde", en: "where" },
        { es: "está", en: "is" }
      ]
    },
    masteryKey: "beside",
    instruction: "Answer Mateo without relying on the old task wording.",
    success: "Mateo understands immediately. You used Spanish, not a memorized button.",
    wrong: "Look at the plaza and try the location phrase again.",
    choices: [
      {
        id: "bench-next-tree",
        es: "El banco está al lado del árbol.",
        en: "The bench is next to the tree."
      },
      {
        id: "bench-behind-market",
        es: "El banco está detrás del mercado.",
        en: "The bench is behind the market."
      },
      {
        id: "bench-under-well",
        es: "El banco está debajo del pozo.",
        en: "The bench is under the well."
      }
    ]
  }
];

export const MASTERY_KEYS = Array.from(
  new Set(QUESTS.map((quest) => quest.masteryKey))
);
