import type { Board } from "@/lib/board";
import type { Tile } from "@/lib/tile";

const floor: Tile = { kind: "floor" };
const pit: Tile = { kind: "pit" };
const checkpoint: Tile = { kind: "checkpoint", number: 1 };

const row = (...tiles: Tile[]): Tile[] => tiles;
const floors = (count: number): Tile[] =>
  Array.from({ length: count }, () => floor);

export const staticBoard: Board = {
  id: "factory-floor",
  width: 10,
  height: 10,
  tiles: [
    row(...floors(9), checkpoint),
    row(...floors(10)),
    row(...floors(3), pit, ...floors(6)),
    row(...floors(10)),
    row(...floors(6), pit, ...floors(3)),
    row(...floors(10)),
    row(...floors(2), pit, ...floors(7)),
    row(...floors(10)),
    row(...floors(10)),
    row(...floors(10)),
  ],
  walls: [
    { One: { x: 4, y: 5 }, Two: { x: 4, y: 4 } },
    { One: { x: 5, y: 5 }, Two: { x: 5, y: 4 } },
    { One: { x: 8, y: 1 }, Two: { x: 9, y: 1 } },
    { One: { x: 1, y: 7 }, Two: { x: 2, y: 7 } },
  ],
  startpositions: Array.from({ length: 8 }, (_, x) => ({ x: x + 1, y: 9 })),
};
