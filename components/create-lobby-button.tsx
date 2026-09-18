"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateLobbyButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateLobby = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data: lobbyId, error: rpcError } = await supabase.rpc(
        "create_lobby_with_game",
      );

      if (rpcError) {
        console.error("Create lobby error:", rpcError);
        setError(`Failed to create lobby: ${rpcError.message}`);
        return;
      }

      // Redirect
      router.push(`/lobbies/${lobbyId}`);
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleCreateLobby}
        disabled={isLoading}
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? "Creating..." : "Create Lobby"}
      </button>
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  );
}
