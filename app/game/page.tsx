import type { Metadata } from "next";
import { GameStateView } from "@/components/game/game-state-view";

export const metadata: Metadata = {
  title: "Game state · RoboRally",
  description: "The current RoboRally board, players, phase, and action cards.",
};

export default function GamePage() {
  return <GameStateView />;
}
