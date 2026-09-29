import { Direction } from "@/lib/direction";
import type { ActionCard, GameState, RobotState } from "@/lib/game/types";

export type Programs = Record<string, ActionCard[]>;

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

function moveRobot(
  state: GameState,
  robot: RobotState,
  direction: Direction,
  fallen: Set<string>,
): boolean {
  const [dx, dz] = STEPS[direction];
  const x = robot.x + dx;
  const z = robot.z + dz;
  const blocked = state.board.walls.some(
    ({ One, Two }) =>
      (One.x === robot.x && One.y === robot.z && Two.x === x && Two.y === z) ||
      (Two.x === robot.x && Two.y === robot.z && One.x === x && One.y === z),
  );
  if (blocked) return false;

  const occupant = state.robots.find(
    (other) =>
      other.id !== robot.id &&
      !fallen.has(other.id) &&
      other.x === x &&
      other.z === z,
  );
  if (occupant && !moveRobot(state, occupant, direction, fallen)) return false;
  robot.x = x;
  robot.z = z;
  if (
    x < 0 ||
    z < 0 ||
    x >= state.board.width ||
    z >= state.board.height ||
    state.board.tiles[z][x].kind === "pit"
  ) {
    fallen.add(robot.id);
    const player = state.players.find(
      (candidate) => candidate.id === robot.playerId,
    )!;
    player.lives = Math.max(0, player.lives - 1);
  }
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
    const player = state.players.find(
      (candidate) => candidate.id === robot.playerId,
    )!;
    if (player.lives === 0) continue;
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

export function resolveRound(state: GameState, programs: Programs) {
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
      .filter((player) => player.lives > 0 && programs[player.id]?.[register])
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

    for (const player of state.players) {
      const robot = state.robots.find(
        (candidate) => candidate.id === player.robotId,
      );
      if (!robot || player.lives === 0 || fallen.has(robot.id)) continue;
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
    state.players.some(
      (player) => player.robotId === robot.id && player.lives > 0,
    ),
  );
  recordFrame(0, null, "Round complete");
  state.phase = "end-of-round";
}
