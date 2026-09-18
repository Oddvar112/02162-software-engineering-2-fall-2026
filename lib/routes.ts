export function isPublicRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/game" ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/")
  );
}
