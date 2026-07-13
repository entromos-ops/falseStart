import { describe, expect, it } from "vitest";
import { PLOT_IDS, REALM_QUESTS } from "@/lib/realm/content";
import {
  CROP_GROW_MS,
  TREE_RESPAWN_MS,
  applyRealmAction,
  createInitialRealm,
  currentQuest,
  getEntityActions,
  parseRealm,
  refreshRealmState,
  serializeRealm,
  skillLevel,
  supportStageFor,
  xpForLevel,
  xpToNextLevel
} from "@/lib/realm/engine";
import type {
  EntityId,
  RealmAction,
  RealmState
} from "@/lib/realm/types";

function act(
  state: RealmState,
  action: RealmAction,
  now: number
): RealmState {
  return applyRealmAction(state, action, now).state;
}

function advance(state: RealmState, now: number): RealmState {
  const result = applyRealmAction(state, { type: "advance", now }, now);
  expect(result.accepted).toBe(true);
  return result.state;
}

function performOn(
  state: RealmState,
  actionId: string,
  entityId: EntityId,
  now: number
): RealmState {
  return act(
    state,
    { type: "perform", actionId, entityId, now },
    now
  );
}

function completeThroughWatering(): RealmState {
  let state = act(createInitialRealm(0), { type: "start" }, 0);

  state = act(
    state,
    { type: "choose", choiceId: "greet-correct", now: 10 },
    10
  );
  state = advance(state, 11);

  state = performOn(state, "chop-tree", "tree-1", 20);
  state = performOn(state, "chop-tree", "tree-2", 21);
  state = performOn(state, "chop-tree", "tree-3", 22);
  state = advance(state, 23);

  state = performOn(state, "repair-irrigation", "irrigation-gate", 30);
  state = advance(state, 31);

  for (const plotId of PLOT_IDS) {
    state = performOn(state, "till-plot", plotId, 40);
  }
  state = advance(state, 41);

  for (const plotId of PLOT_IDS) {
    state = performOn(state, "plant-seed", plotId, 1_000);
  }
  state = advance(state, 1_001);

  for (const plotId of PLOT_IDS) {
    state = performOn(state, "water-plot", plotId, 2_000);
  }

  return state;
}

