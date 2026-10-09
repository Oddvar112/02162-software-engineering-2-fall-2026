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

type LobbyDetails = {
  id: string;
  min_players: number;
  max_players: number;
  status: string;
  created_by: string;
  game: string;
  lobby_players: {
    user_id: string;
    joined_at: string;
    robot_model: string | null;
  }[];
};

export default async function LobbyContent({
  params,
}: {
  params: Promise<{ lobbyId: string }>;
}) {
  const { lobbyId } = await params;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub as string | undefined;

  let lobby: LobbyDetails | null = null;

  const { data: primary } = await supabase
    .from("lobbies")
    .select(
      "id, min_players, max_players, status, created_by, game, lobby_players(user_id, joined_at, robot_model)",
    )
    .eq("id", lobbyId)
    .maybeSingle();

  if (primary) {
    lobby = primary as LobbyDetails;
  } else {
    const { data: fallback } = await supabase
      .from("lobbies")
      .select(
        "id, max_players, status, created_by, game, lobby_players(user_id, joined_at, robot_model)",
      )
      .eq("id", lobbyId)
      .maybeSingle();

    if (fallback) {
      lobby = {
        ...fallback,
        min_players: 2,
      } as LobbyDetails;
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
    <main className="rr-page relative flex flex-col items-center">
      <OtherRobots
        players={players
          .filter((p) => p.user_id !== userId && p.robot_model)
          .map((p) => ({
            id: p.user_id,
            name: names.get(p.user_id) ?? "Unknown player",
            robot: p.robot_model!,
          }))}
      />
      <div className="flex w-full flex-1 flex-col items-center">
        <div className="rr-reveal flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="rr-kicker">Assembly bay / lobby status</p>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-4xl font-black uppercase tracking-normal sm:text-5xl">Lobby</h1>
            <LobbySettings
              lobbyId={lobby.id}
              minPlayers={lobby.min_players}
              maxPlayers={lobby.max_players}
              playerCount={players.length}
              isHost={lobby.created_by === userId}
              status={lobby.status}
            />
          </div>
          <p className="font-mono text-lg text-muted-foreground">
            {players.length} / {lobby.max_players} players (min.{" "}
            {lobby.min_players})
          </p>
          {lobby.status === "started" && (
            <p className="text-sm text-muted-foreground">
              This game has already started.
            </p>
          )}
          {lobby.status === "finished" && (
            <p className="border border-primary/40 bg-primary/10 px-4 py-2 text-lg font-bold">
              {winnerName ? `${winnerName} won the race.` : "The game is over."}
            </p>
          )}
          {lobby.status === "started" && isMember && (
            <Link href={`/games/${lobby.game}`} className="font-bold uppercase text-primary underline underline-offset-4">
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
            <div className="rr-panel w-full p-5 text-left md:w-72 md:justify-self-end">
              <h2 className="rr-panel-title mb-3">Players</h2>
              <ul className="text-left">
                {players.map((player) => (
                  <li key={player.user_id} className="border-t border-border py-2 first:border-t-0">
                    {names.get(player.user_id) ?? "Unknown player"}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {(player.robot_model &&
                        robotNames.get(player.robot_model)) ??
                        "No robot yet"}
                    </span>
                    {player.user_id === lobby.created_by && (
                      <span className="ml-2 font-mono text-xs uppercase text-primary">
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
                  .map((p) => p.robot_model!)}
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
            <Link href="/lobbies" className="font-bold uppercase text-primary underline underline-offset-4">
              Back to lobbies
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
