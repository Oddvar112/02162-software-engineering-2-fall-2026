import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LobbyList() {
  const supabase = await createClient();
  const { data: lobbies, error } = await supabase.from("lobbies").select("*");

  if (error || !lobbies) redirect("/");

  return (
    <div>
      <h1>Available Lobbies</h1>
      {lobbies.length === 0 ? (
        <p>No lobbies available right now.</p>
      ) : (
        <ul>
          {lobbies.map((lobby) => (
            <li
              key={lobby.id}
              className="rounded-lg border border-gray-200 p-4 shadow-sm"
            >
              <p className="text-sm text-gray-500">ID: {lobby.id}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
