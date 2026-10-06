"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface LobbySettingsProps {
  lobbyId: string;
  minPlayers: number;
  maxPlayers: number;
  playerCount: number;
  isHost: boolean;
  status: string;
}

const MESSAGES: Record<string, string> = {
  max_below_current_players:
    "Cannot set maximum players below the current player count.",
  invalid_player_limits:
    "Invalid player limits. Must be between 2 and 8, and minimum cannot exceed maximum.",
  not_creator: "Only the host can change game settings.",
  lobby_not_open: "Game settings cannot be changed after the game has started.",
  lobby_not_found: "This lobby no longer exists.",
  not_authenticated: "Please sign in to update settings.",
};

export function LobbySettings({
  lobbyId,
  minPlayers: initialMin,
  maxPlayers: initialMax,
  playerCount,
  isHost,
  status,
}: LobbySettingsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [minPlayers, setMinPlayers] = useState(initialMin);
  const [maxPlayers, setMaxPlayers] = useState(initialMax);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Synchronize local state with props when opening or props update
  const handleToggle = () => {
    if (!isOpen) {
      setMinPlayers(initialMin);
      setMaxPlayers(initialMax);
      setError(null);
      setSuccess(false);
    }
    setIsOpen(!isOpen);
  };

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
    if (maxPlayers < playerCount) {
      return `Maximum players cannot be less than the current player count (${playerCount}).`;
    }
    return null;
  };

  const validationError = isHost ? getValidationError() : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("update_lobby_settings", {
        p_lobby_id: lobbyId,
        p_min_players: minPlayers,
        p_max_players: maxPlayers,
      });

      if (rpcError) {
        if (
          rpcError.code === "PGRST202" ||
          rpcError.message.includes("update_lobby_settings")
        ) {
          setError(
            "Database migration not applied yet. Run 'npx supabase db push' in your terminal.",
          );
        } else {
          setError(
            MESSAGES[rpcError.message] ?? "Could not update lobby settings.",
          );
        }
        return;
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
      }, 800);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        aria-label="Game settings"
        aria-expanded={isOpen}
        title="Game settings"
        className="rounded-full hover:bg-accent"
      >
        <Settings
          className={`h-5 w-5 transition-transform duration-200 ${
            isOpen ? "rotate-90 text-primary" : "text-foreground/70"
          }`}
        />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 sm:w-96">
          <Card className="border shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">
                Game Settings
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                aria-label="Close settings"
                className="h-7 w-7 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="pt-2">
              {isHost && status === "open" ? (
                <form onSubmit={handleSave} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="min-players">
                      Minimum players (2 &ndash; 8)
                    </Label>
                    <Input
                      id="min-players"
                      type="number"
                      min={2}
                      max={8}
                      value={minPlayers}
                      onChange={(e) => setMinPlayers(Number(e.target.value))}
                      disabled={isSaving}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="max-players">
                      Maximum players (2 &ndash; 8)
                    </Label>
                    <Input
                      id="max-players"
                      type="number"
                      min={2}
                      max={8}
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                      disabled={isSaving}
                      required
                    />
                  </div>

                  {validationError && (
                    <p
                      role="alert"
                      className="text-xs font-medium text-destructive"
                    >
                      {validationError}
                    </p>
                  )}

                  {error && (
                    <p
                      role="alert"
                      className="text-xs font-medium text-destructive"
                    >
                      {error}
                    </p>
                  )}

                  {success && (
                    <p
                      role="status"
                      className="text-xs font-medium text-green-600"
                    >
                      Settings saved successfully!
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={validationError !== null || isSaving}
                    >
                      {isSaving ? "Saving..." : "Save settings"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-3 py-2 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-foreground/70">Minimum players:</span>
                    <span className="font-semibold">{initialMin}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-foreground/70">Maximum players:</span>
                    <span className="font-semibold">{initialMax}</span>
                  </div>
                  <p className="text-xs text-foreground/50">
                    {status !== "open"
                      ? "Settings cannot be changed after the game has started."
                      : "Only the host can modify the game settings."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
