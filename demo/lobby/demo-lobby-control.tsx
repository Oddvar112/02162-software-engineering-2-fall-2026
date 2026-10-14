"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { Board } from "@/lib/board";
import {
  DEFAULT_DEMO_MAP_ID,
  getAllDemoMapsMeta,
  getDemoBoard,
  isDemoBoard,
} from "../maps";
import type { DemoMapMeta } from "../types";

export interface DemoLobbyControlProps {
  lobbyId: string;
  gameId: string;
  isHost: boolean;
  initialBoard?: Board | null;
  status: string;
  playerCount?: number;
  robotsChosen?: boolean;
}

export function DemoLobbyControl({
  gameId,
  isHost,
  initialBoard,
  status,
  playerCount = 1,
  robotsChosen = false,
}: DemoLobbyControlProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [isDemo, setIsDemo] = useState<boolean>(() =>
    isDemoBoard(initialBoard),
  );
  const [selectedMapId, setSelectedMapId] = useState<string>(() =>
    initialBoard && isDemoBoard(initialBoard)
      ? initialBoard.id
      : DEFAULT_DEMO_MAP_ID,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoMaps = getAllDemoMapsMeta();
  const activeMap = demoMaps.find((m) => m.id === selectedMapId) ?? demoMaps[0];

  // Subscribe to real-time updates on this game's board
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`game-demo-lobby:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const newBoard = (payload.new as { board?: Board | null })?.board;
          const demoActive = isDemoBoard(newBoard);
          setIsDemo(demoActive);
          if (demoActive && newBoard?.id) {
            setSelectedMapId(newBoard.id);
          }
          startTransition(() => {
            router.refresh();
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, router]);

  const updateDemoSettings = async (enabled: boolean, mapId?: string) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameId}/demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          mapId: enabled ? (mapId ?? selectedMapId) : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update demo settings.");
      }

      setIsDemo(enabled);
      if (mapId) setSelectedMapId(mapId);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update demo settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = () => {
    const nextState = !isDemo;
    void updateDemoSettings(nextState, nextState ? selectedMapId : undefined);
  };

  const handleSelectMap = (mapId: string) => {
    if (mapId === selectedMapId && isDemo) return;
    setSelectedMapId(mapId);
    if (isDemo) {
      void updateDemoSettings(true, mapId);
    }
  };

  // Non-host view: only display if Demo Mode is active
  if (!isHost) {
    if (!isDemo) return null;

    return (
      <div
        className="my-3 flex w-full max-w-md items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-left"
        role="status"
        aria-label="Demo mode active"
      >
        <FlaskConical className="h-6 w-6 shrink-0 text-amber-500" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              Demo Mode Active
            </span>
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              Dev
            </span>
          </div>
          <p className="text-xs text-foreground/80">
            Map: <strong>{activeMap.name}</strong> &bull; 1+ players &bull; All
            cards unlocked
          </p>
        </div>
      </div>
    );
  }

  // Host view
  return (
    <Card className="my-4 w-full max-w-xl border-dashed border-amber-500/50 bg-amber-500/5 text-left shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-base font-semibold">Demo Mode</CardTitle>
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Dev Only
          </span>
        </div>

        {/* Tactile Toggle Switch */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={isDemo}
            aria-label={isDemo ? "Disable Demo Mode" : "Enable Demo Mode"}
            disabled={isSaving || status !== "open"}
            onClick={handleToggle}
            className={`group inline-flex items-center gap-2.5 rounded-full px-2 py-1 text-left transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span
              className={`text-xs font-bold uppercase tracking-wider select-none ${
                isDemo
                  ? "text-amber-600 dark:text-amber-400 font-extrabold"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {isSaving ? "Saving…" : isDemo ? "ON" : "OFF"}
            </span>

            <span
              className={`relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out shadow-inner ${
                isDemo
                  ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                  : "bg-slate-400 dark:bg-slate-600 group-hover:bg-slate-500"
              }`}
              style={{
                width: "48px",
                height: "26px",
                backgroundColor: isDemo ? "#f59e0b" : "#94a3b8",
                borderRadius: "9999px",
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                transition: "background-color 0.2s ease-in-out",
                boxSizing: "border-box",
              }}
            >
              <span
                className="pointer-events-none inline-flex transform items-center justify-center rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "#ffffff",
                  borderRadius: "9999px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
                  transform: isDemo ? "translateX(24px)" : "translateX(2px)",
                  transition: "transform 0.2s ease-in-out",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isDemo && (
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "9999px",
                      backgroundColor: "#f59e0b",
                    }}
                  />
                )}
              </span>
            </span>
          </button>
        </div>
      </CardHeader>

      {error && (
        <div
          className="mx-6 mb-3 flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isDemo && (
        <CardContent className="space-y-4 pt-1">
          <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/15 p-2.5 text-xs text-amber-700 dark:text-amber-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <strong>Solo Play Enabled:</strong> You can start this game with{" "}
              <strong>1 player</strong>. All 35 programming cards are unlocked
              with relaxed submission lengths and saved presets.
            </span>
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold text-foreground/80">
              {demoMaps.length > 1 ? "Select Demo Map:" : "Demo Map:"}
            </span>
            <div
              className={`grid gap-2 ${
                demoMaps.length > 1
                  ? "sm:grid-cols-3"
                  : "max-w-sm sm:grid-cols-1"
              }`}
            >
              {demoMaps.map((map) => {
                const isSelected = map.id === selectedMapId;
                return (
                  <button
                    key={map.id}
                    type="button"
                    onClick={() => handleSelectMap(map.id)}
                    disabled={isSaving || status !== "open"}
                    className={`flex cursor-pointer flex-col justify-between rounded-md border p-2.5 text-left transition-all ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/15 shadow-sm ring-1 ring-amber-500"
                        : "border-foreground/15 bg-background/60 hover:border-foreground/30 hover:bg-background"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          {map.name}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      <span className="mt-0.5 inline-block text-[11px] text-foreground/60">
                        {map.difficulty} &bull; {map.checkpointCount}{" "}
                        checkpoints
                      </span>
                      <p className="mt-1.5 line-clamp-2 text-xs text-foreground/70">
                        {map.description}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {map.features.slice(0, 2).map((feature) => (
                        <span
                          key={feature}
                          className="rounded bg-foreground/10 px-1 py-0.5 text-[9px] text-foreground/70"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
