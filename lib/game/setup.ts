import { Direction } from "@/lib/direction";
import { dealHands } from "@/lib/game/deck";
import { staticBoard } from "@/lib/game/game-model";
import { GameError } from "@/lib/game/store";
import { createServiceClient } from "@/lib/supabase/service";

export async function initialiseGame(gameId: string): Promise<void> {
  const service = createServiceClient();

  const { data: existing } = await service
    .from("games")
    .select("board")
    .eq("id", gameId)
    .maybeSingle();
  if (!existing) throw new GameError("This game does not exist.", 404);
  if (existing.board) return;

  const { data: lobby } = await service
    .from("lobbies")
    .select("id, status, lobby_players(user_id, joined_at, robot_model)")
    .eq("game", gameId)
    .maybeSingle();
  if (!lobby) throw new GameError("This game has no lobby.", 404);
  if (lobby.status !== "started") {
    throw new GameError("This game has not been started.", 409);
  }

  const members = [...lobby.lobby_players].sort((a, b) =>
    a.joined_at.localeCompare(b.joined_at),
  );
  if (members.length > staticBoard.startpositions.length) {
    throw new GameError("The board has too few start positions.", 409);
  }

  const players = members.map(({ user_id, robot_model }, seat) => ({
    game_id: gameId,
    user_id,
    seat,
    robot_model,
    x: staticBoard.startpositions[seat].x,
    z: staticBoard.startpositions[seat].y,
    direction: Direction.Up,
  }));
  const { error: playersError } = await service
    .from("game_players")
    .upsert(players, { onConflict: "game_id,user_id", ignoreDuplicates: true });
  if (playersError) throw playersError;

  const hands = dealHands(players.map((player) => player.user_id));
  const { error: handsError } = await service.from("hands").upsert(
    Object.entries(hands).map(([user_id, cards]) => ({
      game_id: gameId,
      user_id,
      round: 1,
      cards,
    })),
    { onConflict: "game_id,user_id", ignoreDuplicates: true },
  );
  if (handsError) throw handsError;

  const { error: boardError } = await service
    .from("games")
    .update({ board: staticBoard, updated_at: new Date().toISOString() })
    .eq("id", gameId)
    .is("board", null);
  if (boardError) throw boardError;
}
