import type { Board } from "@/lib/board";
import { Direction } from "@/lib/direction";
import type { Tile } from "@/lib/tile";

const LEGEND: Record<string, Tile> = {
  ".": { kind: "floor" },
  "#": { kind: "pit" },
  "1": { kind: "checkpoint", number: 1 },
  "^": { kind: "conveyor", direction: Direction.Up, express: false },
  "<": { kind: "conveyor", direction: Direction.Left, express: false },
  ">": { kind: "conveyor", direction: Direction.Right, express: false },
  c: { kind: "gear", clockwise: true },
  a: { kind: "gear", clockwise: false },
};

const LAYOUT = [
  ".........1",
  "..........",
  "..>>>>>^..",
  "...#......",
  ".^......a.",
  ".^..c.#...",
  ".^#.......",
  ".....<<<<.",
  "..........",
  "..........",
];

export const staticBoard: Board = {
  id: "factory-floor",
  width: 10,
  height: 10,
  tiles: LAYOUT.map((line) => [...line].map((symbol) => LEGEND[symbol])),
  walls: [
    { One: { x: 4, y: 5 }, Two: { x: 4, y: 4 } },
    { One: { x: 5, y: 5 }, Two: { x: 5, y: 4 } },
    { One: { x: 8, y: 1 }, Two: { x: 9, y: 1 } },
    { One: { x: 1, y: 7 }, Two: { x: 2, y: 7 } },
  ],
  startpositions: Array.from({ length: 8 }, (_, x) => ({ x: x + 1, y: 9 })),
};
