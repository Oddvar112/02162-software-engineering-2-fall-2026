import type { Board } from "@/lib/board";
import { Direction } from "@/lib/direction";

// The demo reads its entire layout and robot spawn positions from this file.
// Tiles are rows: tiles[y][x]. Keep width/height consistent with the grid.
export const staticBoard: Board = {
  id: "test-board",
  width: 4,
  height: 4,
  tiles: [
    [
      { kind: "floor" },
      { kind: "floor" },
      { kind: "floor" },
      { kind: "checkpoint", number: 1 },
    ],
    [
      { kind: "floor" },
      { kind: "conveyor", direction: Direction.Right, express: false },
      { kind: "conveyor", direction: Direction.Right, express: false },
      { kind: "floor" },
    ],
    [
      { kind: "floor" },
      { kind: "floor" },
      { kind: "floor" },
      { kind: "floor" },
    ],
    [
      { kind: "floor" },
      { kind: "floor" },
      { kind: "floor" },
      { kind: "floor" },
    ],
  ],
  walls: [{ One: { x: 1, y: 2 }, Two: { x: 2, y: 2 } }],
  startpositions: [
    { x: 0, y: 3 },
    { x: 1, y: 3 },
  ],
};
