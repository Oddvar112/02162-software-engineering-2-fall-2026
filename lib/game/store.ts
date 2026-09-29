import { Direction } from "@/lib/direction";
import { dealHands, shuffle } from "@/lib/game/deck";
import { resolveRound, type Programs } from "@/lib/game/engine";
import { staticBoard } from "@/lib/game/game-model";
import { getRobotAppearance } from "@/lib/game/robot-appearance";
import type { ActionCard, GameState } from "@/lib/game/types";
import roster from "@/lib/robots.json";
import { createServiceClient } from "@/lib/supabase/service";
import type { Board } from "@/lib/board";

export const TIMER_SECONDS = 30;
export const REGISTER_COUNT = 5;

export class GameError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

type GameRow = {
  id: string;
  phase: GameState["phase"];
  round: number;
  board: Board | null;
  execution_log: GameState["executionLog"];
  execution_frames: GameState["executionFrames"];
  timer_started_at: string | null;
  updated_at: string;
};

type PlayerRow = {
  user_id: string;
  seat: number;
  robot_model: string;
  x: number;
  z: number;
  direction: Direction;
  damage: number;
  lives: number;
  checkpoints_reached: number;
  locked_in: boolean;
  ready_for_next: boolean;
};

export type LoadedGame = {
  game: GameRow & { board: Board };
  players: PlayerRow[];
  names: Map<string, string>;
  hands: Map<string, ActionCard[]>;
  programs: Map<string, ActionCard[]>;
};

function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

async function initialiseGame(gameId: string): Promise<void> {
  const service = createServiceClient();

  const { data: lobby } = await service
    .from("lobbies")
    .select("id, lobby_players(user_id, joined_at)")
    .eq("game", gameId)
    .maybeSingle();
  if (!lobby) throw new GameError("This game has no lobby.", 404);

  const members = [...lobby.lobby_players].sort((a, b) =>
    a.joined_at.localeCompare(b.joined_at),
  );
  if (members.length > staticBoard.startpositions.length) {
    throw new GameError("The board has too few start positions.", 409);
  }

  const players = members.map(({ user_id }, seat) => ({
    game_id: gameId,
    user_id,
    seat,
    robot_model: roster[seat % roster.length].id,
    x: staticBoard.startpositions[seat].x,
    z: staticBoard.startpositions[seat].y,
    direction: Direction.Up,
  }));
  const { error: playersError } = await service
    .from("game_players")
    .upsert(players, { onConflict: "game_id,user_id", ignoreDuplicates: true });
  if (playersError) throw playersError;

  const hands = dealHands(
    players.map((player) => player.user_id),
    seededRandom(`${gameId}:1`),
  );
  const { error: handsError } = await service.from("hands").upsert(
    Object.entries(hands).map(([user_id, cards]) => ({
      game_id: gameId,
      user_id,
      round: 1,
      cards,
    })),
    { onConflict: "game_id,user_id", ignoreDuplicates: true },
  );
  if (handsError) throw handsError;

  const { error: boardError } = await service
    .from("games")
    .update({ board: staticBoard, updated_at: new Date().toISOString() })
    .eq("id", gameId)
    .is("board", null);
  if (boardError) throw boardError;
}

export async function loadGame(gameId: string): Promise<LoadedGame> {
  const service = createServiceClient();

  const { data: game, error } = await service
    .from("games")
    .select(
      "id, phase, round, board, execution_log, execution_frames, timer_started_at, updated_at",
    )
    .eq("id", gameId)
    .maybeSingle();
  if (error) throw error;
  if (!game) throw new GameError("This game does not exist.", 404);

  if (!game.board) {
    await initialiseGame(gameId);
    return loadGame(gameId);
  }

  const [playersResult, handsResult, programsResult] = await Promise.all([
    service
      .from("game_players")
      .select(
        "user_id, seat, robot_model, x, z, direction, damage, lives, checkpoints_reached, locked_in, ready_for_next",
      )
      .eq("game_id", gameId)
      .order("seat"),
    service
      .from("hands")
      .select("user_id, cards")
      .eq("game_id", gameId)
      .eq("round", game.round),
    service
      .from("programs")
      .select("user_id, cards")
      .eq("game_id", gameId)
      .eq("round", game.round),
  ]);
  if (playersResult.error) throw playersResult.error;
  if (handsResult.error) throw handsResult.error;
  if (programsResult.error) throw programsResult.error;

  const players = playersResult.data as PlayerRow[];
  const { data: profiles } = await service
    .from("users")
    .select("id, display_name")
    .in(
      "id",
      players.map((player) => player.user_id),
    );

  return {
    game: game as GameRow & { board: Board },
    players,
    names: new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []),
    hands: new Map(
      handsResult.data.map((row) => [row.user_id, row.cards as ActionCard[]]),
    ),
    programs: new Map(
      programsResult.data.map((row) => [
        row.user_id,
        row.cards as ActionCard[],
      ]),
    ),
  };
}

export function toGameState(loaded: LoadedGame, viewerId: string): GameState {
  const { game, players, names, hands, programs } = loaded;
  return {
    gameId: game.id,
    round: game.round,
    phase: game.phase,
    currentPlayerId: viewerId,
    board: game.board,
    registerCount: REGISTER_COUNT,
    robots: players
      .filter((player) => player.lives > 0)
      .map((player) => {
        const robot = {
          id: player.user_id,
          playerId: player.user_id,
          modelId: player.robot_model,
          name: names.get(player.user_id) ?? "Unknown player",
          color: "",
          x: player.x,
          z: player.z,
          direction: player.direction,
        };
        return { ...robot, ...getRobotAppearance(robot) };
      }),
    players: players.map((player) => ({
      id: player.user_id,
      name: names.get(player.user_id) ?? "Unknown player",
      robotId: player.user_id,
      damage: player.damage,
      lives: player.lives,
      checkpointsReached: player.checkpoints_reached,
      programmedCardCount: player.locked_in ? REGISTER_COUNT : 0,
      programLocked: player.locked_in,
      readyForNext: player.ready_for_next,
      connected: true,
    })),
    currentPlayerCards: hands.get(viewerId) ?? [],
    currentPlayerProgram: programs.get(viewerId) ?? [],
    executionLog: game.execution_log,
    executionFrames: game.execution_frames,
    timerEndsAt: game.timer_started_at
      ? new Date(
          new Date(game.timer_started_at).getTime() + TIMER_SECONDS * 1000,
        ).toISOString()
      : null,
    updatedAt: game.updated_at,
  };
}

