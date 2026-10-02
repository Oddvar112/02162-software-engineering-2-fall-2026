import type { Board } from "@/lib/board";
import {
  neighbour,
  place,
  robotAt,
  tileAt,
  turn,
  wallBetween,
  type Point,
} from "@/lib/game/grid";
import type { GameState, RobotState } from "@/lib/game/types";
import type { ConveyorTile } from "@/lib/tile";

type Carry = { robot: RobotState; belt: ConveyorTile; x: number; z: number };

function isTurning(board: Board, at: Point, belt: ConveyorTile): boolean {
  return [1, -1].some((side) => {
    const feeder = tileAt(board, neighbour(at, turn(belt.direction, side)));
    return (
      feeder?.kind === "conveyor" &&
      feeder.direction === turn(belt.direction, side + 2)
    );
  });
}

function moveConveyors(state: GameState, fallen: Set<string>): boolean {
  const carries = state.robots.flatMap((robot): Carry[] => {
    const belt = tileAt(state.board, robot);
    if (belt?.kind !== "conveyor") return [];
    const target = neighbour(robot, belt.direction);
    if (wallBetween(state.board, robot, target)) return [];
    return [{ robot, belt, ...target }];
  });
  const allowed = carries.filter(
    (carry) =>
      !robotAt(state, carry, fallen) &&
      !carries.some(
        (other) =>
          other !== carry && other.x === carry.x && other.z === carry.z,
      ),
  );
  for (const { robot, belt, x, z } of allowed) {
    if (isTurning(state.board, robot, belt)) robot.direction = belt.direction;
    place(state, robot, { x, z }, fallen);
  }
  return allowed.length > 0;
}

function turnGears(state: GameState): boolean {
  let turned = false;
  for (const robot of state.robots) {
    const gear = tileAt(state.board, robot);
    if (gear?.kind !== "gear") continue;
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
  if (moveConveyors(state, fallen)) record("Conveyors move");
  if (turnGears(state)) record("Gears turn");
}
