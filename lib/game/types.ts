export type Direction = "north" | "east" | "south" | "west";

export type GamePhase =
  "programming" | "waiting" | "execution" | "board-activation" | "end-of-round";

export type BoardElement =
  | {
      id: string;
      type: "wall";
      x: number;
      z: number;
      side: Direction;
    }
  | {
      id: string;
      type: "checkpoint";
      x: number;
      z: number;
      order: number;
    }
  | {
      id: string;
      type: "pit";
      x: number;
      z: number;
    }
  | {
      id: string;
      type: "conveyor";
      x: number;
      z: number;
      direction: Direction;
    }
  | {
      id: string;
      type: "gear";
      x: number;
      z: number;
      rotation: "clockwise" | "counter-clockwise";
    };

export type RobotState = {
  id: string;
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
  connected: boolean;
};

export type ActionCard = {
  id: string;
  name: string;
  type: "move" | "rotate" | "backup";
  value: number;
  priority: number;
};

export type GameState = {
  gameId: string;
  round: number;
  phase: GamePhase;
  currentPlayerId: string;
  board: {
    width: number;
    height: number;
    elements: BoardElement[];
  };
  robots: RobotState[];
  players: PlayerState[];
  availableCards: ActionCard[];
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
  north: "North",
  east: "East",
  south: "South",
  west: "West",
};
