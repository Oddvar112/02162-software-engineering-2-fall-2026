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
            className="text-2xl sm:text-3xl font-black tracking-wider uppercase bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 bg-clip-text text-transparent hover:opacity-90 transition-opacity drop-shadow-sm"
          >
            RoboRally
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Suspense>
            <AuthButton />
          </Suspense>
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  );
}
