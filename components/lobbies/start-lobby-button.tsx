"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const MESSAGES: Record<string, string> = {
  not_creator: "Only the host can start the game.",
  not_enough_players: "At least two players are needed to start.",
  robot_not_chosen: "Every player must choose a robot first.",
  already_started: "This game has already started.",
  lobby_not_found: "This lobby no longer exists.",
  not_authenticated: "Sign in to start the game.",
};

export function StartLobbyButton({
  lobbyId,
  playerCount,
  robotsChosen,
}: {
  lobbyId: string;
  playerCount: number;
  robotsChosen: boolean;
}) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const waitingFor =
    playerCount < 2
      ? "Waiting for at least one more player."
      : robotsChosen
        ? null
        : "Waiting for every player to choose a robot.";

  const start = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: gameId, error: rpcError } = await supabase.rpc(
        "start_lobby",
        { p_lobby_id: lobbyId },
      );

      if (rpcError || typeof gameId !== "string") {
        setError(
          MESSAGES[rpcError?.message ?? ""] ?? "Could not start the game.",
        );
        setIsStarting(false);
        return;
      }

      window.location.assign(`/games/${gameId}`);
    } catch {
      setError("Could not start the game. Try again.");
      setIsStarting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <Button onClick={start} disabled={waitingFor !== null || isStarting}>
        {isStarting ? "Starting..." : "Start game"}
      </Button>
      {waitingFor && <p className="text-xs text-foreground/50">{waitingFor}</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
