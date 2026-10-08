import type { Board } from "@/lib/board";
import { Direction } from "@/lib/direction";
import { drawHand, shuffle } from "@/lib/game/deck";
import { resolveRound, type Programs } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";
import {
  NEXT_ROUND_SECONDS,
  REGISTER_COUNT,
  TIMER_SECONDS,
  toGameState,
  type LoadedGame,
} from "@/lib/game/store";
import { createServiceClient } from "@/lib/supabase/service";

function isReadyToResolve(loaded: LoadedGame): boolean {
  const { game, players } = loaded;
  if (game.phase !== "programming") return false;
  if (players.every((player) => loaded.programs.has(player.user_id)))
    return true;
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

export function decideOutcome(state: GameState): {
  finished: boolean;
  winnerId: string | null;
} {
  const total = countCheckpoints(state.board);
  const champion = state.players.find(
    (player) => total > 0 && player.checkpointsReached >= total,
  );

  const winner = champion ?? null;
  return {
    finished: winner !== null,
    winnerId: winner?.id ?? null,
  };
}

export async function resolveIfReady(loaded: LoadedGame): Promise<boolean> {
  if (!isReadyToResolve(loaded)) return false;
  const { game } = loaded;

  const programs = fillMissingPrograms(loaded);
  const before = toGameState(loaded, "");
  for (const player of before.players) {
    if (programs[player.id]) {
      player.programLocked = true;
      player.programmedCardCount = REGISTER_COUNT;
    }
  }
  const state = resolveRound(before, programs);

  const outcome = decideOutcome(state);

  const { data: applied, error } = await createServiceClient().rpc(
    "apply_round_result",
    {
      p_game_id: game.id,
      p_round: game.round,
      p_expected_updated_at: game.updated_at,
      p_phase: outcome.finished ? "finished" : "end-of-round",
      p_execution_log: state.executionLog,
      p_execution_frames: state.executionFrames,
      p_players: state.players.map((player) => {
        const robot = state.robots.find(
          (candidate) => candidate.id === player.id,
        );
        return {
          user_id: player.id,
          x: robot?.x ?? 0,
          z: robot?.z ?? 0,
          direction: robot?.direction ?? Direction.Up,
          checkpoints_reached: player.checkpointsReached,
        };
      }),
      p_programs: Object.entries(programs).map(([user_id, cards]) => ({
        user_id,
        cards,
      })),
      p_discarded: Array.from(loaded.hands.entries()).map(([user_id, hand]) => ({
        user_id,
        cards: hand,
      })),

      p_winner_id: outcome.winnerId,
    },
  );
  if (error) throw error;
  return applied === true;
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
  const { game } = loaded;
  const hands = Object.fromEntries(
    loaded.players.map((player) => [
      player.user_id,
      drawHand(player.draw_pile, player.discard_pile),
    ]),
  );

  const { data: advanced, error } = await createServiceClient().rpc(
    "begin_next_round",
    {
      p_game_id: game.id,
      p_round: game.round,
      p_hands: Object.entries(hands).map(([user_id, cards]) => ({
        user_id,
        cards,
      })),
      p_piles: Object.entries(hands).map(
        ([user_id, { drawPile, discardPile }]) => ({
          user_id,
          draw_pile: drawPile,
          discard_pile: discardPile,
        })
      ),
    },
  );
  if (error) throw error;
  return advanced === true;
}
