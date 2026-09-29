import LobbyContent from "@/components/lobbies/lobby-content";
import { Suspense } from "react";

export default function LobbyPage({
  params,
}: {
  params: Promise<{ lobbyId: string }>;
}) {
  return (
    <Suspense fallback={<LobbySkeleton />}>
      <LobbyContent params={params} />
    </Suspense>
  );
}

function LobbySkeleton() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <p className="mt-20 text-foreground/50">Loading lobby…</p>
    </main>
  );
}
