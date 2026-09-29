"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function leaveLobby(lobbyId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("leave_lobby", {
    p_lobby_id: lobbyId,
  });

  if (error) {
    console.error("Error leaving lobby:", error);
    throw new Error(`Could not leave lobby: ${error.message}`);
  }

  redirect("/lobbies");
}
