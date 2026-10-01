"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import roster from "@/lib/robots.json";

const MESSAGES: Record<string, string> = {
  unknown_robot: "That robot does not exist.",
  robot_taken: "Another player already picked that robot.",
  lobby_not_open: "This game has already started.",
  lobby_not_found: "This lobby no longer exists.",
  not_in_lobby: "You are not a member of this lobby.",
  not_authenticated: "Sign in to choose a robot.",
};

export function RobotPicker({
  lobbyId,
  chosen,
  taken,
}: {
  lobbyId: string;
  chosen: string | null;
  taken: string[];
}) {
  const router = useRouter();
  const [isChoosing, setIsChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (model: string) => {
    setIsChoosing(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("choose_robot", {
        p_lobby_id: lobbyId,
        p_model: model,
      });

      if (rpcError) {
        setError(MESSAGES[rpcError.message] ?? "Could not choose that robot.");
        return;
      }

      router.refresh();
    } catch {
      setError("Could not choose that robot. Try again.");
    } finally {
      setIsChoosing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <h2 className="text-xl font-semibold">Choose your robot</h2>
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-5"
        role="group"
        aria-label="Robots"
      >
        {roster.map((robot) => {
          const isTaken = taken.includes(robot.id);
          const isMine = robot.id === chosen;
          return (
            <button
              key={robot.id}
              type="button"
              aria-pressed={isMine}
              disabled={isTaken || isChoosing}
              onClick={() => choose(robot.id)}
              className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${isMine ? "border-foreground font-semibold" : ""} ${isTaken ? "opacity-40" : ""}`}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: robot.color }}
                aria-hidden="true"
              />
              {robot.name}
              {isTaken && <span className="sr-only"> (taken)</span>}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
