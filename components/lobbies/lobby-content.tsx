import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import roster from "@/lib/robots.json";
import { LeaveLobbyButton } from "./leave-lobby-button";
import { LobbyRealtime } from "./lobby-realtime";
import { LobbySettings } from "./lobby-settings";
import { OtherRobots } from "./other-robots";
import { RobotPicker } from "./robot-picker";
import { StartLobbyButton } from "./start-lobby-button";

export default async function LobbyContent({
  params,
}: {
  params: Promise<{ lobbyId: string }>;
}) {
  const { lobbyId } = await params;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub as string | undefined;

  let { data: lobby, error } = await supabase
    .from("lobbies")
    .select(
      "id, min_players, max_players, status, created_by, game, lobby_players(user_id, joined_at, robot_model)",
    )
    .eq("id", lobbyId)
    .maybeSingle();

  if (error || !lobby) {
    const fallback = await supabase
      .from("lobbies")
      .select(
        "id, max_players, status, created_by, game, lobby_players(user_id, joined_at, robot_model)",
      )
      .eq("id", lobbyId)
      .maybeSingle();

    if (fallback.data) {
      lobby = {
        ...fallback.data,
        min_players: 2,
      };
    }
  }

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
  const me = players.find((p) => p.user_id === userId);
  const isMember = me !== undefined;
  const canChoose = isMember && lobby.status === "open";
  const robotNames = new Map(roster.map((robot) => [robot.id, robot.name]));

  const { data: game } =
    lobby.status === "finished"
      ? await supabase
          .from("games")
          .select("winner_id")
          .eq("id", lobby.game)
          .maybeSingle()
      : { data: null };
  const winnerName = game?.winner_id ? names.get(game.winner_id) : null;

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center">
      <OtherRobots
        players={players
          .filter((p) => p.user_id !== userId && p.robot_model)
          .map((p) => ({
            id: p.user_id,
            name: names.get(p.user_id) ?? "Unknown player",
            robot: p.robot_model,
          }))}
      />
      <div className="flex w-full flex-1 flex-col items-center">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-4xl font-bold tracking-tight">Lobby</h1>
            <LobbySettings
              lobbyId={lobby.id}
              minPlayers={lobby.min_players}
              maxPlayers={lobby.max_players}
              playerCount={players.length}
              isHost={lobby.created_by === userId}
              status={lobby.status}
            />
          </div>
          <p className="text-lg text-foreground/70">
            {players.length} / {lobby.max_players} players (min.{" "}
            {lobby.min_players})
          </p>
          {lobby.status === "started" && (
            <p className="text-sm text-foreground/50">
              This game has already started.
            </p>
          )}
          {lobby.status === "finished" && (
            <p className="text-lg font-semibold">
              {winnerName ? `${winnerName} won the race.` : "The game is over."}
            </p>
          )}
          {lobby.status === "started" && isMember && (
            <Link href={`/games/${lobby.game}`} className="underline">
              Go to the game
            </Link>
          )}
          <div
            className={
              canChoose
                ? "mt-4 grid w-full max-w-5xl justify-items-center gap-6 md:grid-cols-[1fr_auto_1fr] md:items-start"
                : "mt-4"
            }
          >
            <div className="rounded border p-4 md:justify-self-end">
              <h2 className="mb-2 text-xl font-semibold">Players</h2>
              <ul className="text-left">
                {players.map((player) => (
                  <li key={player.user_id} className="py-1">
                    {names.get(player.user_id) ?? "Unknown player"}
                    <span className="ml-2 text-sm text-foreground/70">
                      {robotNames.get(player.robot_model) ?? "No robot yet"}
                    </span>
                    {player.user_id === lobby.created_by && (
                      <span className="ml-2 text-xs text-foreground/50">
                        host
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {me && lobby.status === "open" && (
              <RobotPicker
                lobbyId={lobby.id}
                chosen={me.robot_model}
                taken={players
                  .filter((p) => p.user_id !== userId && p.robot_model)
                  .map((p) => p.robot_model)}
              />
            )}
          </div>
          <LobbyRealtime lobbyId={lobby.id} isMember={isMember} />
          {isMember &&
            lobby.status === "open" &&
            lobby.created_by === userId && (
              <StartLobbyButton
                lobbyId={lobby.id}
                playerCount={players.length}
                minPlayers={lobby.min_players}
                robotsChosen={players.every((p) => p.robot_model)}
              />
            )}
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
