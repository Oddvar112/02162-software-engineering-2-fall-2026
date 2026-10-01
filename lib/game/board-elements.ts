import {
  neighbour,
  place,
  robotAt,
  tileAt,
  turn,
  wallBetween,
} from "@/lib/game/grid";
import type { GameState, RobotState } from "@/lib/game/types";
import type { ConveyorTile } from "@/lib/tile";

type Carry = { robot: RobotState; belt: ConveyorTile; x: number; z: number };

function carries(
  state: GameState,
  fallen: Set<string>,
  expressOnly: boolean,
): Carry[] {
  return state.robots.flatMap((robot): Carry[] => {
    const belt = tileAt(state.board, robot);
    if (fallen.has(robot.id) || belt?.kind !== "conveyor") return [];
    if (expressOnly && !belt.express) return [];
    const target = neighbour(robot, belt.direction);
    if (wallBetween(state.board, robot, target)) return [];
    return [{ robot, belt, ...target }];
  });
}

function settle(
  state: GameState,
  fallen: Set<string>,
  moves: Carry[],
): Carry[] {
  const allowed = moves.filter((move) => {
    const contested = moves.some(
      (other) => other !== move && other.x === move.x && other.z === move.z,
    );
    const occupant = robotAt(state, move, fallen);
    const leaving = moves.find((other) => other.robot === occupant);
    const swap = leaving?.x === move.robot.x && leaving?.z === move.robot.z;
    return !contested && (!occupant || (leaving !== undefined && !swap));
  });
  return allowed.length === moves.length
    ? moves
    : settle(state, fallen, allowed);
}

function moveConveyors(
  state: GameState,
  fallen: Set<string>,
  expressOnly: boolean,
): boolean {
  const moves = settle(state, fallen, carries(state, fallen, expressOnly));
  for (const { robot, belt, x, z } of moves) {
    place(state, robot, { x, z }, fallen);
    const next = tileAt(state.board, robot);
    if (next?.kind !== "conveyor") continue;
    const bend = (next.direction - belt.direction + 4) % 4;
    if (bend === 1) robot.direction = turn(robot.direction, 1);
    if (bend === 3) robot.direction = turn(robot.direction, -1);
  }
  return moves.length > 0;
}

function turnGears(state: GameState, fallen: Set<string>): boolean {
  let turned = false;
  for (const robot of state.robots) {
    const gear = tileAt(state.board, robot);
    if (fallen.has(robot.id) || gear?.kind !== "gear") continue;
    robot.direction = turn(robot.direction, gear.clockwise ? 1 : -1);
    turned = true;
  }
  return turned;
}

export function activateBoard(
  state: GameState,
  fallen: Set<string>,
  record: (message: string) => void,
) {
  if (moveConveyors(state, fallen, true)) record("Express conveyors move");
  if (moveConveyors(state, fallen, false)) record("Conveyors move");
  if (turnGears(state, fallen)) record("Gears turn");
}
