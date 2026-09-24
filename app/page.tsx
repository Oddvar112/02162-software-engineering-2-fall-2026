import { AuthButton } from "@/components/auth/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { Suspense } from "react";
import { CreateLobbyButton } from "@/components/lobbies/create-lobby-button";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-full flex-1 flex-col items-center">
        <nav className="flex h-16 w-full justify-center border-b border-b-foreground/10">
          <div className="flex w-full max-w-5xl items-center justify-between p-3 px-5 text-sm">
            <div className="flex items-center gap-5 font-semibold">
              <Link href={"/"}>RoboRally</Link>
            </div>
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <Suspense>
                <AuthButton />
              </Suspense>
            </div>
          </div>
        </nav>
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

          <Button asChild className="mt-3">
            <Link href="/game">Open 3D board prototype</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
