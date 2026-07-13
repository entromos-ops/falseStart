"use client";

import { useEffect, useId, useRef, useState } from "react";
import type Phaser from "phaser";
import {
  ENTITY_DEFINITIONS,
  WORLD_SIZE,
  type RealmEntity
} from "@/lib/realm/content";
import type { EntityId, RealmState, TilePoint } from "@/lib/realm/types";

export type RealmWorldProps = {
  state: RealmState;
  selectedEntityId: EntityId | null;
  questTargetIds: EntityId[];
  onSelectEntity: (id: EntityId) => void;
  onMove: (point: TilePoint) => void;
};

type SceneBridge = {
  applyState: (state: RealmState) => void;
  setSelection: (
    selectedEntityId: EntityId | null,
    questTargetIds: EntityId[]
  ) => void;
};

const TILE_WIDTH = 76;
const TILE_HEIGHT = 38;
const HALF_TILE_WIDTH = TILE_WIDTH / 2;
const HALF_TILE_HEIGHT = TILE_HEIGHT / 2;
const ORIGIN_X = WORLD_SIZE.height * HALF_TILE_WIDTH + 150;
const ORIGIN_Y = 174;
const WORLD_PIXEL_WIDTH =
  (WORLD_SIZE.width + WORLD_SIZE.height) * HALF_TILE_WIDTH + 300;
const WORLD_PIXEL_HEIGHT =
  (WORLD_SIZE.width + WORLD_SIZE.height) * HALF_TILE_HEIGHT + 390;

const TREE_IDS = new Set<EntityId>([
  "tree-1",
  "tree-2",
  "tree-3",
  "tree-4"
]);
const PLOT_IDS = new Set<EntityId>(["plot-1", "plot-2", "plot-3"]);

const BUILDING_TILES = new Set([
  "7,7",
  "7,8",
  "8,7",
  "8,8",
  "14,3",
  "15,3",
  "15,4",
  "19,11",
  "20,11",
  "19,12",
  "20,12"
]);

function tileKey(point: TilePoint): string {
  return `${point.x},${point.y}`;
}

function sameTile(a: TilePoint, b: TilePoint): boolean {
  return a.x === b.x && a.y === b.y;
}

function tileDistance(a: TilePoint, b: TilePoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isInside(point: TilePoint): boolean {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < WORLD_SIZE.width &&
    point.y < WORLD_SIZE.height
  );
}

function isWater(point: TilePoint): boolean {
  const river = point.x >= 21 && point.y >= 10;
  const pond = point.x <= 2 && point.y >= 14;
  return river || pond;
}

function isRoad(point: TilePoint): boolean {
  return (
    point.x === 11 ||
    point.x === 12 ||
    point.y === 8 ||
    point.y === 9 ||
    (point.x >= 7 && point.x <= 18 && point.y === 11) ||
    (point.x >= 11 && point.x <= 18 && point.y === 6)
  );
}

function iso(point: TilePoint): { x: number; y: number } {
  return {
    x: ORIGIN_X + (point.x - point.y) * HALF_TILE_WIDTH,
    y: ORIGIN_Y + (point.x + point.y) * HALF_TILE_HEIGHT
  };
}

function screenToTile(x: number, y: number): TilePoint {
  const localX = (x - ORIGIN_X) / HALF_TILE_WIDTH;
  const localY = (y - ORIGIN_Y) / HALF_TILE_HEIGHT;
  return {
    x: Math.round((localX + localY) / 2),
    y: Math.round((localY - localX) / 2)
  };
}

function neighbors(point: TilePoint): TilePoint[] {
  return [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 }
  ];
}

function findPath(
  start: TilePoint,
  goal: TilePoint,
  blocked: (point: TilePoint) => boolean
): TilePoint[] {
  if (sameTile(start, goal)) return [start];

  const open: Array<{ point: TilePoint; score: number }> = [
    { point: start, score: tileDistance(start, goal) }
  ];
  const cameFrom = new Map<string, TilePoint>();
  const costs = new Map<string, number>([[tileKey(start), 0]]);
  const closed = new Set<string>();

  while (open.length > 0) {
    open.sort((a, b) => a.score - b.score);
    const current = open.shift()!.point;
    const currentKey = tileKey(current);
    if (closed.has(currentKey)) continue;
    if (sameTile(current, goal)) {
      const path = [current];
      let cursor = current;
      while (!sameTile(cursor, start)) {
        const previous = cameFrom.get(tileKey(cursor));
        if (!previous) return [];
        path.push(previous);
        cursor = previous;
      }
      return path.reverse();
    }
    closed.add(currentKey);

    for (const next of neighbors(current)) {
      const nextKey = tileKey(next);
      if (!isInside(next) || blocked(next) || closed.has(nextKey)) continue;
      const nextCost = (costs.get(currentKey) ?? 0) + 1;
      if (nextCost >= (costs.get(nextKey) ?? Number.POSITIVE_INFINITY)) {
        continue;
      }
      costs.set(nextKey, nextCost);
      cameFrom.set(nextKey, current);
      open.push({
        point: next,
        score: nextCost + tileDistance(next, goal)
      });
    }
  }
  return [];
}

