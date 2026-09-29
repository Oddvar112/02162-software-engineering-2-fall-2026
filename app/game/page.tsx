import type { Metadata } from "next";
import { Suspense } from "react";
import { GameLoading, GameStateView } from "@/components/game/game-state-view";

export const metadata: Metadata = {
  title: "Game state · RoboRally",
  description: "The current RoboRally board, players, phase, and action cards.",
};

async function PlayerGame({
  searchParams,
}: {
  searchParams: Promise<{ player?: string }>;
}) {
  const { player } = await searchParams;
  return <GameStateView key={player ?? "player-1"} playerId={player} />;
}

export default function GamePage(props: {
  searchParams: Promise<{ player?: string }>;
}) {
  return (
    <Suspense fallback={<GameLoading />}>
      <PlayerGame {...props} />
    </Suspense>
  );
}
