export function isPublicRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/game" ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/")
  );
}

export function isAuthEntryRoute(pathname: string): boolean {
  return pathname === "/auth/login" || pathname === "/auth/sign-up";
}

export function safeReturnPath(value: string | null | undefined): string {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.includes("\\")) return "/";
  return value;
}
