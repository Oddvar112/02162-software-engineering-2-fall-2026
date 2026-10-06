import type { Board } from "@/lib/board";
import { Direction } from "@/lib/direction";

export type GamePhase =
  "programming" | "execution" | "end-of-round" | "finished";

export type RobotState = {
  id: string;
  modelId: string;
  playerId: string;
  name: string;
  color: string;
  x: number;
  z: number;
  direction: Direction;
  rebootTokenId: string | null;
};

export type PlayerState = {
  id: string;
  name: string;
  robotId: string;
  damage: number;
  checkpointsReached: number;
  programmedCardCount: number;
  programLocked: boolean;
  connected: boolean;
};

export type ActionCard = {
  id: string;
  name: string;
  type: "move" | "rotate" | "backup";
  value: number;
  priority: number;
};

export type ExecutionFrame = {
  register: number;
  cardId: string | null;
  message: string;
  robots: RobotState[];
  players: PlayerState[];
};

export type GameState = {
  gameId: string;
  lobbyId: string;
  winnerId: string | null;
  round: number;
  phase: GamePhase;
  currentPlayerId: string;
  board: Board;
  robots: RobotState[];
  players: PlayerState[];
  currentPlayerCards: ActionCard[];
  currentPlayerProgram: ActionCard[];
  registerCount: number;
  executionLog: { register: number; playerId: string; card: ActionCard }[];
  executionFrames: ExecutionFrame[];
  timerEndsAt: string | null;
  updatedAt: string;
};

export const PHASE_LABELS: Record<GamePhase, string> = {
  programming: "Programming phase",
  execution: "Program execution",
  "end-of-round": "End of round",
  finished: "Game over",
};

export const DIRECTION_LABELS: Record<Direction, string> = {
  [Direction.Up]: "North",
  [Direction.Right]: "East",
  [Direction.Down]: "South",
  [Direction.Left]: "West",
};
