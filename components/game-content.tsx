import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function GameContent({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();

  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const { data: game, error } = await supabase
    .from("games")
    .select("id, lobbies(id, max_players, lobby_players(user_id))")
    .eq("id", gameId)
    .maybeSingle();

  if (error?.code === "22P02") {
    notFound();
  }
  if (error) {
    throw new Error("Could not load the game.", { cause: error });
  }
  if (!game) {
    notFound();
  }

  const lobby = Array.isArray(game.lobbies) ? game.lobbies[0] : game.lobbies;
  const players = lobby?.lobby_players || [];

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-12 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Game</h1>
      <p className="text-foreground/70">Game ID: {game.id}</p>
      
      <div className="mt-4 rounded border p-4">
        <h2 className="mb-2 text-xl font-semibold">Players in Game</h2>
        <ul className="text-left">
          {players.map((player) => (
            <li key={player.user_id} className="py-1">
              {player.user_id}
            </li>
          ))}
        </ul>
      </div>

      <Link href="/lobbies" className="underline">
        Back to lobbies
      </Link>
      <Link href="/" className="underline">
        Back to home
      </Link>
    </main>
  );
}
