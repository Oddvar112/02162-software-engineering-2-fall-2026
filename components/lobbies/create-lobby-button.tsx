"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const MESSAGES: Record<string, string> = {
  already_in_a_lobby: "You are already in a lobby. Leave it first.",
  not_authenticated: "Please sign in to create a lobby.",
};

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
        setError(MESSAGES[rpcError.message] ?? "Could not create the lobby.");
        return;
      }

      // Redirect to newly created lobby
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
      <Button onClick={handleCreateLobby} disabled={isLoading}>
        {isLoading ? "Creating..." : "Create Lobby"}
      </Button>
      {error && (
        <div className="mt-2 text-sm text-red-600">
          <p>{error}</p>
          {error === MESSAGES.already_in_a_lobby && (
            <p className="mt-1">
              <Link
                href="/lobbies"
                className="font-medium text-foreground underline"
              >
                View or leave your current lobby &rarr;
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
