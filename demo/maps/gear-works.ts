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

// Player 1 spawns at (1, 9) facing Up.
// The track directly in front of the player (column 1 & partner lane column 2)
// showcases every currently implemented field:
// Conveyor (^), Express Conveyor (E), Clockwise Gear (c), Counter-Clockwise Gear (a),
// Conveyors (<, >) routing around Pit (#), and Checkpoint 1 (1).
// If the player simply walks straight forward, the board mechanics keep them on track
// and advance them toward the checkpoint.
const LAYOUT = [
  ".1..c..a.2", // y=0: Checkpoint 1 at (1,0) & Checkpoint 2 at (9,0)
  "..<.RRRRR.", // y=1: Floor at (1,1), Express conveyor highway
  "..<<...a..", // y=2: Floor at (1,2), Conveyor West at (2,2) returning to col 1
  ".#..##....", // y=3: Pit at (1,3), Floor bypass lane at (2,3), center pits
  ".>..34..c.", // y=4: Conveyor East at (1,4) detouring to col 2, Checkpoints 3 & 4
  "..<.##....", // y=5: Floor at (1,5), Conveyor West at (2,5) returning to col 1
  ".caa>>>c..", // y=6: Clockwise Gear at (1,6), Counter-Clockwise Gear at (2,6)
  ".E.....##.", // y=7: Express Conveyor Up at (1,7)
  ".^.^..^...", // y=8: Conveyor Up at (1,8) directly in front of Player 1
  "..........", // y=9: Start line for 8 players; Player 1 is at (1,9)
];

export const gearWorksBoard: DemoBoard = {
  id: "demo-gear-works",
  isDemo: true,
  name: "Gearworks & Pits",
  description:
    "An interactive arena featuring a self-guiding showcase track directly in front of Player 1 with conveyors, gears, and pit detours that keep the robot on track toward Checkpoint 1.",
  difficulty: "Intermediate",
  width: 10,
  height: 10,
  tiles: LAYOUT.map((line) =>
    [...line].map((char) => LEGEND[char] ?? { kind: "floor" }),
  ),
  walls: [
    { One: { x: 2, y: 6 }, Two: { x: 3, y: 6 } }, // East guardrail on gear 'a'
    { One: { x: 2, y: 4 }, Two: { x: 3, y: 4 } }, // East guardrail on pit detour
    { One: { x: 2, y: 3 }, Two: { x: 3, y: 3 } }, // East guardrail beside pit
    { One: { x: 0, y: 5 }, Two: { x: 1, y: 5 } }, // West guardrail on col 1 return
    { One: { x: 0, y: 2 }, Two: { x: 1, y: 2 } }, // West guardrail on col 1 return
    { One: { x: 3, y: 0 }, Two: { x: 4, y: 0 } },
    { One: { x: 6, y: 0 }, Two: { x: 7, y: 0 } },
  ],
  startpositions: Array.from({ length: 8 }, (_, x) => ({ x: x + 1, y: 9 })),
};
