import GameContent from "@/components/game/game-content";
import { Suspense } from "react";

export default function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  return (
    <Suspense fallback={<p className="p-12 text-center">Loading game…</p>}>
      <GameContent params={params} />
    </Suspense>
  );
}
