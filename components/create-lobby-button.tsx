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

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User fetch error:", userError);
        setError("Failed to get user");
        setIsLoading(false);
        return;
      }

      // Insert lobby
      const { data: lobby, error: lobbyError } = await supabase
        .from("lobbies")
        .insert([{ created_by: user.id, max_players: 4 }])
        .select()
        .single();

      if (lobbyError) {
        console.error("Lobby insert error:", lobbyError);
        setError(`Failed to create lobby: ${lobbyError.message}`);
        setIsLoading(false);
        return;
      }

      // Insert into lobby_players
      const { error: playerError } = await supabase
        .from("lobby_players")
        .insert([{ lobby_id: lobby.id, user_id: user.id }]);

      if (playerError) {
        console.error("Player insert error:", playerError);
        setError(`Failed to join lobby: ${playerError.message}`);
        setIsLoading(false);
        return;
      }

      // Redirect
      router.push(`/${lobby.id}`);
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