describe("realm engine", () => {
  it("creates an independent, playable initial realm", () => {
    const initial = createInitialRealm(123);
    const snapshot = JSON.stringify(initial);
    const started = applyRealmAction(initial, { type: "start" }, 124).state;

    expect(initial).toMatchObject({
      schemaVersion: 2,
      contentVersion: 1,
      started: false,
      completed: false,
      questIndex: 0,
      questProgress: 0,
      questComplete: false,
      supportMode: "adaptive",
      lastSavedAt: 123
    });
    expect(currentQuest(initial)?.id).toBe("meet-ines");
    expect(initial.inventory).toEqual({
      coin: 3,
      log: 0,
      seed: 0,
      carrot: 0,
      stew: 0,
      axe: 1,
      "watering-can": 1
    });
    expect(initial.plots).toHaveLength(3);
    expect(initial.plots.every((plot) => plot.stage === "untilled")).toBe(true);
    expect(Object.values(initial.skills).every((skill) => skill.xp === 0)).toBe(
      true
    );
    expect(JSON.stringify(initial)).toBe(snapshot);
    expect(started).not.toBe(initial);
    expect(started.started).toBe(true);
  });

  it("treats a wrong morning greeting as a recoverable learning attempt", () => {
    const started = act(createInitialRealm(0), { type: "start" }, 0);
    const result = applyRealmAction(
      started,
      { type: "choose", choiceId: "greet-night", now: 50 },
      50
    );

    expect(result.accepted).toBe(false);
    expect(result.completedQuest).toBe(false);
    expect(result.state.questIndex).toBe(0);
    expect(result.state.questComplete).toBe(false);
    expect(result.state.inventory.seed).toBe(0);
    expect(result.state.phraseMastery["greet-ines"]).toEqual({
      correct: 0,
      wrong: 1,
      stage: 0,
      lastSeenAt: 50
    });
    expect(result.state.lastEvent?.kind).toBe("soft");
  });

  it("enforces tree cooldowns without granting duplicate logs or XP", () => {
    let state = act(createInitialRealm(0), { type: "start" }, 0);
    state = act(
      state,
      { type: "choose", choiceId: "greet-correct", now: 1 },
      1
    );
    state = advance(state, 2);

    const first = applyRealmAction(
      state,
      { type: "perform", actionId: "chop-tree", entityId: "tree-1", now: 100 },
      100
    );
    const early = applyRealmAction(
      first.state,
      { type: "perform", actionId: "chop-tree", entityId: "tree-1", now: 101 },
      101
    );
    const ready = applyRealmAction(
      early.state,
      {
        type: "perform",
        actionId: "chop-tree",
        entityId: "tree-1",
        now: 100 + TREE_RESPAWN_MS
      },
      100 + TREE_RESPAWN_MS
    );

    expect(first.state.inventory.log).toBe(1);
    expect(first.state.skills.woodcutting.xp).toBe(12);
    expect(first.state.treeReadyAt["tree-1"]).toBe(100 + TREE_RESPAWN_MS);
    expect(early.accepted).toBe(false);
    expect(early.state.inventory.log).toBe(1);
    expect(early.state.skills.woodcutting.xp).toBe(12);
    expect(ready.accepted).toBe(true);
    expect(ready.state.inventory.log).toBe(2);
    expect(ready.state.skills.woodcutting.xp).toBe(24);
  });

  it("keeps support presentation separate from phrase mastery and skill XP", () => {
    let state = act(createInitialRealm(0), { type: "start" }, 0);
    state = act(
      state,
      { type: "choose", choiceId: "greet-correct", now: 10 },
      10
    );

    expect(state.phraseMastery["greet-ines"].stage).toBe(1);
    expect(supportStageFor(state, "greet-ines")).toBe(1);
    expect(Object.values(state.skills).every((skill) => skill.xp === 0)).toBe(
      true
    );

    const gentle = act(
      state,
      { type: "set-support", mode: "gentle" },
      20
    );
    const bold = act(
      gentle,
      { type: "set-support", mode: "bold" },
      21
    );

    expect(supportStageFor(gentle, "greet-ines")).toBe(0);
    expect(supportStageFor(bold, "greet-ines")).toBe(2);
    expect(bold.phraseMastery).toEqual(state.phraseMastery);
    expect(bold.skills).toEqual(state.skills);

    const laterAdaptive = { ...state, questIndex: 4 } as RealmState;
    expect(supportStageFor(laterAdaptive, "plant-each-plot")).toBe(1);
    expect(
      supportStageFor(
        { ...laterAdaptive, supportMode: "gentle" },
        "plant-each-plot"
      )
    ).toBe(0);
  });

  it("uses stable skill-level thresholds", () => {
    expect(skillLevel(0)).toBe(1);
    expect(skillLevel(44)).toBe(1);
    expect(skillLevel(45)).toBe(2);
    expect(skillLevel(179)).toBe(2);
    expect(skillLevel(180)).toBe(3);
    expect(xpForLevel(2)).toBe(45);
    expect(xpForLevel(3)).toBe(180);
    expect(xpToNextLevel(0)).toEqual({
      level: 1,
      current: 0,
      required: 45,
      percent: 0
    });
    expect(xpToNextLevel(45)).toEqual({
      level: 2,
      current: 0,
      required: 135,
      percent: 0
    });
  });

  it("persists farm timing and cooldowns, then safely rejects corrupt saves", () => {
    let state = completeThroughWatering();
    state = act(state, { type: "move", point: { x: 3, y: 4 } }, 3_000);

    const restored = parseRealm(serializeRealm(state, 5_000), 5_001);
    expect(restored.player).toEqual({ x: 3, y: 4 });
    expect(restored.lastSavedAt).toBe(5_000);
    expect(restored.treeReadyAt["tree-1"]).toBe(20 + TREE_RESPAWN_MS);
    expect(restored.plots).toEqual(
      PLOT_IDS.map((id) => ({
        id,
        stage: "watered",
        plantedAt: 1_000,
        wateredAt: 2_000
      }))
    );

    const grown = parseRealm(
      serializeRealm(state, 5_000),
      2_000 + CROP_GROW_MS
    );
    expect(grown.plots.every((plot) => plot.stage === "ready")).toBe(true);

    expect(parseRealm("{broken", 777)).toEqual(createInitialRealm(777));
    expect(
      parseRealm(JSON.stringify({ schemaVersion: 1, contentVersion: 1 }), 888)
    ).toEqual(createInitialRealm(888));
  });

  it("completes all ten quests and opens the north road", () => {
    let state = completeThroughWatering();
    expect(state.questIndex).toBe(5);
    expect(state.questComplete).toBe(true);
    expect(state.plots.every((plot) => plot.stage === "watered")).toBe(true);
    expect(state.inventory.seed).toBe(0);

    state = advance(state, 2_001);
    const harvestAt = 2_000 + CROP_GROW_MS;
    for (const plotId of PLOT_IDS) {
      state = performOn(state, "harvest-carrot", plotId, harvestAt);
    }
    expect(state.inventory.carrot).toBe(3);
    expect(state.questComplete).toBe(true);
    state = advance(state, harvestAt + 1);

    state = act(
      state,
      { type: "choose", choiceId: "trade-correct", now: harvestAt + 2 },
      harvestAt + 2
    );
    expect(state.inventory.carrot).toBe(1);
    expect(state.inventory.coin).toBe(8);
    expect(state.world.marketRestored).toBe(true);
    state = advance(state, harvestAt + 3);

    state = performOn(state, "cook-stew", "stove", harvestAt + 4);
    expect(state.inventory.carrot).toBe(0);
    expect(state.inventory.stew).toBe(1);
    state = advance(state, harvestAt + 5);

    state = act(
      state,
      { type: "choose", choiceId: "road-correct", now: harvestAt + 6 },
      harvestAt + 6
    );
    expect(state.world.northRoadOpen).toBe(true);
    expect(state.inventory.stew).toBe(0);
    expect(state.questComplete).toBe(true);

    state = advance(state, harvestAt + 7);
    expect(state.completed).toBe(true);
    expect(currentQuest(state)).toBeNull();
    expect(state.questIndex).toBe(REALM_QUESTS.length - 1);
    expect(state.discoveredPhraseIds).toHaveLength(REALM_QUESTS.length);
    expect(state.skills).toEqual({
      woodcutting: { xp: 36 },
      farming: { xp: 135 },
      cooking: { xp: 35 },
      trading: { xp: 30 }
    });
    expect(skillLevel(state.skills.farming.xp)).toBe(2);

    expect(getEntityActions(state, "rosa", harvestAt + 8).map((action) => action.id)).toEqual([
      "buy-seed",
      "sell-carrot"
    ]);
    state = performOn(state, "buy-seed", "rosa", harvestAt + 8);
    state = performOn(state, "till-plot", "plot-1", harvestAt + 9);
    state = performOn(state, "plant-seed", "plot-1", harvestAt + 10);
    state = performOn(state, "water-plot", "plot-1", harvestAt + 11);
    state = refreshRealmState(state, harvestAt + 11 + CROP_GROW_MS);
    state = performOn(
      state,
      "harvest-carrot",
      "plot-1",
      harvestAt + 12 + CROP_GROW_MS
    );
    state = performOn(
      state,
      "sell-carrot",
      "rosa",
      harvestAt + 13 + CROP_GROW_MS
    );
    expect(state.inventory).toMatchObject({ coin: 9, seed: 0, carrot: 0 });
    expect(state.skills.farming.xp).toBeGreaterThan(135);
    expect(state.skills.trading.xp).toBeGreaterThan(30);
  });

  it("does not allow harvesting before injected growth time has elapsed", () => {
    let state = advance(completeThroughWatering(), 2_001);
    const before = JSON.stringify(state.plots);
    const early = applyRealmAction(
      state,
      {
        type: "perform",
        actionId: "harvest-carrot",
        entityId: "plot-1",
        now: 2_000 + CROP_GROW_MS - 1
      },
      2_000 + CROP_GROW_MS - 1
    );

    expect(early.accepted).toBe(false);
    expect(early.state.inventory.carrot).toBe(0);
    expect(JSON.stringify(early.state.plots)).toBe(before);

    state = refreshRealmState(early.state, 2_000 + CROP_GROW_MS);
    expect(state.plots.every((plot) => plot.stage === "ready")).toBe(true);
  });
});
