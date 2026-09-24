"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const MESSAGES: Record<string, string> = {
  not_in_lobby: "You are not a member of this lobby.",
  lobby_not_open: "This game has already started.",
  lobby_not_found: "This lobby no longer exists.",
  not_authenticated: "Sign in to leave a lobby.",
};

export function LeaveLobbyButton({
  lobbyId,
  isHost,
}: {
  lobbyId: string;
  isHost: boolean;
}) {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leave = async () => {
    setIsLeaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("leave_lobby", {
        p_lobby_id: lobbyId,
      });

      if (rpcError) {
        setError(MESSAGES[rpcError.message] ?? "Could not leave the lobby.");
        setConfirming(false);
        return;
      }

      router.push("/lobbies");
      router.refresh();
    } catch {
      setError("Could not leave the lobby. Try again.");
      setConfirming(false);
    } finally {
      setIsLeaving(false);
    }
  };

  if (isHost && confirming) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm">Close this lobby for everyone?</p>
        <div className="flex gap-2">
          <Button variant="destructive" onClick={leave} disabled={isLeaving}>
            {isLeaving ? "Closing..." : "Yes, close it"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfirming(false)}
            disabled={isLeaving}
          >
            Cancel
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant="outline"
        onClick={isHost ? () => setConfirming(true) : leave}
        disabled={isLeaving}
      >
        {isLeaving ? "Leaving..." : isHost ? "Close lobby" : "Leave lobby"}
      </Button>
      {isHost && (
        <p className="text-xs text-foreground/50">
          Closing removes the lobby for everyone.
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
