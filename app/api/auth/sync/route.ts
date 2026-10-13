import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const headers = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "User is not authenticated." },
        { status: 401, headers },
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY is not set." },
        { status: 500, headers },
      );
    }

    const service = createServiceClient();
    const displayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      (user.email ? user.email.split("@")[0] : "Player");

    const { error: upsertError } = await service.from("users").upsert(
      {
        id: user.id,
        display_name: displayName,
      },
      { onConflict: "id" },
    );

    if (upsertError) throw upsertError;

    return NextResponse.json(
      { ok: true, user: { id: user.id, displayName } },
      { headers },
    );
  } catch (error) {
    console.error("Failed to sync user profile:", error);
    return NextResponse.json(
      { error: "Could not synchronize user profile." },
      { status: 500, headers },
    );
  }
}