function tileColor(point: TilePoint): number {
  if (isWater(point)) return (point.x + point.y) % 2 ? 0x6db9bd : 0x78c6c4;
  if (isRoad(point)) return (point.x + point.y) % 2 ? 0xd8bd83 : 0xe0c992;
  const shades = [0x92bd75, 0x9ac47b, 0x86b66e, 0xa2c984];
  return shades[(point.x * 7 + point.y * 13) % shades.length];
}

export default function RealmWorld({
  state,
  selectedEntityId,
  questTargetIds,
  onSelectEntity,
  onMove
}: RealmWorldProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneBridge | null>(null);
  const stateRef = useRef(state);
  const selectedRef = useRef(selectedEntityId);
  const targetsRef = useRef(questTargetIds);
  const onSelectRef = useRef(onSelectEntity);
  const onMoveRef = useRef(onMove);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Loading Luma Valley.");
  const instructionId = `${useId().replaceAll(":", "")}-realm-help`;

  stateRef.current = state;
  selectedRef.current = selectedEntityId;
  targetsRef.current = questTargetIds;
  onSelectRef.current = onSelectEntity;
  onMoveRef.current = onMove;

  useEffect(() => {
    sceneRef.current?.applyState(state);
  }, [state]);

  useEffect(() => {
    sceneRef.current?.setSelection(selectedEntityId, questTargetIds);
  }, [selectedEntityId, questTargetIds]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let game: Phaser.Game | null = null;
    let observer: ResizeObserver | null = null;

    async function boot() {
      const PhaserRuntime: typeof Phaser = (await import("phaser")).default;
      if (disposed || !mountRef.current) return;

      class RealmScene extends PhaserRuntime.Scene implements SceneBridge {
        private currentState = stateRef.current;
        private currentTile = { ...stateRef.current.player };
        private player!: Phaser.GameObjects.Container;
        private route: TilePoint[] = [];
        private moving = false;
        private pendingEntity: EntityId | null = null;
        private marker!: Phaser.GameObjects.Graphics;
        private selection!: Phaser.GameObjects.Container;
        private questHighlights = new Map<EntityId, Phaser.GameObjects.Container>();
        private labels = new Map<EntityId, Phaser.GameObjects.Text>();
        private plotGraphics = new Map<EntityId, Phaser.GameObjects.Graphics>();
        private treeVisuals = new Map<
          EntityId,
          { tree: Phaser.GameObjects.Container; stump: Phaser.GameObjects.Container }
        >();
        private worldVariants = new Map<
          EntityId,
          { before: Phaser.GameObjects.Container; after: Phaser.GameObjects.Container }
        >();

        constructor() {
          super("luma-realm");
        }

        create() {
          this.cameras.main.setBackgroundColor(0xcfe6bc);
          this.drawGround();
          this.drawLandscapeDetails();
          this.createLandmarks();
          this.createEntities();
          this.createPlayer();
          this.createMarkers();
          this.bindInput();

          this.cameras.main.setBounds(
            0,
            0,
            WORLD_PIXEL_WIDTH,
            WORLD_PIXEL_HEIGHT
          );
          this.cameras.main.startFollow(this.player, true, 0.11, 0.11);
          this.updateCameraScale(this.scale.width, this.scale.height);
          this.scale.on("resize", (size: Phaser.Structs.Size) => {
            this.updateCameraScale(size.width, size.height);
          });

          this.applyState(stateRef.current);
          this.setSelection(selectedRef.current, targetsRef.current);
          sceneRef.current = this;
          if (!disposed) {
            setReady(true);
            setStatus(
              "Luma Valley ready. Tap the ground to walk, or tap a highlighted person or place."
            );
          }
        }

        private depth(point: TilePoint, offset = 0): number {
          return 100 + (point.x + point.y) * 20 + point.y / 100 + offset;
        }

        private drawDiamond(
          graphics: Phaser.GameObjects.Graphics,
          centerX: number,
          centerY: number,
          width: number,
          height: number,
          color: number,
          alpha = 1
        ) {
          graphics.fillStyle(color, alpha);
          this.fillPolygon(graphics, [
            { x: centerX, y: centerY - height / 2 },
            { x: centerX + width / 2, y: centerY },
            { x: centerX, y: centerY + height / 2 },
            { x: centerX - width / 2, y: centerY }
          ]);
        }

        private fillPolygon(
          graphics: Phaser.GameObjects.Graphics,
          points: Array<{ x: number; y: number }>
        ) {
          if (points.length === 0) return;
          graphics.beginPath();
          graphics.moveTo(points[0].x, points[0].y);
          for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
          graphics.closePath();
          graphics.fillPath();
        }

        private strokePolygon(
          graphics: Phaser.GameObjects.Graphics,
          points: Array<{ x: number; y: number }>
        ) {
          if (points.length === 0) return;
          graphics.beginPath();
          graphics.moveTo(points[0].x, points[0].y);
          for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
          graphics.closePath();
          graphics.strokePath();
        }

        private drawGround() {
          const ground = this.add.graphics().setDepth(-100);
          for (let diagonal = 0; diagonal < WORLD_SIZE.width + WORLD_SIZE.height; diagonal += 1) {
            for (let y = 0; y < WORLD_SIZE.height; y += 1) {
              const x = diagonal - y;
              if (x < 0 || x >= WORLD_SIZE.width) continue;
              const point = { x, y };
              const center = iso(point);
              this.drawDiamond(
                ground,
                center.x,
                center.y,
                TILE_WIDTH - 1,
                TILE_HEIGHT - 1,
                tileColor(point)
              );
              ground.lineStyle(1, isWater(point) ? 0x5fa7ae : 0x739d64, 0.24);
              this.strokePolygon(ground, [
                { x: center.x, y: center.y - HALF_TILE_HEIGHT },
                { x: center.x + HALF_TILE_WIDTH, y: center.y },
                { x: center.x, y: center.y + HALF_TILE_HEIGHT },
                { x: center.x - HALF_TILE_WIDTH, y: center.y }
              ]);
              if (isWater(point)) {
                ground.lineStyle(1.4, 0xc6f0e8, 0.36);
                ground.lineBetween(center.x - 17, center.y, center.x + 2, center.y + 5);
              }
            }
          }
        }

        private drawLandscapeDetails() {
          const details = this.add.graphics().setDepth(10);
          for (let x = 0; x < WORLD_SIZE.width; x += 1) {
            for (let y = 0; y < WORLD_SIZE.height; y += 1) {
              const point = { x, y };
              if (isRoad(point) || isWater(point) || (x + y * 3) % 8 !== 0) {
                continue;
              }
              const center = iso(point);
              details.fillStyle((x + y) % 3 ? 0xf7e1a0 : 0xf3b7a7, 0.82);
              details.fillCircle(center.x + 8, center.y - 1, 2);
              details.lineStyle(1, 0x5f965c, 0.7);
              details.lineBetween(center.x + 8, center.y + 1, center.x + 8, center.y + 7);
            }
          }

          this.addMapLabel({ x: 5, y: 5 }, "WESTERN GROVE");
          this.addMapLabel({ x: 8, y: 16 }, "NORTH FIELD");
          this.addMapLabel({ x: 17, y: 9 }, "MARKET SQUARE");
          this.addMapLabel({ x: 14, y: 4 }, "THE WARM HEARTH");
          this.addMapLabel({ x: 20, y: 13 }, "WORKSHOP");
        }

        private addMapLabel(point: TilePoint, value: string) {
          const center = iso(point);
          this.add
            .text(center.x, center.y + 22, value, {
              color: "#365c4c",
              fontFamily: "Arial, sans-serif",
              fontSize: "10px",
              fontStyle: "bold",
              letterSpacing: 1.4,
              backgroundColor: "rgba(247, 239, 211, 0.82)",
              padding: { x: 6, y: 3 }
            })
            .setOrigin(0.5)
            .setDepth(this.depth(point, 7));
        }

        private createLandmarks() {
          this.makeBuilding({ x: 7, y: 8 }, 48, 54, 0xe9b98e, 0x9e4f43, 0x6f3a35);
          this.makeBuilding({ x: 15, y: 4 }, 58, 68, 0xf0c994, 0x567b6d, 0x704639);
          this.makeBuilding({ x: 20, y: 12 }, 62, 58, 0xd7b07f, 0x6f6d63, 0x61463a);

          const bridgePoint = iso({ x: 21, y: 10 });
          const bridge = this.add.graphics().setDepth(this.depth({ x: 21, y: 10 }, 4));
          bridge.fillStyle(0x9b6b49, 1);
          this.fillPolygon(bridge, [
            { x: bridgePoint.x - 31, y: bridgePoint.y - 12 },
            { x: bridgePoint.x + 31, y: bridgePoint.y + 4 },
            { x: bridgePoint.x + 24, y: bridgePoint.y + 13 },
            { x: bridgePoint.x - 38, y: bridgePoint.y - 3 }
          ]);
          bridge.lineStyle(2, 0x6e4735, 0.8);
          for (let offset = -24; offset <= 24; offset += 12) {
            bridge.lineBetween(
              bridgePoint.x + offset,
              bridgePoint.y - 8 + offset / 4,
              bridgePoint.x + offset - 5,
              bridgePoint.y + 7 + offset / 4
            );
          }
        }

        private makeBuilding(
          point: TilePoint,
          width: number,
          height: number,
          wall: number,
          roof: number,
          trim: number
        ) {
          const center = iso(point);
          const building = this.add.container(center.x, center.y - 7).setDepth(this.depth(point, 5));
          const shadow = this.add.graphics();
          shadow.fillStyle(0x294d3f, 0.2);
          shadow.fillEllipse(8, 10, width * 1.8, 25);
          const graphics = this.add.graphics();
          graphics.fillStyle(wall, 1);
          this.fillPolygon(graphics, [
            { x: -width, y: -height * 0.48 },
            { x: 0, y: -height * 0.08 },
            { x: 0, y: height * 0.58 },
            { x: -width, y: height * 0.14 }
          ]);
          graphics.fillStyle(PhaserRuntime.Display.Color.IntegerToColor(wall).darken(14).color, 1);
          this.fillPolygon(graphics, [
            { x: 0, y: -height * 0.08 },
            { x: width, y: -height * 0.48 },
            { x: width, y: height * 0.14 },
            { x: 0, y: height * 0.58 }
          ]);
          graphics.fillStyle(roof, 1);
          this.fillPolygon(graphics, [
            { x: 0, y: -height - 29 },
            { x: width + 9, y: -height * 0.47 },
            { x: 0, y: -height * 0.04 },
            { x: -width - 9, y: -height * 0.47 }
          ]);
          graphics.lineStyle(3, trim, 0.78);
          this.strokePolygon(graphics, [
            { x: 0, y: -height - 29 },
            { x: width + 9, y: -height * 0.47 },
            { x: 0, y: -height * 0.04 },
            { x: -width - 9, y: -height * 0.47 }
          ]);
          graphics.fillStyle(trim, 1);
          graphics.fillRect(8, 0, 16, 29);
          graphics.fillStyle(0xf6d788, 0.9);
          graphics.fillRect(-31, -15, 13, 12);
          building.add([shadow, graphics]);
        }

        private createEntities() {
          for (const entity of Object.values(ENTITY_DEFINITIONS)) {
            let visual: Phaser.GameObjects.Container;
            if (entity.kind === "npc") visual = this.makeNpc(entity);
            else if (entity.kind === "tree") visual = this.makeTree(entity);
            else if (entity.kind === "plot") visual = this.makePlot(entity);
            else if (entity.id === "well") visual = this.makeWell(entity);
            else if (entity.id === "market-stall") visual = this.makeMarket(entity);
            else if (entity.id === "stove") visual = this.makeStove(entity);
            else if (entity.id === "bank-chest") visual = this.makeChest(entity);
            else if (entity.id === "irrigation-gate") visual = this.makeIrrigation(entity);
            else visual = this.makeGate(entity);
            this.addEntityHitArea(entity, visual);
          }
        }

        private makeNpc(entity: RealmEntity): Phaser.GameObjects.Container {
          const center = iso(entity.tile);
          const container = this.add.container(center.x, center.y - 9).setDepth(this.depth(entity.tile, 8));
          const graphics = this.add.graphics();
          const colors: Record<string, number> = {
            ines: 0xb75d4e,
            rosa: 0x486f70,
            nico: 0x72577d
          };
          graphics.fillStyle(0x294d3f, 0.22);
          graphics.fillEllipse(0, 10, 35, 13);
          graphics.fillStyle(colors[entity.id] ?? 0x557d6b, 1);
          graphics.fillTriangle(-14, 5, 14, 5, 0, -33);
          graphics.fillStyle(0xf0b88e, 1);
          graphics.fillCircle(0, -43, 11);
          graphics.fillStyle(0x49342e, 1);
          graphics.fillCircle(-1, -47, 11);
          graphics.fillStyle(0xf0b88e, 1);
          graphics.fillCircle(0, -42, 8);
          const label = this.makeEntityLabel(entity, center.x, center.y - 72, true);
          container.add(graphics);
          this.labels.set(entity.id, label);
          return container;
        }

        private makeTree(entity: RealmEntity): Phaser.GameObjects.Container {
          const center = iso(entity.tile);
          const tree = this.add.container(center.x, center.y - 4).setDepth(this.depth(entity.tile, 6));
          const graphics = this.add.graphics();
          graphics.fillStyle(0x294d3f, 0.2);
          graphics.fillEllipse(5, 11, 51, 17);
          graphics.fillStyle(0x76513a, 1);
          graphics.fillRect(-5, -38, 11, 46);
          graphics.fillStyle(0x386b52, 1);
          graphics.fillTriangle(-34, -28, 34, -28, 0, -91);
          graphics.fillStyle(0x4b8360, 1);
          graphics.fillTriangle(-29, -52, 29, -52, 0, -109);
          graphics.fillStyle(0x6b9c66, 0.85);
          graphics.fillTriangle(-19, -70, 20, -70, 0, -121);
          tree.add(graphics);

          const stump = this.add.container(center.x, center.y - 3).setDepth(this.depth(entity.tile, 6));
          const stumpGraphic = this.add.graphics();
          stumpGraphic.fillStyle(0x294d3f, 0.16);
          stumpGraphic.fillEllipse(3, 8, 37, 12);
          stumpGraphic.fillStyle(0x76513a, 1);
          stumpGraphic.fillRect(-8, -10, 16, 18);
          stumpGraphic.fillStyle(0xb98b60, 1);
          stumpGraphic.fillEllipse(0, -10, 16, 7);
          stump.add(stumpGraphic);
          this.treeVisuals.set(entity.id, { tree, stump });
          return tree;
        }

        private makePlot(entity: RealmEntity): Phaser.GameObjects.Container {
          const center = iso(entity.tile);
          const container = this.add.container(center.x, center.y).setDepth(this.depth(entity.tile, 2));
          const graphics = this.add.graphics();
          container.add(graphics);
          this.plotGraphics.set(entity.id, graphics);
          return container;
        }

        private drawPlot(id: EntityId) {
          const graphics = this.plotGraphics.get(id);
          if (!graphics) return;
          const stage = this.currentState.plots.find((plot) => plot.id === id)?.stage ?? "untilled";
          graphics.clear();
          this.drawDiamond(graphics, 0, 0, 63, 29, stage === "untilled" ? 0x9a7951 : 0x765638);
          graphics.lineStyle(2, stage === "watered" ? 0x75bcc0 : 0xb69061, 0.76);
          for (let offset = -17; offset <= 17; offset += 11) {
            graphics.lineBetween(offset - 8, -4, offset + 8, 5);
          }
          if (stage === "planted" || stage === "watered" || stage === "ready") {
            for (const offset of [-14, 0, 14]) {
              graphics.fillStyle(stage === "ready" ? 0xf0a24b : 0x4f8b55, 1);
              graphics.fillTriangle(offset - 4, -2, offset + 4, -2, offset, stage === "ready" ? 10 : -12);
              if (stage === "ready") {
                graphics.fillStyle(0x4f8b55, 1);
                graphics.fillTriangle(offset - 6, -3, offset + 1, -3, offset - 2, -13);
              }
            }
          }
          if (stage === "watered") {
            graphics.fillStyle(0xbde7df, 0.72);
            graphics.fillCircle(23, 5, 3);
          }
        }

        private makeWell(entity: RealmEntity): Phaser.GameObjects.Container {
          const center = iso(entity.tile);
          const container = this.add.container(center.x, center.y - 5).setDepth(this.depth(entity.tile, 6));
          const graphics = this.add.graphics();
          graphics.fillStyle(0x294d3f, 0.2);
          graphics.fillEllipse(3, 17, 53, 18);
          graphics.fillStyle(0x8b8170, 1);
          graphics.fillEllipse(0, 0, 45, 23);
          graphics.fillRect(-22, 0, 44, 20);
          graphics.fillStyle(0xa89e8b, 1);
          graphics.fillEllipse(0, 20, 45, 20);
          graphics.fillStyle(0x4d9294, 1);
          graphics.fillEllipse(0, -1, 31, 13);
          container.add(graphics);
          return container;
        }

        private makeMarket(entity: RealmEntity): Phaser.GameObjects.Container {
          const center = iso(entity.tile);
          const container = this.add.container(center.x, center.y - 5).setDepth(this.depth(entity.tile, 6));
          const graphics = this.add.graphics();
          graphics.fillStyle(0x294d3f, 0.18);
          graphics.fillEllipse(4, 17, 68, 20);
          graphics.fillStyle(0x8f5e3f, 1);
          graphics.fillRect(-29, -8, 58, 29);
          graphics.fillStyle(0xe6c783, 1);
          graphics.fillRect(-35, -38, 70, 18);
          for (let x = -35; x < 35; x += 18) {
            graphics.fillStyle((x / 18) % 2 ? 0xb6564d : 0xf0d79d, 1);
            graphics.fillRect(x, -38, 18, 18);
          }
          graphics.fillStyle(0x5b3c31, 1);
          graphics.fillRect(-31, -20, 5, 42);
          graphics.fillRect(26, -20, 5, 42);
          container.add(graphics);
          return container;
        }

        private makeStove(entity: RealmEntity): Phaser.GameObjects.Container {
          const center = iso(entity.tile);
          const container = this.add.container(center.x, center.y - 8).setDepth(this.depth(entity.tile, 8));
          const graphics = this.add.graphics();
          graphics.fillStyle(0x5d5953, 1);
          graphics.fillRoundedRect(-19, -37, 38, 47, 6);
          graphics.fillStyle(0x2f302f, 1);
          graphics.fillCircle(0, -12, 12);
          graphics.fillStyle(0xf3a34e, 1);
          graphics.fillTriangle(-7, -6, 7, -6, 1, -25);
          graphics.fillStyle(0x5d5953, 1);
          graphics.fillRect(8, -69, 9, 34);
          container.add(graphics);
          return container;
        }

        private makeChest(entity: RealmEntity): Phaser.GameObjects.Container {
          const center = iso(entity.tile);
          const container = this.add.container(center.x, center.y - 5).setDepth(this.depth(entity.tile, 5));
          const graphics = this.add.graphics();
          graphics.fillStyle(0x6f4934, 1);
          graphics.fillRoundedRect(-25, -27, 50, 35, 8);
          graphics.lineStyle(4, 0xb68a55, 1);
          graphics.strokeRoundedRect(-25, -27, 50, 35, 8);
          graphics.fillStyle(0xe0ba68, 1);
          graphics.fillRect(-4, -12, 8, 13);
          container.add(graphics);
          return container;
        }

        private makeIrrigation(entity: RealmEntity): Phaser.GameObjects.Container {
          const center = iso(entity.tile);
          const before = this.add.container(center.x, center.y).setDepth(this.depth(entity.tile, 4));
          const beforeGraphic = this.add.graphics();
          beforeGraphic.lineStyle(7, 0x76513a, 1);
          beforeGraphic.lineBetween(-28, 8, -3, -8);
          beforeGraphic.lineBetween(9, 9, 28, -5);
          beforeGraphic.fillStyle(0x6d9b9d, 0.35);
          beforeGraphic.fillEllipse(0, 10, 65, 15);
          before.add(beforeGraphic);
          const after = this.add.container(center.x, center.y).setDepth(this.depth(entity.tile, 4));
          const afterGraphic = this.add.graphics();
          afterGraphic.fillStyle(0x70b8b4, 0.82);
          afterGraphic.fillEllipse(0, 10, 67, 16);
          afterGraphic.lineStyle(7, 0x76513a, 1);
          afterGraphic.lineBetween(-29, -3, 29, -3);
          afterGraphic.lineStyle(2, 0xd8ae73, 1);
          for (let x = -22; x <= 22; x += 11) afterGraphic.lineBetween(x, -9, x, 5);
          after.add(afterGraphic);
          this.worldVariants.set(entity.id, { before, after });
          return before;
        }

        private makeGate(entity: RealmEntity): Phaser.GameObjects.Container {
          const center = iso(entity.tile);
          const closed = this.add.container(center.x, center.y - 5).setDepth(this.depth(entity.tile, 6));
          const closedGraphic = this.add.graphics();
          closedGraphic.fillStyle(0x76513a, 1);
          closedGraphic.fillRect(-38, -58, 9, 67);
          closedGraphic.fillRect(29, -58, 9, 67);
          closedGraphic.fillRect(-34, -42, 68, 8);
          closedGraphic.fillRect(-34, -17, 68, 8);
          closed.add(closedGraphic);
          const open = this.add.container(center.x, center.y - 5).setDepth(this.depth(entity.tile, 6));
          const openGraphic = this.add.graphics();
          openGraphic.fillStyle(0x76513a, 1);
          openGraphic.fillRect(-43, -58, 9, 67);
          openGraphic.fillRect(34, -58, 9, 67);
          openGraphic.fillRect(-39, -42, 25, 8);
          openGraphic.fillRect(14, -42, 25, 8);
          open.add(openGraphic);
          this.worldVariants.set(entity.id, { before: closed, after: open });
          return closed;
        }

        private makeEntityLabel(
          entity: RealmEntity,
          x: number,
          y: number,
          visible: boolean
        ): Phaser.GameObjects.Text {
          return this.add
            .text(x, y, `${entity.name} · ${entity.spanishName}`, {
              color: "#f8f1d9",
              fontFamily: "Arial, sans-serif",
              fontSize: "12px",
              fontStyle: "bold",
              backgroundColor: "rgba(38, 70, 58, 0.9)",
              padding: { x: 8, y: 5 }
            })
            .setOrigin(0.5)
            .setDepth(20000)
            .setVisible(visible);
        }

        private addEntityHitArea(entity: RealmEntity, visual: Phaser.GameObjects.Container) {
          const center = iso(entity.tile);
          const label =
            this.labels.get(entity.id) ??
            this.makeEntityLabel(entity, center.x, center.y - 68, false);
          this.labels.set(entity.id, label);
          const zoneHeight = entity.kind === "tree" ? 126 : entity.kind === "npc" ? 92 : 78;
          const zone = this.add
            .zone(center.x, center.y - zoneHeight / 3, 96, zoneHeight)
            .setDepth(30000)
            .setInteractive({ useHandCursor: true });
          zone.on("pointerover", () => label.setVisible(true));
          zone.on("pointerout", () => {
            if (
              selectedRef.current !== entity.id &&
              !targetsRef.current.includes(entity.id) &&
              entity.kind !== "npc"
            ) {
              label.setVisible(false);
            }
          });
          zone.on(
            "pointerup",
            (
              pointer: Phaser.Input.Pointer,
              _localX: number,
              _localY: number,
              event: Phaser.Types.Input.EventData
            ) => {
              event.stopPropagation();
              if (pointer.leftButtonReleased() || pointer.wasTouch) {
                this.queueInteraction(entity.id);
              }
            }
          );
          visual.setData("entityId", entity.id);
        }

        private createPlayer() {
          const center = iso(this.currentTile);
          this.player = this.add.container(center.x, center.y - 9).setDepth(this.depth(this.currentTile, 10));
          const graphics = this.add.graphics();
          graphics.fillStyle(0x173f38, 0.24);
          graphics.fillEllipse(0, 11, 39, 14);
          graphics.lineStyle(3, 0xf7d878, 0.95);
          graphics.strokeEllipse(0, 9, 44, 18);
          graphics.fillStyle(0x3e6f83, 1);
          graphics.fillTriangle(-14, 5, 14, 5, 0, -34);
          graphics.fillStyle(0xd99b6c, 1);
          graphics.fillCircle(0, -45, 11);
          graphics.fillStyle(0x523c33, 1);
          graphics.fillCircle(0, -49, 11);
          graphics.fillStyle(0xd99b6c, 1);
          graphics.fillCircle(0, -44, 8);
          this.player.add(graphics);
          const playerLabel = this.add.text(0, -68, "YOU · TÚ", {
              color: "#274e43",
              fontFamily: "Arial, sans-serif",
              fontSize: "10px",
              fontStyle: "bold",
              backgroundColor: "rgba(250, 242, 209, 0.88)",
              padding: { x: 6, y: 3 }
            }).setOrigin(0.5);
          this.player.add(playerLabel);
        }

        private createMarkers() {
          this.marker = this.add.graphics().setDepth(50).setVisible(false);
          this.marker.lineStyle(3, 0xf7df79, 0.95);
          this.strokePolygon(this.marker, [
            { x: 0, y: -14 },
            { x: 29, y: 0 },
            { x: 0, y: 14 },
            { x: -29, y: 0 }
          ]);
          this.selection = this.makeHighlight(0x6dd2c7, false);
        }

        private makeHighlight(color: number, pulse: boolean): Phaser.GameObjects.Container {
          const container = this.add.container(0, 0).setDepth(19000).setVisible(false);
          const graphics = this.add.graphics();
          graphics.fillStyle(color, 0.14);
          graphics.fillEllipse(0, 3, 74, 30);
          graphics.lineStyle(3, color, 0.95);
          graphics.strokeEllipse(0, 3, 74, 30);
          container.add(graphics);
          if (pulse) {
            this.tweens.add({
              targets: container,
              scaleX: 1.13,
              scaleY: 1.13,
              alpha: 0.5,
              duration: 760,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut"
            });
          }
          return container;
        }

        private bindInput() {
          this.input.on(
            "pointerup",
            (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
              if (over.length > 0) return;
              if (!pointer.leftButtonReleased() && !pointer.wasTouch) return;
              const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
              const destination = screenToTile(worldPoint.x, worldPoint.y);
              this.queueWalk(destination);
            }
          );

          this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
            const directions: Record<string, TilePoint> = {
              ArrowUp: { x: 0, y: -1 },
              w: { x: 0, y: -1 },
              W: { x: 0, y: -1 },
              ArrowDown: { x: 0, y: 1 },
              s: { x: 0, y: 1 },
              S: { x: 0, y: 1 },
              ArrowLeft: { x: -1, y: 0 },
              a: { x: -1, y: 0 },
              A: { x: -1, y: 0 },
              ArrowRight: { x: 1, y: 0 },
              d: { x: 1, y: 0 },
              D: { x: 1, y: 0 }
            };
            const direction = directions[event.key];
            if (!direction) return;
            event.preventDefault();
            this.queueWalk({
              x: this.currentTile.x + direction.x,
              y: this.currentTile.y + direction.y
            });
          });
        }

        private isBlocked = (point: TilePoint): boolean => {
          if (!isInside(point) || isWater(point) || BUILDING_TILES.has(tileKey(point))) {
            return true;
          }
          for (const entity of Object.values(ENTITY_DEFINITIONS)) {
            if (sameTile(entity.tile, point)) return true;
          }
          return false;
        };

        private nearestReachable(point: TilePoint): TilePoint | null {
          const candidates = [point];
          for (let radius = 1; radius <= 3; radius += 1) {
            for (let dx = -radius; dx <= radius; dx += 1) {
              const dy = radius - Math.abs(dx);
              candidates.push({ x: point.x + dx, y: point.y + dy });
              if (dy !== 0) candidates.push({ x: point.x + dx, y: point.y - dy });
            }
          }
          let best: { point: TilePoint; path: TilePoint[] } | null = null;
          for (const candidate of candidates) {
            if (!isInside(candidate) || this.isBlocked(candidate)) continue;
            const path = findPath(this.currentTile, candidate, this.isBlocked);
            if (path.length > 0 && (!best || path.length < best.path.length)) {
              best = { point: candidate, path };
            }
          }
          return best?.point ?? null;
        }

        private queueWalk(destination: TilePoint) {
          const reachable = this.nearestReachable(destination);
          if (!reachable) {
            setStatus("That part of the valley is not reachable yet.");
            return;
          }
          this.pendingEntity = null;
          this.startRoute(reachable);
          setStatus(`Walking to tile ${reachable.x + 1}, ${reachable.y + 1}.`);
        }

        private queueInteraction(id: EntityId) {
          const entity = ENTITY_DEFINITIONS[id];
          const approach = this.nearestReachable(entity.tile);
          if (!approach) {
            setStatus(`${entity.name} cannot be reached from here.`);
            return;
          }
          this.pendingEntity = id;
          this.startRoute(approach);
          setStatus(`Walking to ${entity.name}.`);
        }

        private startRoute(destination: TilePoint) {
          this.tweens.killTweensOf(this.player);
          const currentPosition = iso(this.currentTile);
          this.player.setPosition(currentPosition.x, currentPosition.y - 9);
          this.moving = false;
          const path = findPath(this.currentTile, destination, this.isBlocked);
          this.route = path.slice(1);
          const markerPosition = iso(destination);
          this.marker.setPosition(markerPosition.x, markerPosition.y).setVisible(true).setAlpha(1);
          if (this.route.length === 0) {
            this.marker.setVisible(false);
            this.finishInteraction();
            return;
          }
          this.walkNextStep();
        }

        private walkNextStep() {
          const next = this.route.shift();
          if (!next) {
            this.moving = false;
            this.marker.setVisible(false);
            this.finishInteraction();
            return;
          }
          this.moving = true;
          const position = iso(next);
          this.tweens.add({
            targets: this.player,
            x: position.x,
            y: position.y - 9,
            duration: 165,
            ease: "Sine.easeInOut",
            onUpdate: () => {
              this.player.setDepth(this.depth(next, 10));
            },
            onComplete: () => {
              this.currentTile = { ...next };
              onMoveRef.current({ ...next });
              this.walkNextStep();
            }
          });
        }

        private finishInteraction() {
          const id = this.pendingEntity;
          this.pendingEntity = null;
          if (!id) return;
          const entity = ENTITY_DEFINITIONS[id];
          if (tileDistance(this.currentTile, entity.tile) <= 1) {
            onSelectRef.current(id);
            setStatus(`${entity.name} selected.`);
          }
        }

        private updateCameraScale(width: number, height: number) {
          const portrait = width < 620 || height > width * 1.22;
          const zoom = portrait ? Math.max(0.72, Math.min(0.9, width / 470)) : 1.02;
          this.cameras.main.setZoom(zoom);
        }

        applyState(nextState: RealmState) {
          this.currentState = nextState;
          if (!this.moving && !sameTile(this.currentTile, nextState.player)) {
            this.currentTile = { ...nextState.player };
            const position = iso(this.currentTile);
            this.player?.setPosition(position.x, position.y - 9);
            this.player?.setDepth(this.depth(this.currentTile, 10));
          }
          for (const id of PLOT_IDS) this.drawPlot(id);
          for (const id of TREE_IDS) {
            const visual = this.treeVisuals.get(id);
            if (!visual) continue;
            const readyAt = nextState.treeReadyAt[id] ?? 0;
            const ready = readyAt <= Date.now();
            visual.tree.setVisible(ready);
            visual.stump.setVisible(!ready);
          }
          const irrigation = this.worldVariants.get("irrigation-gate");
          irrigation?.before.setVisible(!nextState.world.irrigationRepaired);
          irrigation?.after.setVisible(nextState.world.irrigationRepaired);
          const northGate = this.worldVariants.get("north-gate");
          northGate?.before.setVisible(!nextState.world.northRoadOpen);
          northGate?.after.setVisible(nextState.world.northRoadOpen);
        }

        setSelection(selected: EntityId | null, targets: EntityId[]) {
          for (const highlight of this.questHighlights.values()) highlight.destroy();
          this.questHighlights.clear();
          for (const id of targets) {
            const entity = ENTITY_DEFINITIONS[id];
            if (!entity) continue;
            const center = iso(entity.tile);
            const highlight = this.makeHighlight(0xf3d36a, true)
              .setPosition(center.x, center.y + 3)
              .setVisible(true);
            this.questHighlights.set(id, highlight);
            this.labels.get(id)?.setVisible(true);
          }
          if (selected) {
            const entity = ENTITY_DEFINITIONS[selected];
            const center = iso(entity.tile);
            this.selection.setPosition(center.x, center.y + 3).setVisible(true);
            this.labels.get(selected)?.setVisible(true);
          } else {
            this.selection.setVisible(false);
          }
        }
      }

      const gameConfig = {
        type: PhaserRuntime.AUTO,
        parent: mountRef.current,
        width: mountRef.current.clientWidth || 900,
        height: mountRef.current.clientHeight || 620,
        backgroundColor: "#cfe6bc",
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        render: {
          antialias: true,
          roundPixels: true,
          powerPreference: "high-performance"
        },
        scale: {
          mode: PhaserRuntime.Scale.RESIZE,
          autoCenter: PhaserRuntime.Scale.CENTER_BOTH
        },
        audio: { noAudio: true },
        input: { activePointers: 3 },
        scene: RealmScene
      } as Phaser.Types.Core.GameConfig;
      game = new PhaserRuntime.Game(gameConfig);

      const canvas = game.canvas;
      canvas.setAttribute("role", "application");
      canvas.setAttribute("aria-label", "Interactive isometric map of Luma Valley");
      canvas.setAttribute("aria-describedby", instructionId);
      canvas.tabIndex = 0;

      observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry || !game) return;
        const width = Math.max(320, Math.round(entry.contentRect.width));
        const height = Math.max(280, Math.round(entry.contentRect.height));
        game.scale.resize(width, height);
      });
      observer.observe(mountRef.current);
    }

    void boot().catch(() => {
      if (!disposed) {
        setReady(false);
        setStatus("The valley renderer could not start on this device.");
      }
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      sceneRef.current = null;
      game?.destroy(true);
    };
  }, [instructionId]);

  return (
    <section
      aria-label="Luma Valley world"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        borderRadius: "inherit",
        background: "linear-gradient(180deg, #d9ebc5 0%, #b8d59d 100%)",
        boxShadow: "inset 0 0 0 1px rgba(54, 92, 76, 0.16)",
        touchAction: "none"
      }}
    >
      <div
        ref={mountRef}
        style={{ position: "absolute", inset: 0 }}
        onPointerDown={(event) => {
          const canvas = event.currentTarget.querySelector("canvas");
          canvas?.focus({ preventScroll: true });
        }}
      />
      <div
        aria-hidden="true"
        style={{
          display: "none",
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 2,
          maxWidth: "calc(100% - 24px)",
          padding: "8px 11px",
          border: "1px solid rgba(255,255,255,0.44)",
          borderRadius: 999,
          color: "#f8f1d9",
          background: "rgba(38, 70, 58, 0.88)",
          boxShadow: "0 8px 22px rgba(35, 66, 54, 0.17)",
          fontFamily: "Arial, sans-serif",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.01em",
          pointerEvents: "none",
          opacity: ready ? 1 : 0.72,
          transition: "opacity 180ms ease"
        }}
      >
        {ready ? "Tap to walk · tap people and places to interact" : "Opening Luma Valley…"}
      </div>
      <p
        id={instructionId}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0
        }}
      >
        Tap or click a ground tile to walk. Tap a person, tree, plot, or landmark to walk
        beside it and interact. Arrow keys and W A S D also move one tile at a time.
      </p>
      <p
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0
        }}
      >
        {status}
      </p>
    </section>
  );
}
