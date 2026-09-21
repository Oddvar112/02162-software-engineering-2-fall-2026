import { NextResponse } from "next/server";
import {
  createMockGame,
  getPlayerSnapshot,
  ProgramError,
  startNextRound,
  submitProgram,
  type MockGame,
} from "@/lib/game/programming";

// One shared demo game per server process; survives development hot reloads.
// Replace this store and demo identity with the lobby backend when it is available.
const demo = globalThis as typeof globalThis & { roboRallySoloDemo?: MockGame };
function game() {
  return (demo.roboRallySoloDemo ??= createMockGame());
}
const headers = { "Cache-Control": "no-store, max-age=0" };

function failure(error: unknown) {
  if (error instanceof ProgramError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers },
    );
  return NextResponse.json(
    { error: "The game could not be updated. Please try again." },
    { status: 500, headers },
  );
}

export function GET(request: Request) {
  try {
    const playerId =
      new URL(request.url).searchParams.get("player") ?? "player-1";
    return NextResponse.json(getPlayerSnapshot(game(), playerId), { headers });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      throw new ProgramError("The program request is not valid JSON.");
    }
    if (!body || typeof body !== "object" || typeof body.playerId !== "string")
      throw new ProgramError("Choose a player before submitting a program.");
    const currentGame = game();
    if (body.action === "next-round")
      startNextRound(currentGame, body.playerId, body.round);
    else if (body.action === "lock-in")
      submitProgram(currentGame, body.playerId, body.round, body.cardIds);
    else throw new ProgramError("Unknown game action.");
    return NextResponse.json(getPlayerSnapshot(currentGame, body.playerId), {
      headers,
    });
  } catch (error) {
    return failure(error);
  }
}
