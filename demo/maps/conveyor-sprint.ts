import { Direction } from "@/lib/direction";
import type { Tile } from "@/lib/tile";
import type { DemoBoard } from "../types";

const LEGEND: Record<string, Tile> = {
  ".": { kind: "floor" },
  "#": { kind: "pit" },
  "1": { kind: "checkpoint", number: 1 },
  "2": { kind: "checkpoint", number: 2 },
  "3": { kind: "checkpoint", number: 3 },
  "^": { kind: "conveyor", direction: Direction.Up, express: false },
  ">": { kind: "conveyor", direction: Direction.Right, express: false },
  v: { kind: "conveyor", direction: Direction.Down, express: false },
  "<": { kind: "conveyor", direction: Direction.Left, express: false },
  E: { kind: "conveyor", direction: Direction.Up, express: true },
  R: { kind: "conveyor", direction: Direction.Right, express: true },
  D: { kind: "conveyor", direction: Direction.Down, express: true },
  L: { kind: "conveyor", direction: Direction.Left, express: true },
  c: { kind: "gear", clockwise: true },
  a: { kind: "gear", clockwise: false },
  p: { kind: "repair" },
};

const LAYOUT = [
  "...1....2.",
  "..>>>>>v..",
  "..^....v..",
  "..^.3..v..",
  "..^RRRRv..",
  "..^....v..",
  "..^<<<<<..",
  "....#..#..",
  "..........",
  "..........",
];

export const conveyorSprintBoard: DemoBoard = {
  id: "demo-conveyor-sprint",
  isDemo: true,
  name: "Conveyor Sprint",
  description:
    "A dynamic circuit featuring loops of standard and express conveyor belts, turning corners, and 3 sequential checkpoints.",
  difficulty: "Beginner",
  width: 10,
  height: 10,
  tiles: LAYOUT.map((line) =>
    [...line].map((char) => LEGEND[char] ?? { kind: "floor" }),
  ),
  walls: [
    { One: { x: 2, y: 1 }, Two: { x: 2, y: 2 } },
    { One: { x: 7, y: 1 }, Two: { x: 7, y: 2 } },
    { One: { x: 4, y: 3 }, Two: { x: 4, y: 4 } },
  ],
  startpositions: Array.from({ length: 8 }, (_, x) => ({ x: x + 1, y: 9 })),
};
