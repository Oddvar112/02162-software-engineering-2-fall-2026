import Link from "next/link";
import { CreateLobbyButton } from "@/components/lobbies/create-lobby-button";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center">
      <div className="flex w-full flex-1 flex-col items-center">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
          <h1 className="text-4xl font-bold tracking-tight">RoboRally</h1>
          <p className="text-lg text-foreground/70">
            02162 Software Engineering 2 - Gruppe 7
          </p>
          <p className="text-sm text-foreground/50">In the making</p>
          <div className="flex flex-row gap-4">
            <CreateLobbyButton />
            <Button asChild>
              <Link href={"/lobbies"}>Join Lobby</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
