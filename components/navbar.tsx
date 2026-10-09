import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function Navbar() {
  return (
    <nav className="relative z-20 flex h-16 w-full items-center border-b border-b-border bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
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
              className="h-10 w-auto object-contain sm:h-11"
            />
          </Link>
        </div>
          <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </div>
    </nav>
  );
}
