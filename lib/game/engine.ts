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

function rebootFallen(
  state: GameState,
  starts: RobotState[],
  fallen: Set<string>,
) {
  for (const robot of state.robots.filter((candidate) =>
    fallen.has(candidate.id),
  )) {
    const start = starts.find((candidate) => candidate.id === robot.id)!;
    const tiles = Array.from(
      { length: state.board.width * state.board.height },
      (_, index) => ({
        x: index % state.board.width,
        z: Math.floor(index / state.board.width),
      }),
    ).sort(
      (a, b) =>
        Math.abs(a.x - start.x) +
        Math.abs(a.z - start.z) -
        (Math.abs(b.x - start.x) + Math.abs(b.z - start.z)),
    );
    const tile = tiles.find(
      ({ x, z }) =>
        state.board.tiles[z][x].kind !== "pit" &&
        !state.robots.some(
          (other) => !fallen.has(other.id) && other.x === x && other.z === z,
        ),
    );
    if (tile) Object.assign(robot, tile, { direction: start.direction });
    fallen.delete(robot.id);
  }
}

export function resolveRound(input: GameState, programs: Programs): GameState {
  const state = structuredClone(input);
  const fallen = new Set<string>();
  const starts = structuredClone(state.robots);
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

  for (let register = 0; register < state.registerCount; register++) {
    const actions = state.players
      .filter((player) => programs[player.id]?.[register])
      .map((player) => ({ player, card: programs[player.id][register] }))
      .sort((a, b) => b.card.priority - a.card.priority);

    for (const { player, card } of actions) {
      const robot = state.robots.find(
        (candidate) => candidate.id === player.robotId,
      )!;
      if (fallen.has(robot.id)) continue;
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
      if (!robot || fallen.has(robot.id)) continue;
      const tile = state.board.tiles[robot.z][robot.x];
      if (
        tile.kind === "checkpoint" &&
        tile.number === player.checkpointsReached + 1
      ) {
        player.checkpointsReached++;
      }
    }
  }

  rebootFallen(state, starts, fallen);
  state.robots = state.robots.filter((robot) =>
    state.players.some((player) => player.robotId === robot.id),
  );
  recordFrame(0, null, "Round complete");
  state.phase = "end-of-round";
  return state;
}
