import LobbyList from "@/components/lobbies/list-lobbies";
import { Suspense } from "react";

export default async function LobbiesPage({
  searchParams,
}: {
  searchParams: Promise<{ closed?: string }>;
}) {
  const { closed } = await searchParams;

  return (
    <Suspense fallback={<LobbiesSkeleton />}>
      <LobbyList closed={closed === "1"} />
    </Suspense>
  );
}

function LobbiesSkeleton() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <p className="mt-20 text-foreground/50">Loading available lobbies...</p>
    </main>
  );
}
