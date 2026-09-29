import type { Metadata } from "next";
import { Suspense } from "react";
import { GameLoading, GameStateView } from "@/components/game/game-state-view";

export const metadata: Metadata = {
  title: "Game · RoboRally",
  description: "The board, players, phase and action cards for this game.",
};

async function Game({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  return <GameStateView gameId={gameId} />;
}

export default function GamePage(props: {
  params: Promise<{ gameId: string }>;
}) {
  return (
    <Suspense fallback={<GameLoading />}>
      <Game {...props} />
    </Suspense>
  );
}
