import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DemoServiceError,
  getGameDemoStatus,
  setGameDemoBoard,
  startDemoLobby,
} from "@/demo/server/demo-service";

const headers = { "Cache-Control": "no-store, max-age=0" };

function failure(error: unknown) {
  if (error instanceof DemoServiceError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers },
    );
  }
  console.error("Demo API error:", error);
  const message =
    error instanceof Error ? error.message : "Could not update demo mode settings.";
  return NextResponse.json(
    { error: message },
    { status: 500, headers },
  );
}

async function currentUserId(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== "string") {
    throw new DemoServiceError("Sign in to access demo settings.", 401);
  }
  return userId;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await params;
    await currentUserId();
    const status = await getGameDemoStatus(gameId);
    return NextResponse.json(status, { headers });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await params;
    const userId = await currentUserId();

    let body: { action?: unknown; enabled?: unknown; mapId?: unknown };
    try {
      body = await request.json();
    } catch {
      throw new DemoServiceError("Invalid JSON body.", 400);
    }

    if (body.action === "start-game") {
      const result = await startDemoLobby(gameId, userId);
      return NextResponse.json(result, { headers });
    }

    if (typeof body.enabled !== "boolean") {
      throw new DemoServiceError("Field 'enabled' must be a boolean.", 400);
    }

    const mapId = typeof body.mapId === "string" ? body.mapId : undefined;
    const result = await setGameDemoBoard(gameId, userId, body.enabled, mapId);

    return NextResponse.json(result, { headers });
  } catch (error) {
    return failure(error);
  }
}
