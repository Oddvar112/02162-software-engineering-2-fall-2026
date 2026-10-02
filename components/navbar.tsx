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
            className="flex items-center transition-opacity hover:opacity-90"
          >
            <image href="../public/logo/RoboRallyLogo.png"/>
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
