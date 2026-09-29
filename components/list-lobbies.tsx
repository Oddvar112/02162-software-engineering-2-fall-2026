// @ts-nocheck
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { JoinLobbyButton } from "./join-lobby-button";

function extractUserLobby(data: any): { userLobby: any; userGame: any } {
  let userLobby = null;
  let userGame = null;

  if (data?.lobbies) {
    const lobbiesData = (data.lobbies) as any;
    const lobby = {
      id: lobbiesData.id,
      max_players: lobbiesData.max_players,
      status: lobbiesData.status,
      game: lobbiesData.game,
      players: lobbiesData.lobby_players[0]?.count ?? 0,
    };

    if (lobby.status === "started") {
      userGame = lobby;
    } else {
      userLobby = lobby;
    }
  }

  return { userLobby, userGame };
}

export default async function LobbyList() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;

  // Find the user's current lobby or active game
  let userLobby = null;
  let userGame = null;
  if (currentUserId) {
    const { data } = await supabase
      .from("lobby_players")
      .select("lobby_id, lobbies(id, max_players, status, game, lobby_players(count))")
      .eq("user_id", currentUserId)
      .maybeSingle();

    // @ts-ignore
    const result = extractUserLobby(data);
    userLobby = result.userLobby;
    userGame = result.userGame;
  }

  const { data: lobbies, error } = await supabase
    .from("lobbies")
    .select("id, max_players, lobby_players(count)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center gap-3 p-12 text-center">
        <h1 className="text-3xl font-bold">Could not load the lobbies</h1>
        <p className="text-foreground/70">Try again in a moment.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-12">
      <h1 className="text-3xl font-bold tracking-tight">Lobbies</h1>

      {userGame && (
        <div className="w-full max-w-xl">
          <h2 className="mb-3 text-lg font-semibold">Your Active Game</h2>
          <Link
            href={`/games/${userGame.game}`}
            className="flex items-center justify-between gap-4 rounded-lg border bg-blue-500/10 p-4 hover:bg-blue-500/20"
          >
            <div>
              <p className="font-medium">
                {userGame.players} / {userGame.max_players} players
              </p>
              <p className="text-sm text-foreground/70">
                Game in progress
              </p>
            </div>
            <span className="text-sm font-medium text-blue-500">Continue Playing →</span>
          </Link>
        </div>
      )}

      {userLobby && (
        <div className="w-full max-w-xl">
          <h2 className="mb-3 text-lg font-semibold">Your Current Lobby</h2>
          <Link
            href={`/lobbies/${userLobby.id}`}
            className="flex items-center justify-between gap-4 rounded-lg border bg-accent/50 p-4 hover:bg-accent/70"
          >
            <div>
              <p className="font-medium">
                {userLobby.players} / {userLobby.max_players} players
              </p>
              <p className="text-sm text-foreground/70">
                Status: <span className="capitalize">{userLobby.status}</span>
              </p>
            </div>
            <span className="text-sm font-medium text-primary">View Lobby →</span>
          </Link>
        </div>
      )}

      <div className="w-full max-w-xl">
        <h2 className="mb-3 text-lg font-semibold">Available Lobbies</h2>

        {lobbies.length === 0 ? (
          <p className="text-foreground/70">No lobbies are open right now.</p>
        ) : (
          <ul className="flex w-full flex-col gap-3">
            {lobbies.map((lobby) => {
              const players = lobby.lobby_players[0]?.count ?? 0;

              return (
                <li
                  key={lobby.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">
                      {players} / {lobby.max_players} players
                    </p>
                    <p className="font-mono text-xs text-foreground/50">
                      {lobby.id}
                    </p>
                  </div>
                  <JoinLobbyButton
                    lobbyId={lobby.id}
                    full={players >= lobby.max_players}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
