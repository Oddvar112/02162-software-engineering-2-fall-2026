"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import roster from "@/lib/robots.json";
import { RobotPreview, usePreloadRobots } from "./robot-preview";

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
  usePreloadRobots();
  const [isChoosing, setIsChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(chosen);
  const [previewed, setPreviewed] = useState(chosen);
  const shown = roster.find((robot) => robot.id === previewed);

  useEffect(() => {
    setSelected(chosen);
    setPreviewed(chosen);
  }, [chosen]);

  const choose = async (model: string) => {
    // Draw the selection border on the newly selected robot first
    setSelected(model);
    setIsChoosing(true);
    setError(null);

    // Defer the heavy 3D model preview rendering so the border draws immediately
    startTransition(() => {
      setPreviewed(model);
    });

    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("choose_robot", {
        p_lobby_id: lobbyId,
        p_model: model,
      });

      if (rpcError) {
        setError(MESSAGES[rpcError.message] ?? "Could not choose that robot.");
        setSelected(chosen);
        setPreviewed(chosen);
        return;
      }

      router.refresh();
    } catch {
      setError("Could not choose that robot. Try again.");
      setSelected(chosen);
      setPreviewed(chosen);
    } finally {
      setIsChoosing(false);
    }
  };

  return (
    <>
      <div className="flex min-h-72 w-64 flex-col items-center">
        <RobotPreview id={shown?.id ?? null} />
        {shown ? (
          <>
            <p aria-live="polite">
              <strong>{shown.name}</strong> · {shown.role}
            </p>
            <p className="text-sm text-foreground/70">{shown.personality}</p>
          </>
        ) : (
          <p className="text-sm text-foreground/50">Click a robot to see it.</p>
        )}
      </div>
      <div className="flex flex-col items-center gap-2 md:justify-self-start">
        <h2 className="text-xl font-semibold">Choose your robot</h2>
        <div
          className="grid grid-cols-2 gap-2"
          role="group"
          aria-label="Robots"
        >
          {roster.map((robot) => {
            const isTaken = taken.includes(robot.id);
            const isMine = robot.id === selected;
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
    </>
  );
}
