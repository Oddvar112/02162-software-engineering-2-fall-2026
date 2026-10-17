import { Direction } from "@/lib/direction";
import { dealHands } from "@/lib/game/deck";
import { staticBoard } from "@/lib/game/game-model";
import { GameError } from "@/lib/game/store";
import { createServiceClient } from "@/lib/supabase/service";
import { createDemoHands, isDemoBoard } from "@/demo";
import type { Board } from "@/lib/board";

export async function initialiseGame(gameId: string): Promise<void> {
  const service = createServiceClient();

  // Bug 2 fix: check whether the game is already set up BEFORE testing lobby
  // status. Once a lobby moves to "finished" the status check would otherwise
  // throw 409 for every player except the one whose request resolved the last
  // round — breaking the game page for everyone else.
  const { data: existing } = await service
    .from("games")
    .select("board")
    .eq("id", gameId)
    .maybeSingle();
  if (!existing) throw new GameError("This game does not exist.", 404);

  if (existing.board) {
    if (!isDemoBoard(existing.board)) return;
    // Bug 3 fix: drop the round = 1 filter. begin_next_round advances hand
    // rows to the current round number, so after round 1 there are no round-1
    // rows and the check would always be false — causing demo setup to re-run
    // on every GET from round 2 onwards.
    const { data: hand } = await service
      .from("hands")
      .select("user_id")
      .eq("game_id", gameId)
      .limit(1)
      .maybeSingle();
    if (hand) return;
  }

  const { data: lobby } = await service
    .from("lobbies")
    .select("id, status, lobby_players(user_id, joined_at, robot_model)")
    .eq("game", gameId)
    .maybeSingle();
  if (!lobby) throw new GameError("This game has no lobby.", 404);
  if (lobby.status !== "started") {
    throw new GameError("This game has not been started.", 409);
  }

  const board: Board = existing.board ?? staticBoard;

  const members = [...lobby.lobby_players].sort((a, b) =>
    a.joined_at.localeCompare(b.joined_at),
  );
  if (members.length > board.startpositions.length) {
    throw new GameError("The board has too few start positions.", 409);
  }

  const players = members.map(({ user_id, robot_model }, seat) => ({
    game_id: gameId,
    user_id,
    seat,
    robot_model,
    x: board.startpositions[seat].x,
    z: board.startpositions[seat].y,
    direction: Direction.Up,
  }));
  const { error: playersError } = await service
    .from("game_players")
    .upsert(players, { onConflict: "game_id,user_id", ignoreDuplicates: true });
  if (playersError) throw playersError;

  const playerIds = players.map((player) => player.user_id);
  const hands = isDemoBoard(board)
    ? createDemoHands(playerIds)
    : dealHands(playerIds);

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
    .update({ board, updated_at: new Date().toISOString() })
    .eq("id", gameId)
    .is("board", null);
  if (boardError) throw boardError;
}
