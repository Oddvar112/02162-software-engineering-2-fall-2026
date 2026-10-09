"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GameState } from "@/lib/game/types";

const SYNC_INTERVAL_MS = 5_000;

type SubmitProgram = {
  round: number;
  cardIds: string[];
};

export function useGameStateSync(
  gameId: string,
  receiveState: (state: GameState) => void,
) {
  const endpoint = `/api/games/${gameId}`;
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitting = useRef(false);
  const requestController = useRef<AbortController | null>(null);
  const reloadWanted = useRef(false);

  const reload = useCallback(async () => {
    if (requestController.current || submitting.current) {
      reloadWanted.current = true;
      return;
    }

    const controller = new AbortController();
    requestController.current = controller;
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const state = (await response.json()) as GameState;
      if (!controller.signal.aborted) receiveState(state);
    } catch (requestError) {
      if (requestError instanceof Error && requestError.name === "AbortError") {
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The game state is unavailable",
      );
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        setIsSyncing(false);
        if (reloadWanted.current) {
          reloadWanted.current = false;
          void reload();
        }
      }
    }
  }, [endpoint, receiveState]);

  useEffect(() => {
    void reload();
    const interval = window.setInterval(reload, SYNC_INTERVAL_MS);
    const supabase = createClient();
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        () => void reload(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_players",
          filter: `game_id=eq.${gameId}`,
        },
        () => void reload(),
      )
      .subscribe();
    const reloadWhenVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };

    window.addEventListener("online", reload);
    document.addEventListener("visibilitychange", reloadWhenVisible);
    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
      window.removeEventListener("online", reload);
      document.removeEventListener("visibilitychange", reloadWhenVisible);
      requestController.current?.abort();
      requestController.current = null;
    };
  }, [gameId, reload]);

  const submitProgram = useCallback(
    async ({ round, cardIds }: SubmitProgram) => {
      if (submitting.current) return;
      submitting.current = true;
      setIsSubmitting(true);
      setSubmitError(null);
      requestController.current?.abort();
      requestController.current = null;
      setIsSyncing(false);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "lock-in", round, cardIds }),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result.error ?? "Your program could not be submitted. Please try again.",
          );
        }
        receiveState(result as GameState);
        setError(null);
      } catch (submissionError) {
        setSubmitError(
          submissionError instanceof Error
            ? submissionError.message
            : "Your program could not be submitted. Please try again.",
        );
      } finally {
        submitting.current = false;
        setIsSubmitting(false);
        void reload();
      }
    },
    [endpoint, receiveState, reload],
  );

  return {
    error,
    isSyncing,
    isSubmitting,
    submitError,
    reload,
    submitProgram,
  };
}