function isReadyToResolve(loaded: LoadedGame): boolean {
  const { game, players } = loaded;
  if (game.phase !== "programming") return false;
  const alive = players.filter((player) => player.lives > 0);
  if (alive.length === 0) return false;
  if (alive.every((player) => player.locked_in)) return true;
  if (!game.timer_started_at) return false;
  return (
    Date.now() >=
    new Date(game.timer_started_at).getTime() + TIMER_SECONDS * 1000
  );
}

function fillMissingPrograms(loaded: LoadedGame): Programs {
  const { game, players, hands, programs } = loaded;
  const random = seededRandom(`${game.id}:${game.round}:fill`);
  const result: Programs = {};
  for (const player of players) {
    if (player.lives === 0) continue;
    const chosen = programs.get(player.user_id);
    if (chosen) {
      result[player.user_id] = chosen;
      continue;
    }
    const hand = hands.get(player.user_id) ?? [];
    result[player.user_id] = shuffle(hand, random).slice(0, REGISTER_COUNT);
  }
  return result;
}

function countCheckpoints(board: Board): number {
  return board.tiles.flat().filter((tile) => tile.kind === "checkpoint").length;
}

export async function resolveIfReady(loaded: LoadedGame): Promise<boolean> {
  if (!isReadyToResolve(loaded)) return false;
  const service = createServiceClient();
  const { game } = loaded;

  const programs = fillMissingPrograms(loaded);
  const state = toGameState(loaded, "");
  for (const player of state.players) {
    if (programs[player.id]) {
      player.programLocked = true;
      player.programmedCardCount = REGISTER_COUNT;
    }
  }
  resolveRound(state, programs);

  const total = countCheckpoints(game.board);
  const won = state.players.some(
    (player) => total > 0 && player.checkpointsReached >= total,
  );
  const anyoneLeft = state.players.some((player) => player.lives > 0);
  const phase = won || !anyoneLeft ? "finished" : "end-of-round";

  const { data: claimed, error: claimError } = await service
    .from("games")
    .update({
      phase,
      execution_log: state.executionLog,
      execution_frames: state.executionFrames,
      updated_at: new Date().toISOString(),
    })
    .eq("id", game.id)
    .eq("phase", "programming")
    .eq("round", game.round)
    .select("id");
  if (claimError) throw claimError;
  if (!claimed?.length) return false;

  await Promise.all([
    ...state.players.map((player) => {
      const robot = state.robots.find(
        (candidate) => candidate.id === player.id,
      );
      return service
        .from("game_players")
        .update({
          x: robot?.x ?? 0,
          z: robot?.z ?? 0,
          direction: robot?.direction ?? Direction.Up,
          lives: player.lives,
          checkpoints_reached: player.checkpointsReached,
          locked_in: true,
        })
        .eq("game_id", game.id)
        .eq("user_id", player.id);
    }),
    service.from("programs").upsert(
      Object.entries(programs).map(([user_id, cards]) => ({
        game_id: game.id,
        user_id,
        round: game.round,
        cards,
      })),
      { onConflict: "game_id,user_id" },
    ),
  ]);
  return true;
}

export async function markReadyForNextRound(
  gameId: string,
  userId: string,
): Promise<boolean> {
  const service = createServiceClient();
  const { error } = await service
    .from("game_players")
    .update({ ready_for_next: true })
    .eq("game_id", gameId)
    .eq("user_id", userId);
  if (error) throw error;

  const { data: players } = await service
    .from("game_players")
    .select("lives, ready_for_next")
    .eq("game_id", gameId);
  return (players ?? [])
    .filter((player) => player.lives > 0)
    .every((player) => player.ready_for_next);
}

export async function startNextRound(
  gameId: string,
  round: number,
): Promise<void> {
  const service = createServiceClient();

  const { data: advanced, error } = await service
    .from("games")
    .update({
      round: round + 1,
      phase: "programming",
      execution_log: [],
      execution_frames: [],
      timer_started_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId)
    .eq("phase", "end-of-round")
    .eq("round", round)
    .select("id");
  if (error) throw error;
  if (!advanced?.length) {
    throw new GameError(
      "This round is not ready to advance. Refresh the game.",
      409,
    );
  }

  const { data: players } = await service
    .from("game_players")
    .select("user_id, lives")
    .eq("game_id", gameId);
  const alive = (players ?? []).filter((player) => player.lives > 0);

  const hands = dealHands(
    alive.map((player) => player.user_id),
    seededRandom(`${gameId}:${round + 1}`),
  );
  await Promise.all([
    service.from("hands").upsert(
      Object.entries(hands).map(([user_id, cards]) => ({
        game_id: gameId,
        user_id,
        round: round + 1,
        cards,
      })),
      { onConflict: "game_id,user_id" },
    ),
    service
      .from("game_players")
      .update({ locked_in: false, ready_for_next: false })
      .eq("game_id", gameId),
    service.from("programs").delete().eq("game_id", gameId),
  ]);
}
