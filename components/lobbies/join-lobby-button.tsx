"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const MESSAGES: Record<string, string> = {
  lobby_full: "This lobby is full.",
  lobby_not_open: "This game has already started.",
  lobby_not_found: "This lobby no longer exists.",
  not_authenticated: "Sign in to join a lobby.",
  already_member: "You are already a member of this lobby.",
};

export function JoinLobbyButton({
  lobbyId,
  full,
}: {
  lobbyId: string;
  full: boolean;
}) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setIsJoining(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("join_lobby", {
        p_lobby_id: lobbyId,
      });

      if (rpcError) {
        setError(MESSAGES[rpcError.message] ?? "Could not join the lobby.");
        return;
      }

      router.push(`/lobbies/${lobbyId}`);
    } catch {
      setError("Could not join the lobby. Try again.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={handleJoin} disabled={full || isJoining}>
        {full ? "Full" : isJoining ? "Joining..." : "Join"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
