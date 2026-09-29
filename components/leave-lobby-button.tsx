"use client";

import { leaveLobby } from "@/app/actions/lobby";
import { useState } from "react";
import { Button } from "./ui/button";

export function LeaveLobbyButton({
  lobbyId,
  isCreator = false,
}: {
  lobbyId: string;
  isCreator?: boolean;
}) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLeave = async () => {
    setIsLeaving(true);
    setError(null);

    try {
      await leaveLobby(lobbyId);
    } catch (err) {
      console.error("Error leaving lobby:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not leave the lobby. Try again.",
      );
      setIsLeaving(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handleLeave}
        disabled={isLeaving}
        variant="outline"
        size="lg"
      >
        {isLeaving ? "Leaving..." : isCreator ? "Disband Lobby" : "Leave Lobby"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
