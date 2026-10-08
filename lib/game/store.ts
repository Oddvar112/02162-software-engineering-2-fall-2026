import { Direction } from "@/lib/direction";
import { getRobotAppearance } from "@/lib/game/robot-appearance";
import type { ActionCard, GameState } from "@/lib/game/types";
import { createServiceClient } from "@/lib/supabase/service";
import type { Board } from "@/lib/board";

export const TIMER_SECONDS = 30;
export const REGISTER_COUNT = 5;
export const NEXT_ROUND_SECONDS = 15;

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
  winner_id: string | null;
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
  draw_pile: ActionCard[];
  discard_pile: ActionCard[];
};

export type LoadedGame = {
  game: GameRow & { board: Board };
  lobbyId: string;
  players: PlayerRow[];
  names: Map<string, string>;
  hands: Map<string, ActionCard[]>;
  programs: Map<string, ActionCard[]>;
};

export async function loadGame(gameId: string): Promise<LoadedGame> {
  const service = createServiceClient();

  const { data: game, error } = await service
    .from("games")
    .select(
      "id, phase, round, board, execution_log, execution_frames, timer_started_at, winner_id, updated_at",
    )
    .eq("id", gameId)
    .maybeSingle();
  if (error) throw error;
  if (!game) throw new GameError("This game does not exist.", 404);

  if (!game.board) {
    throw new GameError("This game has not been set up yet.", 409);
  }

  const [lobbyResult, playersResult, handsResult, programsResult] =
    await Promise.all([
      service.from("lobbies").select("id").eq("game", gameId).maybeSingle(),
      service
        .from("game_players")
        .select(
          "user_id, seat, robot_model, x, z, direction, damage, lives, checkpoints_reached, draw_pile, discard_pile",
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
  if (lobbyResult.error) throw lobbyResult.error;
  if (!lobbyResult.data) throw new GameError("This game has no lobby.", 404);
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
    lobbyId: lobbyResult.data.id,
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
  const { game, lobbyId, players, names, hands, programs } = loaded;
  return {
    gameId: game.id,
    lobbyId,
    winnerId: game.winner_id,
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
      game.phase === "finished"
        ? null
        : game.phase === "end-of-round"
          ? new Date(
              new Date(game.updated_at).getTime() + NEXT_ROUND_SECONDS * 1000,
            ).toISOString()
          : game.timer_started_at
            ? new Date(
                new Date(game.timer_started_at).getTime() +
                  TIMER_SECONDS * 1000,
              ).toISOString()
            : null,
    updatedAt: game.updated_at,
  };
}
