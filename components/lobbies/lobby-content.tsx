import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function LobbyContent({
  params,
}: {
  params: Promise<{ lobbyId: string }>;
}) {
  const { lobbyId } = await params;
  const supabase = await createClient();

  const { data: lobby } = await supabase
    .from("lobbies")
    .select("id, max_players, status, lobby_players(user_id, joined_at)")
    .eq("id", lobbyId)
    .maybeSingle();

  if (!lobby) {
    notFound();
  }

  const players = [...lobby.lobby_players].sort((a, b) =>
    a.joined_at.localeCompare(b.joined_at),
  );

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-full flex-1 flex-col items-center">
        <nav className="flex h-16 w-full justify-center border-b border-b-foreground/10">
          <div className="flex w-full max-w-5xl items-center justify-between p-3 px-5 text-sm">
            <div className="flex items-center gap-5 font-semibold">
              <Link href="/">RoboRally</Link>
            </div>
          </div>
        </nav>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Lobby</h1>
          <p className="text-lg text-foreground/70">
            {players.length} / {lobby.max_players} players
          </p>
          {lobby.status !== "open" && (
            <p className="text-sm text-foreground/50">
              This game has already started.
            </p>
          )}
          <div className="mt-4 rounded border p-4">
            <h2 className="mb-2 text-xl font-semibold">Players</h2>
            <ul className="text-left">
              {players.map((player) => (
                <li key={player.user_id} className="py-1">
                  {player.user_id}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
