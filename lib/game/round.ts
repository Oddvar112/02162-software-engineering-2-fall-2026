import { dealHands, shuffle } from "@/lib/game/deck";
import { resolveRound } from "@/lib/game/engine";
import {
  RoundService,
  type NextRound,
  type RoundRepository,
  type RoundResult,
} from "@/lib/game/round-service";
import type { GameState } from "@/lib/game/types";
import {
  NEXT_ROUND_SECONDS,
  REGISTER_COUNT,
  TIMER_SECONDS,
  toGameState,
  type LoadedGame,
} from "@/lib/game/store";
import { createServiceClient } from "@/lib/supabase/service";

class SupabaseRoundRepository implements RoundRepository {
  async applyRoundResult(result: RoundResult): Promise<boolean> {
    const { data, error } = await createServiceClient().rpc(
      "apply_round_result",
      {
        p_game_id: result.gameId,
        p_round: result.round,
        p_expected_updated_at: result.expectedUpdatedAt,
        p_phase: result.phase,
        p_execution_log: result.executionLog,
        p_execution_frames: result.executionFrames,
        p_players: result.players.map((player) => ({
          user_id: player.userId,
          x: player.x,
          z: player.z,
          direction: player.direction,
          checkpoints_reached: player.checkpointsReached,
        })),
        p_programs: result.programs.map((program) => ({
          user_id: program.userId,
          cards: program.cards,
        })),
        p_winner_id: result.winnerId,
      },
    );
    if (error) throw error;
    return data === true;
  }

  async beginNextRound(nextRound: NextRound): Promise<boolean> {
    const { data, error } = await createServiceClient().rpc(
      "begin_next_round",
      {
        p_game_id: nextRound.gameId,
        p_round: nextRound.round,
        p_hands: Object.entries(nextRound.hands).map(([userId, cards]) => ({
          user_id: userId,
          cards,
        })),
      },
    );
    if (error) throw error;
    return data === true;
  }
}

function createRoundService() {
  return new RoundService({
    clock: { now: Date.now },
    repository: new SupabaseRoundRepository(),
    toGameState: (loaded) => toGameState(loaded, ""),
    resolveRound,
    dealHands,
    shuffle,
    timerSeconds: TIMER_SECONDS,
    nextRoundSeconds: NEXT_ROUND_SECONDS,
    registerCount: REGISTER_COUNT,
  });
}

export function decideOutcome(state: GameState) {
  return createRoundService().decideOutcome(state);
}

export function resolveIfReady(loaded: LoadedGame): Promise<boolean> {
  return createRoundService().resolveIfReady(loaded);
}

export function advanceIfReady(loaded: LoadedGame): Promise<boolean> {
  return createRoundService().advanceIfReady(loaded);
}
