import { Direction } from "@/lib/direction";
import type { Tile } from "@/lib/tile";
import type { DemoBoard } from "../types";

const LEGEND: Record<string, Tile> = {
  ".": { kind: "floor" },
  "#": { kind: "pit" },
  "1": { kind: "checkpoint", number: 1 },
  "2": { kind: "checkpoint", number: 2 },
  "3": { kind: "checkpoint", number: 3 },
  "4": { kind: "checkpoint", number: 4 },
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
};

// Column 0 (x=0) is the immediate line to the left of Player 1 (starting at x=1, y=9).
// It contains a full showcase strip representing every currently implemented field:
// Checkpoint 1, Floor, Pit, Counter-Clockwise Gear, Clockwise Gear, Express Conveyor, Regular Conveyors, and Floor.
const LAYOUT = [
  "1...c..a.2", // y=0: Checkpoint 1 (col 0) & Checkpoint 2 (col 9)
  ".<.RRRRR.#", // y=1: Floor (col 0), express conveyor highway
  "#...<<<a..", // y=2: Pit (col 0), conveyor return line to gear
  "a...##....", // y=3: Gear counter-clockwise (col 0), pits guarding center
  "c.a.34..c.", // y=4: Gear clockwise (col 0), Checkpoints 3 & 4
  "E...##....", // y=5: Express conveyor up (col 0), pits guarding center
  "^..a>>>c..", // y=6: Conveyor up (col 0), conveyor transfer between gears
  ">......##.", // y=7: Conveyor right (col 0), corner pits
  "..^..^....", // y=8: Floor (col 0), feeder conveyors
  "..........", // y=9: Floor (col 0 directly beside Player 1), 8 player starting positions
];

export const gearWorksBoard: DemoBoard = {
  id: "demo-gear-works",
  isDemo: true,
  name: "Gearworks & Pits",
  description:
    "An interactive arena featuring standard & express conveyors, rotating gears, pits, and a complete showcase line of every implemented field immediately to the player's left.",
  difficulty: "Intermediate",
  width: 10,
  height: 10,
  tiles: LAYOUT.map((line) =>
    [...line].map((char) => LEGEND[char] ?? { kind: "floor" }),
  ),
  walls: [
    { One: { x: 3, y: 0 }, Two: { x: 4, y: 0 } },
    { One: { x: 6, y: 0 }, Two: { x: 7, y: 0 } },
    { One: { x: 3, y: 4 }, Two: { x: 4, y: 4 } },
    { One: { x: 5, y: 4 }, Two: { x: 6, y: 4 } },
    { One: { x: 0, y: 4 }, Two: { x: 1, y: 4 } },
  ],
  startpositions: Array.from({ length: 8 }, (_, x) => ({ x: x + 1, y: 9 })),
};
