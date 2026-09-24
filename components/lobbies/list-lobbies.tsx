import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { JoinLobbyButton } from "./join-lobby-button";
import { LeaveLobbyButton } from "./leave-lobby-button";

export default async function LobbyList({
  searchParams,
}: {
  searchParams: Promise<{ closed?: string }>;
}) {
  const { closed } = await searchParams;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub as string | undefined;

  const { data: lobbies, error } = await supabase
    .from("lobbies")
    .select(
      "id, max_players, created_by, host:users!created_by(display_name), lobby_players(count)",
    )
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

  const { data: joined } = await supabase
    .from("lobbies")
    .select("id, status, created_by, lobby_players!inner(user_id)")
    .eq("lobby_players.user_id", userId ?? "")
    .in("status", ["open", "started"])
    .limit(1);

  const current = joined?.[0];
  const started = current?.status === "started";

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-12">
      <h1 className="text-3xl font-bold tracking-tight">Available lobbies</h1>

      {closed === "1" && !current && (
        <p role="status" className="text-sm text-foreground/70">
          The host closed that lobby.
        </p>
      )}

      {current && (
        <div className="flex w-full max-w-xl flex-col items-center gap-3 rounded-lg border p-4 text-center">
          <p className="font-medium">
            {started
              ? "Your game is in progress"
              : "You are already in a lobby"}
          </p>
          <p className="text-sm text-foreground/70">
            {started
              ? "Finish it before joining another lobby."
              : "Leave it before joining another one."}
          </p>
          <div className="flex items-center gap-3">
            <Button asChild size="sm">
              <Link href={`/lobbies/${current.id}`}>Open</Link>
            </Button>
            {!started && (
              <LeaveLobbyButton
                lobbyId={current.id}
                isHost={current.created_by === userId}
              />
            )}
          </div>
        </div>
      )}

      {lobbies.length === 0 ? (
        <p className="text-foreground/70">No lobbies are open right now.</p>
      ) : (
        <ul className="flex w-full max-w-xl flex-col gap-3">
          {lobbies.map((lobby) => {
            const players = lobby.lobby_players[0]?.count ?? 0;
            const host = lobby.host?.display_name ?? "Unknown player";

            return (
              <li
                key={lobby.id}
                className="flex items-center justify-between gap-4 rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{host}&apos;s lobby</p>
                  <p className="text-sm text-foreground/70">
                    {players} / {lobby.max_players} players
                  </p>
                </div>
                {current ? (
                  <Button size="sm" disabled>
                    {current.id === lobby.id ? "Joined" : "Join"}
                  </Button>
                ) : (
                  <JoinLobbyButton
                    lobbyId={lobby.id}
                    full={players >= lobby.max_players}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
