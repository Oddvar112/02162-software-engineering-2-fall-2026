import type { Tile } from "@/lib/tile";
import type { DemoBoard } from "../types";

const LEGEND: Record<string, Tile> = {
  ".": { kind: "floor" },
  "#": { kind: "pit" },
  "1": { kind: "checkpoint", number: 1 },
  "2": { kind: "checkpoint", number: 2 },
  "3": { kind: "checkpoint", number: 3 },
  "4": { kind: "checkpoint", number: 4 },
  c: { kind: "gear", clockwise: true },
  a: { kind: "gear", clockwise: false },
};

const LAYOUT = [
  "1...c..a.2",
  ".##......#",
  "..c...a...",
  "....##....",
  ".a..34..c.",
  "....##....",
  "...a...c..",
  "#......##.",
  "..........",
  "..........",
];

export const gearWorksBoard: DemoBoard = {
  id: "demo-gear-works",
  isDemo: true,
  name: "Gearworks & Pits",
  description:
    "A challenging puzzle arena surrounded by rotating gears, pit traps, and paired central checkpoints.",
  difficulty: "Advanced",
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
  ],
  startpositions: Array.from({ length: 8 }, (_, x) => ({ x: x + 1, y: 9 })),
};
