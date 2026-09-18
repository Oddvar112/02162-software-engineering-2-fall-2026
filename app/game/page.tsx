import type { Metadata } from "next";
import { RoboBoard } from "@/components/game/robo-board";

export const metadata: Metadata = {
  title: "Board and Robot · RoboRally",
  description: "A frontend-only RoboRally board with one robot.",
};

export default function GamePage() {
  return <RoboBoard />;
}
