import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeaveLobbyButton } from "./leave-lobby-button";
import { LobbyRealtime } from "./lobby-realtime";

export default async function LobbyContent({
  params,
}: {
  params: Promise<{ lobbyId: string }>;
}) {
  const { lobbyId } = await params;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub as string | undefined;

  const { data: lobby } = await supabase
    .from("lobbies")
    .select(
      "id, max_players, status, created_by, lobby_players(user_id, joined_at)",
    )
    .eq("id", lobbyId)
    .maybeSingle();

  if (!lobby) {
    notFound();
  }

  const players = [...lobby.lobby_players].sort((a, b) =>
    a.joined_at.localeCompare(b.joined_at),
  );
  const { data: profiles } = await supabase
    .from("users")
    .select("id, display_name")
    .in(
      "id",
      players.map((p) => p.user_id),
    );

  const names = new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []);
  const isMember = players.some((p) => p.user_id === userId);

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
                  {names.get(player.user_id) ?? "Unknown player"}
                  {player.user_id === lobby.created_by && (
                    <span className="ml-2 text-xs text-foreground/50">
                      host
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <LobbyRealtime lobbyId={lobby.id} />
          {isMember && lobby.status === "open" ? (
            <LeaveLobbyButton
              lobbyId={lobby.id}
              isHost={lobby.created_by === userId}
            />
          ) : (
            <Link href="/lobbies" className="underline">
              Back to lobbies
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
