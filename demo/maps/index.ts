import type { Board } from "@/lib/board";
import type { DemoBoard, DemoMapMeta } from "../types";
import { gearWorksBoard } from "./gear-works";

export { gearWorksBoard } from "./gear-works";

export const DEMO_MAPS: DemoBoard[] = [gearWorksBoard];

export const DEFAULT_DEMO_MAP_ID = gearWorksBoard.id;

export function getDemoBoard(id: string): DemoBoard | undefined {
  return DEMO_MAPS.find((map) => map.id === id);
}

export function isDemoBoard(
  board: Partial<Board> | null | undefined,
): board is DemoBoard {
  if (!board) return false;
  if ("isDemo" in board && board.isDemo === true) return true;
  if (typeof board.id === "string" && board.id.startsWith("demo-")) return true;
  return false;
}

export function countCheckpoints(board: Board): number {
  return board.tiles.flat().filter((tile) => tile.kind === "checkpoint").length;
}

function extractFeatures(board: DemoBoard): string[] {
  const kinds = new Set(board.tiles.flat().map((t) => t.kind));
  const features: string[] = [];
  if (kinds.has("conveyor")) features.push("Conveyors");
  if (kinds.has("laser")) features.push("Lasers");
  if (kinds.has("pusher")) features.push("Pushers");
  if (kinds.has("gear")) features.push("Gears");
  if (kinds.has("pit")) features.push("Pits");
  if (kinds.has("repair")) features.push("Repairs");
  if (board.walls.length > 0) features.push("Walls");
  return features;
}

export function getDemoMapMeta(board: DemoBoard): DemoMapMeta {
  return {
    id: board.id,
    name: board.name,
    description: board.description,
    difficulty: board.difficulty ?? "Beginner",
    width: board.width,
    height: board.height,
    checkpointCount: countCheckpoints(board),
    features: extractFeatures(board),
  };
}

export function getAllDemoMapsMeta(): DemoMapMeta[] {
  return DEMO_MAPS.map(getDemoMapMeta);
}
