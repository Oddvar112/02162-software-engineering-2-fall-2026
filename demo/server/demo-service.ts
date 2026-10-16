import { createServiceClient } from "@/lib/supabase/service";
import { DEFAULT_DEMO_MAP_ID, getDemoBoard, isDemoBoard } from "../maps";
import type { DemoBoard } from "../types";

export class DemoServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "DemoServiceError";
  }
}

export async function verifyLobbyHost(
  gameId: string,
  userId: string,
): Promise<{ isHost: boolean; lobbyId: string; isOpen: boolean }> {
  const service = createServiceClient();

  const { data: lobby, error } = await service
    .from("lobbies")
    .select("id, created_by, status")
    .eq("game", gameId)
    .maybeSingle();

  if (error) throw error;
  if (!lobby) throw new DemoServiceError("Lobby not found for this game.", 404);

  return {
    isHost: lobby.created_by === userId,
    lobbyId: lobby.id,
    isOpen: lobby.status === "open",
  };
}

export async function getGameDemoStatus(
  gameId: string,
): Promise<{ isDemo: boolean; mapId: string | null; board: DemoBoard | null }> {
  const service = createServiceClient();

  try {
    const { data: game, error } = await service
      .from("games")
      .select("board, mode")
      .eq("id", gameId)
      .maybeSingle();

    if (error) throw error;
    if (!game) throw new DemoServiceError("Game does not exist.", 404);

    const isDemo = isDemoBoard(game.board) || game.mode === "demo";
    return {
      isDemo,
      mapId: isDemo && game.board ? game.board.id : null,
      board: isDemo && isDemoBoard(game.board) ? game.board : null,
    };
  } catch (err) {
    if (err instanceof DemoServiceError) throw err;
    throw new DemoServiceError("Failed to check game demo status.", 500);
  }
}

export async function setGameDemoBoard(
  gameId: string,
  userId: string,
  enabled: boolean,
  mapId?: string,
): Promise<{ isDemo: boolean; mapId: string | null; board: DemoBoard | null }> {
  let demoBoard: DemoBoard | null = null;
  let targetMapId: string | null = null;

  if (enabled) {
    targetMapId = mapId ?? DEFAULT_DEMO_MAP_ID;
    const foundBoard = getDemoBoard(targetMapId);
    if (!foundBoard) {
      throw new DemoServiceError(`Unknown demo map: ${targetMapId}`, 400);
    }
    demoBoard = foundBoard;
  }

  const service = createServiceClient();
  const { error } = await service.rpc("set_game_demo_board", {
    p_game_id: gameId,
    p_user_id: userId,
    p_enabled: enabled,
    p_board: demoBoard,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("not_creator")) {
      throw new DemoServiceError(
        "Only the lobby host can toggle demo mode.",
        403,
      );
    }
    if (msg.includes("already_started")) {
      throw new DemoServiceError(
        "Demo mode cannot be changed after the game has started.",
        409,
      );
    }
    if (msg.includes("lobby_not_found")) {
      throw new DemoServiceError("Lobby not found for this game.", 404);
    }
    throw error;
  }

  return {
    isDemo: enabled,
    mapId: targetMapId,
    board: demoBoard,
  };
}
