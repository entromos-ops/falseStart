import type { GameAction, GameState, Quest, SupportStage } from "@/lib/game/types";

type VillageMapProps = {
  state: GameState;
  quest: Quest | null;
  supportStage: SupportStage;
  immersion: number;
  feedback: { kind: "good" | "soft" | "info"; message: string; key: number } | null;
  onAction: (action: GameAction) => void;
};

function locationClass(
  id: string,
  quest: Quest | null,
  supportStage: SupportStage
): string {
  const activeTargets: Record<string, string> = {
    board: "grove",
    alma: "alma",
    bench: "workshop",
    apple: "market",
    "plot-tree": "plot-tree",
    "plot-bench": "plot-bench"
  };
  const isRelevant = quest ? activeTargets[quest.target] === id : false;
  return [
    "world-hotspot",
    `hotspot-${id}`,
    isRelevant && supportStage < 2 ? "is-guided" : "",
    quest?.kind === "place" && (id === "plot-tree" || id === "plot-fountain")
      ? "is-buildable"
      : ""
  ]
    .filter(Boolean)
    .join(" ");
}

export default function VillageMap({
  state,
  quest,
  supportStage,
  immersion,
  feedback,
  onAction
}: VillageMapProps) {
  const benchPlaced = state.placements.includes("plot-tree");
  const flowersPlaced = state.placements.includes("plot-bench");
  const benchBuilt = state.builtItems.includes("bench");
  const showEnglish = immersion < 48;

  return (
    <section className="village-card" aria-label="Luma Village map">
      <div className="village-scene">
        <div className="scene-sun" aria-hidden="true" />
        <div className="scene-river" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="path path-main" aria-hidden="true" />
        <div className="path path-east" aria-hidden="true" />
        <div className="plaza-ground" aria-hidden="true" />

        <button
          className={locationClass("grove", quest, supportStage)}
          type="button"
          aria-label="Gather boards in the grove, la arboleda"
          onClick={() => onAction({ type: "gather", target: "board" })}
        >
          <span className="grove-art" aria-hidden="true">
            <i className="tree tree-one" />
            <i className="tree tree-two" />
            <i className="tree tree-three" />
          </span>
          <span className="map-label">
            <strong>Arboleda</strong>
            {showEnglish ? <small>Grove</small> : null}
          </span>
        </button>

        <button
          className={locationClass("home", quest, supportStage)}
          type="button"
          aria-label="Home, la casa"
          onClick={() => onAction({ type: "place", target: "home" })}
        >
          <span className="house-art" aria-hidden="true">
            <i className="house-roof" />
            <i className="house-body" />
            <i className="house-door" />
            <i className="house-window" />
          </span>
          <span className="map-label map-label-top">
            <strong>Casa</strong>
            {showEnglish ? <small>Home</small> : null}
          </span>
        </button>

        <button
          className={locationClass("workshop", quest, supportStage)}
          type="button"
          aria-label="Build at the workshop, el taller"
          onClick={() => onAction({ type: "build", target: "bench" })}
        >
          <span className="workshop-art" aria-hidden="true">
            <i className="workshop-roof" />
            <i className="workshop-body" />
            <i className="workshop-door" />
            <i className="wood-stack" />
          </span>
          <span className="map-label">
            <strong>Taller</strong>
            {showEnglish ? <small>Workshop</small> : null}
          </span>
        </button>

        <button
          className={locationClass("market", quest, supportStage)}
          type="button"
          aria-label="Buy apples at the market, el mercado"
          onClick={() => onAction({ type: "buy", target: "apple" })}
        >
          <span className="market-art" aria-hidden="true">
            <i className="market-awning" />
            <i className="market-counter" />
            <i className="apple apple-one" />
            <i className="apple apple-two" />
            <i className="apple apple-three" />
          </span>
          <span className="map-label">
            <strong>Mercado</strong>
            {showEnglish ? <small>Market</small> : null}
          </span>
        </button>

        <button
          className={locationClass("alma", quest, supportStage)}
          type="button"
          aria-label="Talk to Alma in the plaza"
          onClick={() => onAction({ type: "give", target: "alma" })}
        >
          <span className="npc-art alma-art" aria-hidden="true">
            <i className="npc-shadow" />
            <i className="npc-body" />
            <i className="npc-head" />
            <i className="npc-hair" />
            <i className="npc-scarf" />
          </span>
          <span className="npc-name">Alma</span>
        </button>

        <div className="well-art" aria-hidden="true">
          <i className="well-water" />
          <i className="well-wall" />
          <i className="well-roof" />
        </div>

        <button
          className={locationClass("plot-tree", quest, supportStage)}
          type="button"
          aria-label="Build plot next to the tree"
          onClick={() => onAction({ type: "place", target: "plot-tree" })}
        >
          {benchPlaced ? (
            <span className="bench-art" aria-hidden="true">
              <i className="bench-back" />
              <i className="bench-seat" />
              <i className="bench-leg bench-leg-left" />
              <i className="bench-leg bench-leg-right" />
            </span>
          ) : (
            <span className="build-plot" aria-hidden="true">
              <i />
              <i />
              <i />
              {benchBuilt ? <b>+</b> : null}
            </span>
          )}
        </button>

        <button
          className={locationClass("plot-fountain", quest, supportStage)}
          type="button"
          aria-label="Build plot next to the well"
          onClick={() => onAction({ type: "place", target: "plot-fountain" })}
        >
          <span className="build-plot build-plot-alt" aria-hidden="true">
            <i />
            <i />
            <i />
            {benchBuilt && !benchPlaced ? <b>+</b> : null}
          </span>
        </button>

        {benchPlaced ? (
          <button
            className={locationClass("plot-bench", quest, supportStage)}
            type="button"
            aria-label="Flower plot next to the bench"
            onClick={() => onAction({ type: "place", target: "plot-bench" })}
          >
            {flowersPlaced ? (
              <span className="flower-bed" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            ) : (
              <span className="flower-plot" aria-hidden="true" />
            )}
          </button>
        ) : null}

        <div className="garden-patch" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>

        {feedback ? (
          <div
            key={feedback.key}
            className={`world-feedback feedback-${feedback.kind}`}
            role="status"
          >
            {feedback.message}
          </div>
        ) : null}
      </div>
    </section>
  );
}
