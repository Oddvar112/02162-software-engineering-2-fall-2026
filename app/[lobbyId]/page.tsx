import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";


export default async function LobbyPage({
  params,
}: {
  params: Promise<{ lobbyId: string }>;
}) {
  const {lobbyId} = await params;
  const supabase = await createClient();
  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbies")
    .select("*")
    .eq("id", lobbyId)
    .single();

  if (lobbyError || !lobby) {
    redirect("/");
  }

  const { data: players, error: playersError } = await supabase
    .from("lobby_players")
    .select("user_id, joined_at")
    .eq("lobby_id", lobbyId)
    .order("joined_at", { ascending: true });

  if (playersError) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-full flex-1 flex-col items-center">
        <nav className="flex h-16 w-full justify-center border-b border-b-foreground/10">
          <div className="flex w-full max-w-5xl items-center justify-between p-3 px-5 text-sm">
            <div className="flex items-center gap-5 font-semibold">
              <a href="/">RoboRally</a>
            </div>
          </div>
        </nav>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Lobby</h1>
          <p className="text-lg text-foreground/70">
            {players?.length || 0} / {lobby.max_players} players
          </p>
          <div className="mt-4 rounded border p-4">
            <h2 className="mb-2 text-xl font-semibold">Players</h2>
            {players && players.length > 0 ? (
              <ul className="text-left">
                {players.map((player) => (
                  <li key={player.user_id} className="py-1">
                    {player.user_id}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-foreground/50">No players yet</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
