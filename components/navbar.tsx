import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function Navbar() {
  return (
    <nav className="flex h-16 w-full items-center border-b border-b-foreground/10 px-4 sm:px-6 lg:px-8">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-5">
          <Link
            href="/"
            className="group flex items-center transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center rounded-lg bg-neutral-950 px-3.5 py-1.5 border border-neutral-800 shadow-sm text-xl sm:text-2xl font-bold tracking-tight">
              <span className="text-white">Robo</span>
              <span className="text-orange-500">Rally</span>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </div>
    </nav>
  );
}
