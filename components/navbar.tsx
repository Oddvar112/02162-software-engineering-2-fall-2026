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
            className="text-2xl sm:text-3xl font-extrabold tracking-tight select-none hover:opacity-90 transition-opacity"
            style={{
              WebkitTextStroke: "1.5px #000",
              paintOrder: "stroke fill",
              textShadow:
                "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 2px 4px rgba(0, 0, 0, 0.4)",
            }}
          >
            <span className="text-white">Robo</span>
            <span className="text-orange-500">Rally</span>
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
