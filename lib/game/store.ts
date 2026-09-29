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
export const NEXT_ROUND_SECONDS = 45;

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
};

export type LoadedGame = {
  game: GameRow & { board: Board };
  players: PlayerRow[];
  names: Map<string, string>;
  hands: Map<string, ActionCard[]>;
  programs: Map<string, ActionCard[]>;
};

export async function initialiseGame(gameId: string): Promise<void> {
  const service = createServiceClient();

  const { data: existing } = await service
    .from("games")
    .select("board")
    .eq("id", gameId)
    .maybeSingle();
  if (!existing) throw new GameError("This game does not exist.", 404);
  if (existing.board) return;

  const { data: lobby } = await service
    .from("lobbies")
    .select("id, status, lobby_players(user_id, joined_at)")
    .eq("game", gameId)
    .maybeSingle();
  if (!lobby) throw new GameError("This game has no lobby.", 404);
  if (lobby.status !== "started") {
    throw new GameError("This game has not been started.", 409);
  }

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

  const hands = dealHands(players.map((player) => player.user_id));
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
    throw new GameError("This game has not been set up yet.", 409);
  }

  const [playersResult, handsResult, programsResult] = await Promise.all([
    service
      .from("game_players")
      .select(
        "user_id, seat, robot_model, x, z, direction, damage, lives, checkpoints_reached",
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
      programmedCardCount: programs.has(player.user_id) ? REGISTER_COUNT : 0,
      programLocked: programs.has(player.user_id),
      connected: true,
    })),
    currentPlayerCards: hands.get(viewerId) ?? [],
    currentPlayerProgram: programs.get(viewerId) ?? [],
    executionLog: game.execution_log,
    executionFrames: game.execution_frames,
    timerEndsAt:
      game.phase === "end-of-round"
        ? new Date(
            new Date(game.updated_at).getTime() + NEXT_ROUND_SECONDS * 1000,
          ).toISOString()
        : game.timer_started_at
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
  if (alive.every((player) => loaded.programs.has(player.user_id))) return true;
  if (!game.timer_started_at) return false;
  return (
    Date.now() >=
    new Date(game.timer_started_at).getTime() + TIMER_SECONDS * 1000
  );
}

function fillMissingPrograms(loaded: LoadedGame): Programs {
  const { players, hands, programs } = loaded;
  const result: Programs = {};
  for (const player of players) {
    if (player.lives === 0) continue;
    const chosen = programs.get(player.user_id);
    if (chosen) {
      result[player.user_id] = chosen;
      continue;
    }
    const hand = hands.get(player.user_id) ?? [];
    result[player.user_id] = shuffle(hand).slice(0, REGISTER_COUNT);
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

  const writes = await Promise.all([
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
    ...(phase === "finished"
      ? [
          service
            .from("lobbies")
            .update({ status: "finished" })
            .eq("game", game.id),
        ]
      : []),
  ]);
  const failed = writes.find((result) => result.error);
  if (failed?.error) throw failed.error;
  return true;
}

function isReadyToAdvance(loaded: LoadedGame): boolean {
  const { game } = loaded;
  if (game.phase !== "end-of-round") return false;
  return (
    Date.now() >=
    new Date(game.updated_at).getTime() + NEXT_ROUND_SECONDS * 1000
  );
}

export async function advanceIfReady(loaded: LoadedGame): Promise<boolean> {
  if (!isReadyToAdvance(loaded)) return false;
  return startNextRound(loaded.game.id, loaded.game.round);
}

export async function startNextRound(
  gameId: string,
  round: number,
): Promise<boolean> {
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
  if (!advanced?.length) return false;

  const { data: players } = await service
    .from("game_players")
    .select("user_id, lives")
    .eq("game_id", gameId);
  const alive = (players ?? []).filter((player) => player.lives > 0);

  const hands = dealHands(alive.map((player) => player.user_id));
  const writes = await Promise.all([
    service.from("hands").upsert(
      Object.entries(hands).map(([user_id, cards]) => ({
        game_id: gameId,
        user_id,
        round: round + 1,
        cards,
      })),
      { onConflict: "game_id,user_id" },
    ),
    service.from("programs").delete().eq("game_id", gameId),
  ]);
  const failed = writes.find((result) => result.error);
  if (failed?.error) throw failed.error;
  return true;
}
