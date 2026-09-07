import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-full flex-1 flex-col items-center">
        <nav className="flex h-16 w-full justify-center border-b border-b-foreground/10">
          <div className="flex w-full max-w-5xl items-center justify-between p-3 px-5 text-sm">
            <div className="flex items-center gap-5 font-semibold">
              <Link href={"/"}>RoboRally</Link>
            </div>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
          <h1 className="text-4xl font-bold tracking-tight">RoboRally</h1>
          <p className="text-lg text-foreground/70">
            02162 Software Engineering 2 - Gruppe 7
          </p>
          <p className="text-sm text-foreground/50">In the making</p>
        </div>
      </div>
    </main>
  );
}
