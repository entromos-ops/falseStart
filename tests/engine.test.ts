import { describe, expect, it } from "vitest";
import { QUESTS } from "@/lib/game/content";
import {
  advanceQuest,
  applyQuestAction,
  createInitialState,
  immersionPercent,
  parseSavedGame,
  revealHint,
  selectSupportStage,
  serializeGame,
  setSupportMode,
  startGame
} from "@/lib/game/engine";
import type { GameAction, GameState } from "@/lib/game/types";

function completeCurrent(
  state: GameState,
  action: GameAction,
  repeats = 1
): GameState {
  let next = state;
  for (let index = 0; index < repeats; index += 1) {
    next = applyQuestAction(next, action, 1_000 + index).state;
  }
  return advanceQuest(next);
}

describe("Luma Village game engine", () => {
  it("starts with a clean, playable device-local state", () => {
    const state = createInitialState();
    expect(state.started).toBe(false);
    expect(state.inventory).toEqual({
      board: 0,
      apple: 0,
      coin: 3,
      flower: 0
    });
    expect(immersionPercent(state)).toBe(8);
  });

  it("does not accept actions before the player enters the village", () => {
    const state = createInitialState();
    const result = applyQuestAction(state, {
      type: "choice",
      target: "buenos-dias"
    });
    expect(result.outcome).toBe("ignored");
    expect(result.state).toBe(state);
  });

  it("keeps wrong choices low-stakes and leaves state unchanged", () => {
    const state = startGame(createInitialState());
    const result = applyQuestAction(state, {
      type: "choice",
      target: "buenas-noches"
    });
    expect(result.outcome).toBe("wrong");
    expect(result.state).toBe(state);
  });

  it("increments gathering once per valid tap and blocks duplicates", () => {
    let state = startGame(createInitialState());
    state = completeCurrent(state, {
      type: "choice",
      target: "buenos-dias"
    });
    const one = applyQuestAction(
      state,
      { type: "gather", target: "board" },
      2_000
    );
    const two = applyQuestAction(
      one.state,
      { type: "gather", target: "board" },
      2_001
    );
    const three = applyQuestAction(
      two.state,
      { type: "gather", target: "board" },
      2_002
    );
    const duplicate = applyQuestAction(
      three.state,
      { type: "gather", target: "board" },
      2_003
    );
    expect(one.state.inventory.board).toBe(1);
    expect(two.state.inventory.board).toBe(2);
    expect(three.state.inventory.board).toBe(3);
    expect(three.outcome).toBe("complete");
    expect(duplicate.outcome).toBe("ignored");
    expect(duplicate.state.inventory.board).toBe(3);
  });

  it("requires completion before advancing", () => {
    const state = startGame(createInitialState());
    expect(advanceQuest(state)).toBe(state);
  });

  it("hint use keeps support available and does not grant unhinted mastery", () => {
    let state = startGame(createInitialState());
    state = revealHint(state);
    state = applyQuestAction(
      state,
      { type: "choice", target: "buenos-dias" },
      3_000
    ).state;
    expect(state.mastery.greeting.hints).toBe(1);
    expect(state.mastery.greeting.unhintedCorrect).toBe(0);
    expect(state.mastery.greeting.stage).toBe(0);
  });

  it("adjusts presentation without rewriting mastery", () => {
    let state = startGame(createInitialState());
    state = applyQuestAction(
      state,
      { type: "choice", target: "buenos-dias" },
      4_000
    ).state;
    expect(selectSupportStage(state, "greeting")).toBe(1);
    expect(selectSupportStage(setSupportMode(state, "gentle"), "greeting")).toBe(0);
    expect(selectSupportStage(setSupportMode(state, "bold"), "greeting")).toBe(2);
  });

  it("completes the vertical slice with correct resource accounting", () => {
    let state = startGame(createInitialState());
    state = completeCurrent(state, {
      type: "choice",
      target: "buenos-dias"
    });
    state = completeCurrent(
      state,
      { type: "gather", target: "board" },
      3
    );
    state = completeCurrent(state, { type: "give", target: "alma" });
    state = completeCurrent(state, { type: "build", target: "bench" });
    state = completeCurrent(state, { type: "place", target: "plot-tree" });
    state = completeCurrent(
      state,
      { type: "buy", target: "apple" },
      2
    );
    state = completeCurrent(state, { type: "give", target: "alma" });
    state = completeCurrent(state, { type: "place", target: "plot-bench" });
    state = completeCurrent(state, {
      type: "choice",
      target: "bench-next-tree"
    });

    expect(state.completed).toBe(true);
    expect(state.completedQuestIds).toHaveLength(QUESTS.length);
    expect(state.inventory).toEqual({
      board: 0,
      apple: 0,
      coin: 2,
      flower: 0
    });
    expect(state.builtItems).toContain("bench");
    expect(state.placements).toEqual(["plot-tree", "plot-bench"]);
    expect(state.mastery.beside.unhintedCorrect).toBe(3);
    expect(immersionPercent(state)).toBe(48);
  });

  it("round-trips saves and rejects corrupt content", () => {
    const state = startGame(createInitialState());
    const restored = parseSavedGame(serializeGame(state, 9_000));
    expect(restored.started).toBe(true);
    expect(restored.lastSavedAt).toBe(9_000);
    expect(parseSavedGame("not json")).toEqual(createInitialState());
    expect(parseSavedGame(JSON.stringify({ schemaVersion: 0 }))).toEqual(
      createInitialState()
    );
  });
});
