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
  if (!value || !value.startsWith("/")) return "/";

  const base = "https://return.invalid";
  try {
    const url = new URL(value, base);
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (url.origin !== base || path.startsWith("//")) return "/";
    return path;
  } catch {
    return "/";
  }
}
