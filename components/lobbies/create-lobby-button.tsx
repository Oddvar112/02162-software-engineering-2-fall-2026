"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

const MESSAGES: Record<string, string> = {
  already_in_a_lobby: "You are already in a lobby. Leave it first.",
  invalid_player_limits:
    "Invalid player limits. Must be between 2 and 8, and minimum cannot exceed maximum.",
  not_authenticated: "Please sign in to create a lobby.",
};

export function CreateLobbyButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getValidationError = (): string | null => {
    if (minPlayers < 2) {
      return "Minimum players must be at least 2.";
    }
    if (maxPlayers > 8) {
      return "Maximum players cannot exceed 8.";
    }
    if (minPlayers > maxPlayers) {
      return "Minimum players cannot be greater than maximum players.";
    }
    return null;
  };

  const validationError = getValidationError();

  const handleCreateLobby = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (validationError) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data: lobbyId, error: rpcError } = await supabase.rpc(
        "create_lobby_with_game",
        {
          p_min_players: minPlayers,
          p_max_players: maxPlayers,
        },
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
    <div className="relative inline-block">
      <Button onClick={() => setIsOpen(true)}>Create Lobby</Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm border shadow-xl bg-background">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl font-bold">Create Lobby</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                aria-label="Close dialog"
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleCreateLobby} className="flex flex-col gap-4">
                <p className="text-sm text-foreground/70">
                  Configure the player capacity for your game.
                </p>

                <div className="flex flex-col gap-1.5 text-left">
                  <Label htmlFor="create-min-players">
                    Minimum players (2 &ndash; 8)
                  </Label>
                  <Input
                    id="create-min-players"
                    type="number"
                    min={2}
                    max={8}
                    value={minPlayers}
                    onChange={(e) => setMinPlayers(Number(e.target.value))}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <Label htmlFor="create-max-players">
                    Maximum players (2 &ndash; 8)
                  </Label>
                  <Input
                    id="create-max-players"
                    type="number"
                    min={2}
                    max={8}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    disabled={isLoading}
                    required
                  />
                </div>

                {validationError && (
                  <p
                    role="alert"
                    className="text-xs font-medium text-destructive text-left"
                  >
                    {validationError}
                  </p>
                )}

                {error && (
                  <p
                    role="alert"
                    className="text-xs font-medium text-destructive text-left"
                  >
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={validationError !== null || isLoading}
                  >
                    {isLoading ? "Creating..." : "Confirm & Create"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
