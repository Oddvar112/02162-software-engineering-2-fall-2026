import { getMockGameState } from "@/lib/game/mock-game-state";
import type {
  ActionCard,
  Direction,
  GameState,
  RobotState,
} from "@/lib/game/types";

export class ProgramError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type MockGame = {
  state: GameState;
  hands: Record<string, ActionCard[]>;
  programs: Record<string, ActionCard[]>;
};

export function createMockGame(): MockGame {
  const state = getMockGameState();
  return {
    state,
    hands: Object.fromEntries(
      state.players.map((player, index) => [
        player.id,
        state.currentPlayerCards.map((card) => ({
          ...card,
          id: `${player.id}-${card.id}`,
          priority: card.priority + index,
        })),
      ]),
    ),
    programs: {},
  };
}

function requirePlayer(game: MockGame, playerId: string) {
  const player = game.state.players.find(
    (candidate) => candidate.id === playerId,
  );
  if (!player) throw new ProgramError("This player is not in the game.", 404);
  return player;
}

export function getPlayerSnapshot(game: MockGame, playerId: string): GameState {
  requirePlayer(game, playerId);
  return structuredClone({
    ...game.state,
    executionFrames: game.state.executionFrames ?? [],
    currentPlayerId: playerId,
    currentPlayerCards: game.hands[playerId],
    currentPlayerProgram: game.programs[playerId] ?? [],
  });
}

const DIRECTIONS: Direction[] = ["north", "east", "south", "west"];
const STEPS: Record<Direction, [number, number]> = {
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
};

function turn(direction: Direction, amount: number): Direction {
  return DIRECTIONS[(DIRECTIONS.indexOf(direction) + amount + 4) % 4];
}

// Resolve a single step, including walls on either side and chains of pushed robots.
function moveRobot(
  state: GameState,
  robot: RobotState,
  direction: Direction,
  fallen: Set<string>,
): boolean {
  const [dx, dz] = STEPS[direction];
  const x = robot.x + dx;
  const z = robot.z + dz;
  const blocked = state.board.elements.some(
    (element) =>
      element.type === "wall" &&
      ((element.x === robot.x &&
        element.z === robot.z &&
        element.side === direction) ||
        (element.x === x &&
          element.z === z &&
          element.side === turn(direction, 2))),
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
    state.board.elements.some(
      (element) => element.type === "pit" && element.x === x && element.z === z,
    )
  ) {
    fallen.add(robot.id);
    const player = state.players.find(
      (candidate) => candidate.id === robot.playerId,
    )!;
    player.lives = Math.max(0, player.lives - 1);
  }
  return true;
}

function resolveProgram(game: MockGame, playerId: string) {
  const { state, programs } = game;
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
  recordFrame(0, null, "Starting your program…");
  for (let register = 0; register < state.registerCount; register++) {
    const actions = state.players
      .filter((player) => player.id === playerId && player.lives > 0)
      .map((player) => ({ player, card: programs[player.id][register] }));
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
      if (card.type === "rotate") {
        robot.direction = turn(robot.direction, card.value);
        recordFrame(
          register + 1,
          card.id,
          `Card ${register + 1}: ${card.name}`,
        );
      } else {
        const direction =
          card.type === "backup" ? turn(robot.direction, 2) : robot.direction;
        for (let step = 0; step < Math.abs(card.value); step++) {
          const moved = moveRobot(state, robot, direction, fallen);
          const outcome = !moved
            ? "Path blocked"
            : fallen.has(robot.id)
              ? "Robot fell — rebooting after the program"
              : `Step ${step + 1}/${Math.abs(card.value)}`;
          recordFrame(
            register + 1,
            card.id,
            `Card ${register + 1}: ${card.name} · ${outcome}`,
          );
          if (!moved || fallen.has(robot.id)) break;
        }
      }
    }
    // Checkpoints count in order, at the end of a register.
    for (const player of state.players.filter(
      (candidate) => candidate.id === playerId,
    )) {
      const robot = state.robots.find(
        (candidate) => candidate.id === player.robotId,
      )!;
      if (player.lives === 0 || fallen.has(robot.id)) continue;
      if (
        state.board.elements.some(
          (element) =>
            element.type === "checkpoint" &&
            element.x === robot.x &&
            element.z === robot.z &&
            element.order === player.checkpointsReached + 1,
        )
      ) {
        player.checkpointsReached++;
      }
    }
  }
  // The mock game reboots surviving fallen robots near their turn-start tile.
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
        !state.board.elements.some(
          (element) =>
            element.type === "pit" && element.x === x && element.z === z,
        ) &&
        !state.robots.some(
          (other) => !fallen.has(other.id) && other.x === x && other.z === z,
        ),
    );
    if (tile) Object.assign(robot, tile, { direction: start.direction });
    fallen.delete(robot.id);
  }
  state.robots = state.robots.filter((robot) =>
    state.players.some(
      (player) => player.robotId === robot.id && player.lives > 0,
    ),
  );
  recordFrame(0, null, "Program complete");
  state.phase = "end-of-round";
}

export function submitProgram(
  game: MockGame,
  playerId: string,
  round: unknown,
  cardIds: unknown,
) {
  const player = requirePlayer(game, playerId);
  if (round !== game.state.round)
    throw new ProgramError(
      "The round has changed. Refresh the game and program this round.",
      409,
    );
  if (player.programLocked)
    throw new ProgramError("Your program is already locked in.", 409);
  if (game.state.phase !== "programming" && game.state.phase !== "waiting")
    throw new ProgramError("Programs cannot be submitted in this phase.", 409);
  if (player.lives === 0)
    throw new ProgramError("This robot has no lives remaining.", 409);
  if (
    !Array.isArray(cardIds) ||
    cardIds.length !== game.state.registerCount ||
    cardIds.some((id) => typeof id !== "string")
  ) {
    throw new ProgramError(
      `Select exactly ${game.state.registerCount} cards before locking in.`,
    );
  }
  if (new Set(cardIds).size !== cardIds.length)
    throw new ProgramError("Each card can only be used once.");
  const cards = cardIds.map((id) =>
    game.hands[playerId].find((card) => card.id === id),
  );
  if (cards.some((card) => !card))
    throw new ProgramError(
      "Your program contains a card that is not in your hand. Refresh and try again.",
    );
  game.programs[playerId] = cards.map((card) => ({ ...card! }));
  player.programmedCardCount = cards.length;
  player.programLocked = true;
  // Solo demo: resolve only the submitted program immediately.
  resolveProgram(game, playerId);
  game.state.updatedAt = new Date().toISOString();
}

export function startNextRound(
  game: MockGame,
  playerId: string,
  round: unknown,
) {
  requirePlayer(game, playerId);
  if (round !== game.state.round || game.state.phase !== "end-of-round")
    throw new ProgramError(
      "This round is not ready to advance. Refresh the game.",
      409,
    );
  if (!game.state.players.some((player) => player.lives > 0))
    throw new ProgramError(
      "The game is over: no robots have lives remaining.",
      409,
    );
  game.state.round++;
  game.state.phase = "programming";
  game.state.executionLog = [];
  game.state.executionFrames = [];
  game.programs = {};
  game.state.players.forEach((player) => {
    player.programmedCardCount = 0;
    player.programLocked = false;
  });
  game.state.updatedAt = new Date().toISOString();
}
