import { Suspense } from "react";
import { LandingPage } from "@/components/landing/landing-page";
import { LandingAccess } from "@/components/landing/landing-access";
import styles from "@/components/landing/landing.module.css";

export default function Home() {
  return (
    <LandingPage>
      <Suspense
        fallback={
          <div className={styles.loadingPanel} role="status">
            Getting the starting line ready…
          </div>
        }
      >
        <LandingAccess />
      </Suspense>
    </LandingPage>
  );
}
