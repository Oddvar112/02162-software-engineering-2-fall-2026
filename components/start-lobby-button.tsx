"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui/button";

const MESSAGES: Record<string, string> = {
  not_creator: "Only the lobby creator can start the game.",
  not_enough_players: "Not enough players to start. Need at least 2.",
  already_started: "This game has already started.",
  lobby_not_found: "This lobby no longer exists.",
};

export function StartLobbyButton({ lobbyId }: { lobbyId: string }) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: gameId, error: rpcError } = await supabase.rpc(
        "start_lobby",
        {
          p_lobby_id: lobbyId,
        },
      );

      if (rpcError) {
        setError(MESSAGES[rpcError.message] ?? "Could not start the lobby.");
        return;
      }

      router.push(`/games/${gameId}`);
    } catch {
      setError("Could not start the lobby. Try again.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div>
      <Button onClick={handleStart} disabled={isStarting} size="lg">
        {isStarting ? "Starting..." : "Start Game"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
