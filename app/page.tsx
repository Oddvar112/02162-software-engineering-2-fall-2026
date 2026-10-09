import Image from "next/image";
import Link from "next/link";
import { ArrowRight, RadioTower } from "lucide-react";
import { CreateLobbyButton } from "@/components/lobbies/create-lobby-button";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="rr-page flex items-center">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rr-reveal max-w-2xl">
          <p className="rr-kicker mb-5 flex items-center gap-2">
            <RadioTower size={15} aria-hidden="true" /> Factory floor online
          </p>
          <h1 className="max-w-xl text-5xl font-black uppercase leading-[0.9] text-foreground sm:text-7xl">
            Program. Push. <span className="text-primary">Race.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
            Lock in a sequence of command cards, trigger the machinery, and be
            the first robot through the checkpoints.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CreateLobbyButton />
            <Button asChild variant="outline">
              <Link href="/lobbies">
                Browse lobbies <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <p className="mt-8 font-mono text-xs uppercase text-muted-foreground">
            02162 Software Engineering 2 / Group 7
          </p>
        </section>
        <section className="rr-panel rr-reveal relative isolate min-h-[380px] overflow-hidden p-6 [animation-delay:120ms] sm:min-h-[460px]">
          <div className="rr-caution absolute inset-x-0 top-0 h-3" />
          <p className="rr-panel-title">Unit BOLT / ready for deployment</p>
          <Image
            src="/robots/previews/bolt.png"
            alt="Bolt robot character"
            width={620}
            height={620}
            priority
            className="absolute bottom-[-1.5rem] left-1/2 w-[min(82%,420px)] -translate-x-1/2 drop-shadow-[0_30px_22px_hsl(216_31%_4%/0.65)]"
          />
          <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between border-t border-border pt-4 font-mono text-xs uppercase text-muted-foreground">
            <span>Model: Bolt</span>
            <span className="text-primary">Systems nominal</span>
          </div>
        </section>
      </div>
    </main>
  );
}
