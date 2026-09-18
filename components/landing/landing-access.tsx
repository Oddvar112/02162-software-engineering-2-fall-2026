import { Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { CreateLobbyButton } from "@/components/create-lobby-button";
import { LogoutButton } from "@/components/logout-button";
import { AuthPanel, type AuthMode } from "./auth-panel";
import styles from "./landing.module.css";

export async function LandingAccess({
  initialMode = "login",
}: {
  initialMode?: AuthMode;
}) {
  if (!hasEnvVars) return <AuthPanel initialMode={initialMode} />;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return <AuthPanel initialMode={initialMode} />;
  return (
    <div className={styles.signedIn}>
      <div className={styles.panelIcon}>
        <Flag size={24} aria-hidden="true" />
      </div>
      <p className={styles.panelEyebrow}>ALL SYSTEMS GO</p>
      <h2 className={styles.panelTitle}>You&apos;re on the grid.</h2>
      <p className={styles.panelDescription}>
        Gather your friends. A little friendly chaos is just a lobby away.
      </p>
      <p className={styles.accountEmail}>{data.claims.email}</p>
      <CreateLobbyButton className={styles.submit} />
      <LogoutButton />
    </div>
  );
}
