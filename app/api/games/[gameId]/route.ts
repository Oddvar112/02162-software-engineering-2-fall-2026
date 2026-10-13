import { NextResponse } from "next/server";
import { Direction } from "@/lib/direction";
import { advanceIfReady, resolveIfReady } from "@/lib/game/round";
import { initialiseGame } from "@/lib/game/setup";
import {
  GameError,
  loadGame,
  toGameState,
  type LoadedGame,
} from "@/lib/game/store";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const headers = { "Cache-Control": "no-store, max-age=0" };

const SUBMIT_MESSAGES: Record<string, string> = {
  not_programming_phase: "Programs cannot be submitted in this phase.",
  not_in_game: "You are not a player in this game.",
  already_locked_in: "Your program is already locked in.",
  no_lives_left: "This robot has no lives remaining.",
  wrong_card_count: "Select exactly 5 cards before locking in.",
  duplicate_card: "Each card can only be used once.",
  no_hand: "You have no hand for this round. Refresh the game.",
  card_not_in_hand:
    "Your program contains a card that is not in your hand. Refresh and try again.",
  game_not_found: "This game does not exist.",
};

function failure(error: unknown) {
  if (error instanceof GameError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers },
    );
  }
  console.error(error);
  return NextResponse.json(
    { error: "The game could not be updated. Please try again." },
    { status: 500, headers },
  );
}

async function currentUserId(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== "string") {
    throw new GameError("Sign in to view this game.", 401);
  }
  return userId;
}

function requireMember(loaded: LoadedGame, userId: string) {
  if (!loaded.players.some((player) => player.user_id === userId)) {
    throw new GameError("You are not a player in this game.", 403);
  }
}

async function requireLobbyMember(gameId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lobbies")
    .select("id, lobby_players!inner(user_id)")
    .eq("game", gameId)
    .eq("lobby_players.user_id", userId)
    .maybeSingle();
  if (!data) {
    throw new GameError("You are not a player in this game.", 403);
  }
}

async function snapshot(gameId: string, userId: string) {
  await requireLobbyMember(gameId, userId);
  await initialiseGame(gameId);
  let loaded = await loadGame(gameId);
  requireMember(loaded, userId);
  if ((await resolveIfReady(loaded)) || (await advanceIfReady(loaded))) {
    loaded = await loadGame(gameId);
  }
  return NextResponse.json(toGameState(loaded, userId), { headers });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await params;
    const userId = await currentUserId();
    return await snapshot(gameId, userId);
  } catch (error) {
    return failure(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await params;
    const userId = await currentUserId();

    let body: {
      action?: unknown;
      round?: unknown;
      cardIds?: unknown;
      direction?: unknown;
    };
    try {
      body = await request.json();
    } catch {
      throw new GameError("The request is not valid JSON.");
    }

    if (body.action === "choose-reboot-direction") {
      const direction = body.direction;
      if (
        typeof direction !== "number" ||
        !Number.isInteger(direction) ||
        direction < Direction.Up ||
        direction > Direction.Left
      ) {
        throw new GameError("Choose a valid reboot direction.");
      }
      const loaded = await loadGame(gameId);
      requireMember(loaded, userId);
      const player = loaded.players.find(
        (candidate) => candidate.user_id === userId,
      );
      if (loaded.game.phase !== "programming" || !player) {
        throw new GameError("Reboot direction cannot be changed now.");
      }
      if (loaded.programs.has(userId)) {
        throw new GameError(
          "Choose a reboot direction before locking in your program.",
        );
      }
      if (player.reboot_token_id === null) {
        throw new GameError("Your robot is not waiting to reboot.");
      }
      const { error } = await createServiceClient()
        .from("game_players")
        .update({ direction })
        .eq("game_id", gameId)
        .eq("user_id", userId);
      if (error) throw error;
      return await snapshot(gameId, userId);
    }

    if (body.action === "lock-in") {
      const supabase = await createClient();
      const { error } = await supabase.rpc("submit_program", {
        p_game_id: gameId,
        p_card_ids: body.cardIds,
      });
      if (error) {
        throw new GameError(
          SUBMIT_MESSAGES[error.message] ??
            "Your program could not be submitted. Please try again.",
          409,
        );
      }
      return await snapshot(gameId, userId);
    }

    throw new GameError("Unknown action.");
  } catch (error) {
    return failure(error);
  }
}
