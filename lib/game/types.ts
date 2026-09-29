import type { Board } from "@/lib/board";
import { Direction } from "@/lib/direction";

export type GamePhase =
  "programming" | "waiting" | "execution" | "board-activation" | "end-of-round";

export type RobotState = {
  id: string;
  modelId: string;
  playerId: string;
  name: string;
  color: string;
  x: number;
  z: number;
  direction: Direction;
};

export type PlayerState = {
  id: string;
  name: string;
  robotId: string;
  damage: number;
  lives: number;
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
  updatedAt: string;
};

export const PHASE_LABELS: Record<GamePhase, string> = {
  programming: "Programming phase",
  waiting: "Waiting for players",
  execution: "Program execution",
  "board-activation": "Board element activation",
  "end-of-round": "End of round",
};

export const DIRECTION_LABELS: Record<Direction, string> = {
  [Direction.Up]: "North",
  [Direction.Right]: "East",
  [Direction.Down]: "South",
  [Direction.Left]: "West",
};
