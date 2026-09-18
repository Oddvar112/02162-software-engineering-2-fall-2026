import { NextResponse } from "next/server";
import { getMockGameState } from "@/lib/game/mock-game-state";

export function GET() {
  return NextResponse.json(getMockGameState(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
