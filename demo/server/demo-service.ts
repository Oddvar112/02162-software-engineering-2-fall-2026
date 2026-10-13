import { getDemoBoard, isDemoBoard, DEFAULT_DEMO_MAP_ID } from "../maps";
import type { DemoBoard } from "../types";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionCard } from "@/lib/game/types";

export class DemoServiceError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type DemoStatusResponse = {
  isDemo: boolean;
  mapId: string | null;
  board: DemoBoard | null;
};

export async function verifyLobbyHost(
  gameId: string,
  userId: string,
): Promise<{ lobbyId: string; isHost: boolean; isOpen: boolean }> {
  const service = createServiceClient();
  const { data: lobby, error } = await service
    .from("lobbies")
    .select("id, created_by, status")
    .eq("game", gameId)
    .maybeSingle();

  if (error) throw error;
  if (!lobby) throw new DemoServiceError("Lobby not found for this game.", 404);

  return {
    lobbyId: lobby.id,
    isHost: lobby.created_by === userId,
    isOpen: lobby.status === "open",
  };
}

export async function getGameDemoStatus(
  gameId: string,
): Promise<DemoStatusResponse> {
  try {
    const service = createServiceClient();
    const { data: game, error } = await service
      .from("games")
      .select("board")
      .eq("id", gameId)
      .maybeSingle();

    if (error) throw error;
    if (!game) throw new DemoServiceError("Game does not exist.", 404);

    const board = game.board;
    const isDemo = isDemoBoard(board);

    return {
      isDemo,
      mapId: isDemo ? (board?.id ?? null) : null,
      board: isDemo ? (board as DemoBoard) : null,
    };
  } catch (err) {
    if (err instanceof DemoServiceError) throw err;
    return { isDemo: false, mapId: null, board: null };
  }
}

export async function setGameDemoBoard(
  gameId: string,
  userId: string,
  enabled: boolean,
  mapId?: string,
): Promise<DemoStatusResponse> {
  const { isHost, isOpen } = await verifyLobbyHost(gameId, userId);
  if (!isHost) {
    throw new DemoServiceError(
      "Only the lobby host can configure demo mode.",
      403,
    );
  }
  if (!isOpen) {
    throw new DemoServiceError(
      "Demo mode cannot be changed after the game has started.",
      409,
    );
  }

  const service = createServiceClient();

  if (!enabled) {
    const { error } = await service
      .from("games")
      .update({ board: null, updated_at: new Date().toISOString() })
      .eq("id", gameId);

    if (error) throw error;

    return {
      isDemo: false,
      mapId: null,
      board: null,
    };
  }

  const targetMapId = mapId ?? DEFAULT_DEMO_MAP_ID;
  const demoBoard = getDemoBoard(targetMapId);
  if (!demoBoard) {
    throw new DemoServiceError(`Unknown demo map: ${targetMapId}`, 400);
  }

  const { error } = await service
    .from("games")
    .update({ board: demoBoard, updated_at: new Date().toISOString() })
    .eq("id", gameId);

  if (error) throw error;

  return {
    isDemo: true,
    mapId: demoBoard.id,
    board: demoBoard,
  };
}

export async function submitDemoProgram(
  gameId: string,
  userId: string,
  cardIds: unknown,
): Promise<void> {
  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    throw new DemoServiceError(
      "Select at least 1 card to submit your program.",
      400,
    );
  }

  const service = createServiceClient();

  const { data: game, error: gameError } = await service
    .from("games")
    .select("id, phase, round, timer_started_at")
    .eq("id", gameId)
    .maybeSingle();

  if (gameError) throw gameError;
  if (!game) throw new DemoServiceError("This game does not exist.", 404);
  if (game.phase !== "programming") {
    throw new DemoServiceError(
      "Programs cannot be submitted in this phase.",
      409,
    );
  }

  const { data: player, error: playerError } = await service
    .from("game_players")
    .select("user_id, lives")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle();

  if (playerError) throw playerError;
  if (!player)
    throw new DemoServiceError("You are not a player in this game.", 403);
  if (player.lives === 0)
    throw new DemoServiceError("This robot has no lives remaining.", 409);

  const { data: existingProgram } = await service
    .from("programs")
    .select("user_id")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .eq("round", game.round)
    .maybeSingle();

  if (existingProgram) {
    throw new DemoServiceError("Your program is already locked in.", 409);
  }

  const { data: handRow, error: handError } = await service
    .from("hands")
    .select("cards")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .eq("round", game.round)
    .maybeSingle();

  if (handError) throw handError;
  if (!handRow)
    throw new DemoServiceError(
      "You have no hand for this round. Refresh the game.",
      409,
    );

  const handCards = handRow.cards as ActionCard[];
  const handCardMap = new Map(handCards.map((c) => [c.id, c]));

  const programCards: ActionCard[] = [];
  for (const id of cardIds) {
    if (typeof id !== "string") {
      throw new DemoServiceError("Invalid card ID.", 400);
    }
    const card = handCardMap.get(id);
    if (!card) {
      throw new DemoServiceError(
        "Your program contains a card that is not in your hand.",
        409,
      );
    }
    programCards.push(card);
  }

  const { error: programError } = await service.from("programs").upsert(
    {
      game_id: gameId,
      user_id: userId,
      round: game.round,
      cards: programCards,
    },
    { onConflict: "game_id,user_id" },
  );

  if (programError) throw programError;

  const { error: updateGameError } = await service
    .from("games")
    .update({
      updated_at: new Date().toISOString(),
      timer_started_at: game.timer_started_at ?? new Date().toISOString(),
    })
    .eq("id", gameId);

  if (updateGameError) throw updateGameError;
}
