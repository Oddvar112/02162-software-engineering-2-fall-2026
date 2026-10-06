import type { Direction } from "@/lib/direction";
import { activateBoard } from "@/lib/game/board-elements";
import { neighbour, place, robotAt, turn, wallBetween } from "@/lib/game/grid";
import type { ActionCard, GameState, RobotState } from "@/lib/game/types";

export type Programs = Record<string, ActionCard[]>;

function moveRobot(
  state: GameState,
  robot: RobotState,
  direction: Direction,
  fallen: Set<string>,
): boolean {
  const target = neighbour(robot, direction);
  if (wallBetween(state.board, robot, target)) return false;
  const occupant = robotAt(state, target, fallen);
  if (occupant && !moveRobot(state, occupant, direction, fallen)) return false;
  place(state, robot, target, fallen);
  return true;
}

function reenterRobots(
  state: GameState,
  programs: Programs,
  fallen: Set<string>,
  record: (message: string) => void,
) {
  const waiting = state.robots
    .filter((robot) => robot.rebootTokenId !== null)
    .sort((a, b) => {
      const aPriority = programs[a.playerId]?.[0]?.priority ?? -Infinity;
      const bPriority = programs[b.playerId]?.[0]?.priority ?? -Infinity;
      return bPriority - aPriority;
    });
  const token = state.board.rebootToken.position;
  const tokenPoint = { x: token.x, z: token.y };

  for (const robot of waiting) {
    const occupant = robotAt(state, tokenPoint, fallen);
    if (occupant && !moveRobot(state, occupant, occupant.direction, fallen)) {
      record(`${robot.name} could not reboot: token is blocked`);
      continue;
    }
    robot.x = token.x;
    robot.z = token.y;
    robot.rebootTokenId = null;
    record(`${robot.name} reboots on the Reboot Token`);
  }
}

export function resolveRound(input: GameState, programs: Programs): GameState {
  const state = structuredClone(input);
  const fallen = new Set<string>();
  state.executionLog = [];
  state.executionFrames = [];
  const recordFrame = (
    register: number,
    cardId: string | null,
    message: string,
  ) => {
    state.executionFrames.push({
      register,
      cardId,
      message,
      robots: structuredClone(state.robots),
      players: structuredClone(state.players),
    });
  };
  recordFrame(0, null, "Executing programs…");
  reenterRobots(state, programs, fallen, (message) =>
    recordFrame(1, null, `Register 1: ${message}`),
  );

  for (let register = 0; register < state.registerCount; register++) {
    const actions = state.players
      .filter((player) => programs[player.id]?.[register])
      .map((player) => ({ player, card: programs[player.id][register] }))
      .sort((a, b) => b.card.priority - a.card.priority);

    for (const { player, card } of actions) {
      const robot = state.robots.find(
        (candidate) => candidate.id === player.robotId,
      )!;
      if (robot.rebootTokenId !== null || fallen.has(robot.id)) continue;
      state.executionLog.push({
        register: register + 1,
        playerId: player.id,
        card: { ...card },
      });
      const label = `${player.name} · ${card.name}`;
      if (card.type === "rotate") {
        robot.direction = turn(robot.direction, card.value);
        recordFrame(
          register + 1,
          card.id,
          `Register ${register + 1}: ${label}`,
        );
      } else {
        const direction =
          card.type === "backup" ? turn(robot.direction, 2) : robot.direction;
        for (let step = 0; step < Math.abs(card.value); step++) {
          const moved = moveRobot(state, robot, direction, fallen);
          const outcome = !moved
            ? "Path blocked"
            : fallen.has(robot.id)
              ? "Robot fell — rebooting after the round"
              : `Step ${step + 1}/${Math.abs(card.value)}`;
          recordFrame(
            register + 1,
            card.id,
            `Register ${register + 1}: ${label} · ${outcome}`,
          );
          if (!moved || fallen.has(robot.id)) break;
        }
      }
    }

    activateBoard(state, fallen, (message) =>
      recordFrame(register + 1, null, `Register ${register + 1}: ${message}`),
    );

    for (const player of state.players) {
      const robot = state.robots.find(
        (candidate) => candidate.id === player.robotId,
      );
      if (!robot || robot.rebootTokenId !== null || fallen.has(robot.id)) {
        continue;
      }
      const tile = state.board.tiles[robot.z]?.[robot.x];
      if (
        tile.kind === "checkpoint" &&
        tile.number === player.checkpointsReached + 1
      ) {
        player.checkpointsReached++;
      }
    }
  }

  recordFrame(0, null, "Round complete");
  state.phase = "end-of-round";
  return state;
}
