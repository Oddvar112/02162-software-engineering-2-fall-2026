import LobbyList from "@/components/lobbies/list-lobbies";
import { Suspense } from "react";

export default function LobbiesPage({
  searchParams,
}: {
  searchParams: Promise<{ closed?: string }>;
}) {
  return (
    <Suspense fallback={<LobbiesSkeleton />}>
      <LobbyList searchParams={searchParams} />
    </Suspense>
  );
}

function LobbiesSkeleton() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center">
      <p className="mt-20 text-foreground/50">Loading available lobbies...</p>
    </main>
  );
}
