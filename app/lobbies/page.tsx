import LobbyList from "@/components/lobbies/list-lobbies";
import { Suspense } from "react";

export default async function LobbiesPage() {
  return (
    <Suspense fallback={<LobbiesSkeleton />}>
      <LobbyList />
    </Suspense>
  );
}

function LobbiesSkeleton() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <p className="mt-20 text-foreground/50">Loading availabe lobbies...</p>
    </main>
  );
}
