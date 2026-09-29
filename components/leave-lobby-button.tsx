"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui/button";

export function LeaveLobbyButton({ lobbyId }: { lobbyId: string }) {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLeave = async () => {
    setIsLeaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        setError("Not authenticated.");
        return;
      }

      const { error: deleteError } = await supabase
        .from("lobby_players")
        .delete()
        .eq("lobby_id", lobbyId)
        .eq("user_id", userId);

      if (deleteError) {
        setError("Could not leave the lobby. Try again.");
        return;
      }

      router.push("/lobbies");
    } catch {
      setError("Could not leave the lobby. Try again.");
    } finally {
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
        {isLeaving ? "Leaving..." : "Leave Lobby"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
