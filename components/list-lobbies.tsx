import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { JoinLobbyButton } from "./join-lobby-button";

export default async function LobbyList() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;

  // Find the user's current lobby
  let userLobby = null;
  if (currentUserId) {
    const { data } = await supabase
      .from("lobby_players")
      .select("lobby_id, lobbies(id, max_players, status, lobby_players(count))")
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (data?.lobbies) {
      userLobby = {
        id: data.lobbies.id,
        max_players: data.lobbies.max_players,
        status: data.lobbies.status,
        players: data.lobbies.lobby_players[0]?.count ?? 0,
      };
    }
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
