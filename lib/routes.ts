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
    if (url.origin !== base) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
