import type { Board } from "@/lib/board";
import { Direction } from "@/lib/direction";
import type { GameState, RobotState } from "@/lib/game/types";
import type { Tile } from "@/lib/tile";

export type Point = { x: number; z: number };

const DIRECTIONS: Direction[] = [
  Direction.Up,
  Direction.Right,
  Direction.Down,
  Direction.Left,
];

const STEPS: Record<Direction, [number, number]> = {
  [Direction.Up]: [0, -1],
  [Direction.Right]: [1, 0],
  [Direction.Down]: [0, 1],
  [Direction.Left]: [-1, 0],
};

export function turn(direction: Direction, amount: number): Direction {
  return DIRECTIONS[(DIRECTIONS.indexOf(direction) + amount + 4) % 4];
}

export function neighbour(from: Point, direction: Direction): Point {
  const [dx, dz] = STEPS[direction];
  return { x: from.x + dx, z: from.z + dz };
}

export function tileAt(board: Board, { x, z }: Point): Tile | undefined {
  return board.tiles[z]?.[x];
}

export function wallBetween(board: Board, from: Point, to: Point): boolean {
  return board.walls.some(
    ({ One, Two }) =>
      (One.x === from.x &&
        One.y === from.z &&
        Two.x === to.x &&
        Two.y === to.z) ||
      (Two.x === from.x &&
        Two.y === from.z &&
        One.x === to.x &&
        One.y === to.z),
  );
}

export function robotAt(
  state: GameState,
  at: Point,
  fallen: Set<string>,
): RobotState | undefined {
  return state.robots.find(
    (robot) =>
      robot.rebootTokenId === null &&
      !fallen.has(robot.id) &&
      robot.x === at.x &&
      robot.z === at.z,
  );
}

export function place(
  state: GameState,
  robot: RobotState,
  to: Point,
  fallen: Set<string>,
) {
  robot.x = to.x;
  robot.z = to.z;
  const tile = tileAt(state.board, to);
  if (tile && tile.kind !== "pit") return;
  robot.rebootTokenId = state.board.rebootToken.id;
  fallen.add(robot.id);
}
