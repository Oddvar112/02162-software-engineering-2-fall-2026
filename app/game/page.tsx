import type { Metadata } from "next";
import { RoboBoard } from "@/components/game/robo-board";

export const metadata: Metadata = {
  title: "The Factory Misfits · RoboRally",
  description: "Ten distinct robot characters on the RoboRally board.",
};

export default function GamePage() {
  return <RoboBoard />;
}
