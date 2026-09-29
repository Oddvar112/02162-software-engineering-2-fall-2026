import { staticBoard } from "@/lib/game/game-model";
import { validateBoard, type Board } from "@/lib/board";
import { Direction } from "@/lib/direction";
import type { GameState } from "@/lib/game/types";
import roster from "@/lib/robots.json";

function robotAppearance(modelId: string) {
  const model = roster.find((robot) => robot.id === modelId);
  if (!model) throw new Error(`Unknown robot model: ${modelId}`);
  return { modelId: model.id, name: model.name, color: model.color };
}

const DEMO_PLAYERS = [
  { name: "Alex", modelId: "bolt" },
  { name: "Maya", modelId: "glitch" },
  { name: "Jonas", modelId: "gizmo" },
  { name: "Freja", modelId: "pixel" },
];

const BASE_GAME_STATE: Omit<
  GameState,
  "updatedAt" | "board" | "robots" | "players"
> = {
  gameId: "RR-02162",
  round: 1,
  phase: "programming",
  currentPlayerId: "player-1",
  registerCount: 5,
  currentPlayerProgram: [],
  executionLog: [],
  executionFrames: [],
  timerEndsAt: null,
  currentPlayerCards: [
    { id: "card-1", name: "Move 3", type: "move", value: 3, priority: 840 },
    { id: "card-2", name: "Move 2", type: "move", value: 2, priority: 670 },
    { id: "card-3", name: "Move 1", type: "move", value: 1, priority: 510 },
    {
      id: "card-4",
      name: "Rotate left",
      type: "rotate",
      value: -1,
      priority: 330,
    },
    {
      id: "card-5",
      name: "Rotate right",
      type: "rotate",
      value: 1,
      priority: 260,
    },
    { id: "card-6", name: "Back up", type: "backup", value: -1, priority: 80 },
  ],
};

export function buildGameState(board: Board = staticBoard): GameState {
  validateBoard(board);
  if (board.startpositions.length === 0) {
    throw new Error("A board needs at least one start position.");
  }
  const seats = board.startpositions.map((position, index) => ({
    position,
    playerId: `player-${index + 1}`,
    robotId: `robot-${index + 1}`,
    name: DEMO_PLAYERS[index]?.name ?? `Player ${index + 1}`,
    modelId: DEMO_PLAYERS[index]?.modelId ?? roster[index % roster.length].id,
  }));

  return {
    ...BASE_GAME_STATE,
    currentPlayerProgram: [],
    executionLog: [],
    executionFrames: [],
    board: structuredClone(board),
    robots: seats.map(({ position, playerId, robotId, modelId }) => ({
      id: robotId,
      playerId,
      ...robotAppearance(modelId),
      x: position.x,
      z: position.y,
      direction: Direction.Up,
    })),
    players: seats.map(({ playerId, robotId, name }) => ({
      id: playerId,
      name,
      robotId,
      damage: 0,
      lives: 3,
      checkpointsReached: 0,
      programmedCardCount: 0,
      programLocked: false,
      readyForNext: false,
      connected: true,
    })),
    currentPlayerCards: BASE_GAME_STATE.currentPlayerCards.map((card) => ({
      ...card,
    })),
    updatedAt: new Date().toISOString(),
  };
}
