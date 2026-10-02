import Image from "next/image";
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
            className="flex items-center transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            <Image
              src="/images/logo.png"
              alt="RoboRally"
              width={166}
              height={44}
              priority
              className="h-10 sm:h-11 w-auto object-contain"
            />
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
