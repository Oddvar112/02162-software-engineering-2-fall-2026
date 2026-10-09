import { Direction } from "@/lib/direction";
import type { ActionCard, GameState } from "@/lib/game/types";
import type { LoadedGame } from "@/lib/game/store";
import type { Programs } from "@/lib/game/engine";

export type Clock = {
  now(): number;
};

export type RoundRepository = {
  applyRoundResult(input: RoundResult): Promise<boolean>;
  beginNextRound(input: NextRound): Promise<boolean>;
};

export type RoundResult = {
  gameId: string;
  round: number;
  expectedUpdatedAt: string;
  phase: "end-of-round" | "finished";
  executionLog: GameState["executionLog"];
  executionFrames: GameState["executionFrames"];
  players: {
    userId: string;
    x: number;
    z: number;
    direction: Direction;
    checkpointsReached: number;
  }[];
  programs: { userId: string; cards: ActionCard[] }[];
  winnerId: string | null;
};

export type NextRound = {
  gameId: string;
  round: number;
  hands: Record<string, ActionCard[]>;
};

export type RoundServiceDependencies = {
  clock: Clock;
  repository: RoundRepository;
  toGameState(loaded: LoadedGame): GameState;
  resolveRound(state: GameState, programs: Programs): GameState;
  dealHands(playerIds: string[]): Record<string, ActionCard[]>;
  shuffle<T>(items: T[]): T[];
  timerSeconds: number;
  nextRoundSeconds: number;
  registerCount: number;
};

export class RoundService {
  constructor(private readonly dependencies: RoundServiceDependencies) {}

  async resolveIfReady(loaded: LoadedGame): Promise<boolean> {
    if (!this.isReadyToResolve(loaded)) return false;

    const programs = this.fillMissingPrograms(loaded);
    const state = this.dependencies.resolveRound(
      this.programmedState(loaded, programs),
      programs,
    );
    const outcome = this.decideOutcome(state);

    return this.dependencies.repository.applyRoundResult({
      gameId: loaded.game.id,
      round: loaded.game.round,
      expectedUpdatedAt: loaded.game.updated_at,
      phase: outcome.finished ? "finished" : "end-of-round",
      executionLog: state.executionLog,
      executionFrames: state.executionFrames,
      players: state.players.map((player) => {
        const robot = state.robots.find(
          (candidate) => candidate.id === player.id,
        );
        return {
          userId: player.id,
          x: robot?.x ?? 0,
          z: robot?.z ?? 0,
          direction: robot?.direction ?? Direction.Up,
          checkpointsReached: player.checkpointsReached,
        };
      }),
      programs: Object.entries(programs).map(([userId, cards]) => ({
        userId,
        cards,
      })),
      winnerId: outcome.winnerId,
    });
  }

  async advanceIfReady(loaded: LoadedGame): Promise<boolean> {
    if (!this.isReadyToAdvance(loaded)) return false;

    return this.dependencies.repository.beginNextRound({
      gameId: loaded.game.id,
      round: loaded.game.round,
      hands: this.dependencies.dealHands(
        loaded.players.map((player) => player.user_id),
      ),
    });
  }

  decideOutcome(state: GameState): {
    finished: boolean;
    winnerId: string | null;
  } {
    const checkpointCount = state.board.tiles
      .flat()
      .filter((tile) => tile.kind === "checkpoint").length;
    const winner = state.players.find(
      (player) =>
        checkpointCount > 0 && player.checkpointsReached >= checkpointCount,
    );
    return { finished: winner !== undefined, winnerId: winner?.id ?? null };
  }

  private isReadyToResolve(loaded: LoadedGame): boolean {
    if (loaded.game.phase !== "programming") return false;
    if (loaded.players.every((player) => loaded.programs.has(player.user_id))) {
      return true;
    }
    if (!loaded.game.timer_started_at) return false;
    return (
      this.dependencies.clock.now() >=
      new Date(loaded.game.timer_started_at).getTime() +
        this.dependencies.timerSeconds * 1000
    );
  }

  private isReadyToAdvance(loaded: LoadedGame): boolean {
    return (
      loaded.game.phase === "end-of-round" &&
      this.dependencies.clock.now() >=
        new Date(loaded.game.updated_at).getTime() +
          this.dependencies.nextRoundSeconds * 1000
    );
  }

  private fillMissingPrograms(loaded: LoadedGame): Programs {
    return Object.fromEntries(
      loaded.players.map((player) => {
        const chosen = loaded.programs.get(player.user_id);
        const cards = chosen
          ? chosen
          : this.dependencies
              .shuffle(loaded.hands.get(player.user_id) ?? [])
              .slice(0, this.dependencies.registerCount);
        return [player.user_id, cards];
      }),
    );
  }

  private programmedState(loaded: LoadedGame, programs: Programs): GameState {
    const state = this.dependencies.toGameState(loaded);
    return {
      ...state,
      players: state.players.map((player) =>
        programs[player.id]
          ? {
              ...player,
              programLocked: true,
              programmedCardCount: this.dependencies.registerCount,
            }
          : player,
      ),
    };
  }
}