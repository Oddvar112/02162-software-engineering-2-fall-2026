import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { JoinLobbyButton } from "./join-lobby-button";
import { LeaveLobbyButton } from "./leave-lobby-button";

type LobbyItem = {
  id: string;
  min_players: number;
  max_players: number;
  created_by: string;
  lobby_players: { count: number }[];
};

export default async function LobbyList({
  searchParams,
}: {
  searchParams: Promise<{ closed?: string }>;
}) {
  const { closed } = await searchParams;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub as string | undefined;

  let lobbies: LobbyItem[];

  const { data: primary } = await supabase
    .from("lobbies")
    .select("id, min_players, max_players, created_by, lobby_players(count)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (primary) {
    lobbies = primary as LobbyItem[];
  } else {
    const { data: fallback, error: fallbackError } = await supabase
      .from("lobbies")
      .select("id, max_players, created_by, lobby_players(count)")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (fallbackError || !fallback) {
      return (
        <main className="rr-page flex flex-col items-center justify-center gap-3 text-center">
          <h1 className="text-3xl font-black uppercase">Could not load the lobbies</h1>
          <p className="text-muted-foreground">Try again in a moment.</p>
        </main>
      );
    }

    lobbies = fallback.map((l) => ({
      ...l,
      min_players: 2,
    })) as LobbyItem[];
  }

  const { data: hosts } = lobbies.length
    ? await supabase
        .from("users")
        .select("id, display_name")
        .in(
          "id",
          lobbies.map((l) => l.created_by),
        )
    : { data: [] };

  const hostNames = new Map(hosts?.map((h) => [h.id, h.display_name]) ?? []);

  const { data: joined } = await supabase
    .from("lobbies")
    .select("id, status, created_by, lobby_players!inner(user_id)")
    .eq("lobby_players.user_id", userId ?? "")
    .in("status", ["open", "started"])
    .limit(1);

  const current = joined?.[0];
  const started = current?.status === "started";

  return (
    <main className="rr-page flex flex-col items-center gap-6">
      <header className="rr-reveal w-full max-w-3xl pt-5 text-center">
        <p className="rr-kicker">Matchmaking terminal</p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-normal sm:text-5xl">
          Available lobbies
        </h1>
        <p className="mt-3 text-muted-foreground">
          Select an open production line and enter the race.
        </p>
      </header>

      {closed === "1" && !current && (
        <p role="status" className="border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent">
          The host closed that lobby.
        </p>
      )}

      {current && (
        <div className="rr-panel flex w-full max-w-xl flex-col items-center gap-3 p-5 text-center">
          <p className="rr-panel-title">Active connection</p>
          <p className="font-bold uppercase">
            {started
              ? "Your game is in progress"
              : "You are already in a lobby"}
          </p>
          <p className="text-sm text-muted-foreground">
            {started
              ? "Finish it before joining another lobby."
              : "Leave it before joining another one."}
          </p>
          <div className="items-begin mt-3 flex gap-3">
            <Button asChild>
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
        <div className="rr-panel w-full max-w-xl p-8 text-center text-muted-foreground">
          No lobbies are open right now.
        </div>
      ) : (
        <ul className="flex w-full max-w-3xl flex-col gap-3">
          {lobbies.map((lobby) => {
            const players = lobby.lobby_players[0]?.count ?? 0;
            const host = hostNames.get(lobby.created_by) ?? "Unknown player";

            return (
              <li
                key={lobby.id}
                className="rr-panel rr-reveal flex items-center justify-between gap-4 p-4 sm:p-5"
              >
                <div>
                  <p className="font-bold uppercase">{host}&apos;s lobby</p>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    {players} / {lobby.max_players} players (min.{" "}
                    {lobby.min_players})
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
      <Button asChild variant={"default"}>
        <Link href={"/"}>Return to home</Link>
      </Button>
    </main>
  );
}
