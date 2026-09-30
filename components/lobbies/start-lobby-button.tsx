"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const MESSAGES: Record<string, string> = {
  not_creator: "Only the host can start the game.",
  not_enough_players: "At least two players are needed to start.",
  already_started: "This game has already started.",
  lobby_not_found: "This lobby no longer exists.",
  not_authenticated: "Sign in to start the game.",
};

export function StartLobbyButton({
  lobbyId,
  playerCount,
}: {
  lobbyId: string;
  playerCount: number;
}) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = playerCount >= 2;

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
      <Button onClick={start} disabled={!ready || isStarting}>
        {isStarting ? "Starting..." : "Start game"}
      </Button>
      {!ready && (
        <p className="text-xs text-foreground/50">
          Waiting for at least one more player.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
