"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { User, LogOut } from "lucide-react";
import { useState } from "react";

export function LogoutButton({
  email,
  className,
}: {
  email?: string;
  className?: string;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const title = email ? `Log out (${email})` : "Log out";

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={logout}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      aria-label={title}
      className={`relative h-9 w-9 rounded-full border border-foreground/20 bg-muted/40 transition-all hover:border-destructive/40 hover:bg-destructive/15 hover:text-destructive ${className ?? ""}`}
    >
      {hovered ? (
        <LogOut className="h-4 w-4 text-destructive duration-150 animate-in fade-in zoom-in-75" />
      ) : (
        <User className="h-4 w-4" />
      )}
    </Button>
  );
}
