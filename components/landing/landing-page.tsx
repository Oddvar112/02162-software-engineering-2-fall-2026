import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUp,
  ChevronsUp,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  Globe2,
  Layers3,
  MoveUpRight,
  Repeat2,
  Users,
  Zap,
} from "lucide-react";
import { RoboRallyLogo } from "@/components/brand/roborally-logo";
import styles from "./landing.module.css";

const commands = [
  { name: "Move 1", icon: ArrowUp },
  { name: "Turn right", icon: CornerUpRight },
  { name: "Move 2", icon: ChevronsUp },
  { name: "Turn left", icon: CornerUpLeft },
  { name: "Again", icon: Repeat2 },
];

export function LandingPage({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.header}>
        <Link
          href="/"
          className={styles.brand}
          aria-label="RoboRally Reimagined home"
        >
          <Image
            src="/brand/roborally-icon.png"
            width={44}
            height={44}
            alt=""
            priority
          />
          <span>
            ROBORALLY<small>REIMAGINED</small>
          </span>
        </Link>
        <nav aria-label="Main navigation" className={styles.nav}>
          <a href="#how-to-play">How it works</a>
          <a href="#join" className={styles.navJoin}>
            Join the race <ArrowRight size={15} aria-hidden="true" />
          </a>
          <Link href="/game" className={styles.navBoard}>
            Explore the board <MoveUpRight size={15} aria-hidden="true" />
          </Link>
        </nav>
      </header>

      <main id="main" className={styles.main}>
        <div className={styles.hero}>
          <section className={styles.intro} aria-labelledby="hero-title">
            <div className={styles.eyebrow}>
              <span /> THE CLASSIC ROBOT RACE. REWIRED.
            </div>
            <RoboRallyLogo className={styles.wordmark} />
            <h1 id="hero-title">
              Big plans.
              <br />
              Beautiful <span>chaos.</span>
            </h1>
            <p className={styles.description}>
              Program your robot. Outsmart your friends. Try not to roll into a
              laser. Your next great rivalry starts here.
            </p>
            <div className={styles.features}>
              <span>
                <Users size={15} aria-hidden="true" /> Play with friends
              </span>
              <span>
                <Globe2 size={15} aria-hidden="true" /> Right in your browser
              </span>
            </div>

            <div
              className={styles.program}
              aria-label="Example program: move one, turn right, move two, turn left, repeat"
            >
              <div className={styles.programCaption}>
                <span>FIVE MOVES. INFINITE POSSIBILITIES.</span>
                <span aria-hidden="true">01 — 05</span>
              </div>
              <div className={styles.commandCards} aria-hidden="true">
                {commands.map(({ name, icon: Icon }, i) => (
                  <div key={name} className={styles.commandCard}>
                    <span className={styles.commandNumber}>0{i + 1}</span>
                    <Icon strokeWidth={1.6} />
                    <span>{name}</span>
                  </div>
                ))}
                <div className={styles.programArrow}>
                  <ArrowRight size={20} />
                </div>
              </div>
            </div>
          </section>

          <section id="join" className={styles.join} aria-label="Join the race">
            <div className={styles.panel}>{children}</div>
            <p className={styles.panelFootnote}>
              <Zap size={13} aria-hidden="true" /> A little strategy. A lot of
              friendly sabotage.
            </p>
          </section>
        </div>

        <section
          id="how-to-play"
          className={styles.howTo}
          aria-labelledby="how-title"
        >
          <div className={styles.howHeading}>
            <h2 id="how-title">A good plan is just the beginning.</h2>
            <span>HERE&apos;S HOW IT ROLLS</span>
          </div>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepIcon}>
                <Layers3 size={20} aria-hidden="true" />
              </div>
              <div>
                <h3>
                  <span>01</span> Program your moves
                </h3>
                <p>Queue up five cards. Set your brilliant plan in motion.</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepIcon}>
                <Zap size={20} aria-hidden="true" />
              </div>
              <div>
                <h3>
                  <span>02</span> Embrace the mayhem
                </h3>
                <p>Conveyor belts, lasers, and other robots have plans, too.</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepIcon}>
                <Flag size={20} aria-hidden="true" />
              </div>
              <div>
                <h3>
                  <span>03</span> Race to the finish
                </h3>
                <p>Reach the checkpoints. Claim the bragging rights.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>RoboRally, reimagined for the browser.</span>
        <span>
          DTU <span aria-hidden="true">/</span> 02162{" "}
          <span aria-hidden="true">/</span> Group 7
        </span>
        <span className={styles.footerSignature}>
          BUILT FOR A LITTLE CHAOS <span aria-hidden="true">↗</span>
        </span>
      </footer>
    </div>
  );
}
