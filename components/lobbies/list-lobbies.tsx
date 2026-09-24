import { createClient } from "@/lib/supabase/server";
import { JoinLobbyButton } from "./join-lobby-button";

export default async function LobbyList() {
  const supabase = await createClient();

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
      <h1 className="text-3xl font-bold tracking-tight">Available lobbies</h1>

      {lobbies.length === 0 ? (
        <p className="text-foreground/70">No lobbies are open right now.</p>
      ) : (
        <ul className="flex w-full max-w-xl flex-col gap-3">
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
    </main>
  );
}
