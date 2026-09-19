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
    .select("id")
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

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-12 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Game</h1>
      <p className="text-foreground/70">Game ID: {game.id}</p>
      <Link href="/lobbies" className="underline">
        Back to lobbies
      </Link>
    </main>
  );
}
