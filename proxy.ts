import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots/lineup.html (public robot gallery)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * - .glb (public 3D models used by the public board)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots/lineup\\.html$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb)$).*)",
  ],
};
