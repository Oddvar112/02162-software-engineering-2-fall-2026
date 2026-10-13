import { Direction } from "@/lib/direction";
import type { Tile } from "@/lib/tile";
import type { DemoBoard } from "../types";

const LEGEND: Record<string, Tile> = {
  ".": { kind: "floor" },
  "#": { kind: "pit" },
  "1": { kind: "checkpoint", number: 1 },
  "2": { kind: "checkpoint", number: 2 },
  "3": { kind: "checkpoint", number: 3 },
  "|": { kind: "laser", direction: Direction.Down, strength: 1 },
  "-": { kind: "laser", direction: Direction.Right, strength: 1 },
  P: { kind: "pusher", direction: Direction.Right },
  p: { kind: "repair" },
  "^": { kind: "conveyor", direction: Direction.Up, express: false },
  ">": { kind: "conveyor", direction: Direction.Right, express: false },
};

const LAYOUT = [
  "....1.....",
  "..|....|..",
  "..|..2.|..",
  ".P-....-.P",
  "....#.....",
  "..|....|..",
  "..|..3.|..",
  "....p.....",
  "..........",
  "..........",
];

export const laserGauntletBoard: DemoBoard = {
  id: "demo-laser-gauntlet",
  isDemo: true,
  name: "Laser Gauntlet",
  description:
    "A tactical corridor packed with laser emitters, pushers, and barricades demanding precise robot navigation.",
  difficulty: "Intermediate",
  width: 10,
  height: 10,
  tiles: LAYOUT.map((line) =>
    [...line].map((char) => LEGEND[char] ?? { kind: "floor" }),
  ),
  walls: [
    { One: { x: 3, y: 1 }, Two: { x: 4, y: 1 } },
    { One: { x: 5, y: 1 }, Two: { x: 6, y: 1 } },
    { One: { x: 3, y: 5 }, Two: { x: 4, y: 5 } },
    { One: { x: 5, y: 5 }, Two: { x: 6, y: 5 } },
    { One: { x: 4, y: 3 }, Two: { x: 4, y: 4 } },
  ],
  startpositions: Array.from({ length: 8 }, (_, x) => ({ x: x + 1, y: 9 })),
};
