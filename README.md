# RoboRally

Online RoboRally for 02162 Software Engineering 2, autumn 2026.

Next.js (App Router) with Supabase for database and authentication.

## Prerequisites

- Node.js 22 or later
- A Supabase account, added to the group organisation — ask in the group chat if you have not been invited

## Getting started

```bash
git clone https://github.com/Oddvar112/02162-software-engineering-2-fall-2026.git
cd 02162-software-engineering-2-fall-2026
npm install
```

Copy the env template and fill it in:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://vqziuybaesqlowlxoelm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Both values are in the group chat, and also behind the **Connect** button in the Supabase dashboard. They are not secrets — the publishable key is sent to every browser that loads the app. Row Level Security is what protects the data, not the key.

Then:

```bash
npm run dev
```

The app runs on http://localhost:3000. Sign up a user to check that the connection works — the user should appear under Authentication in the Supabase dashboard.

## Supabase CLI

The CLI is installed as a dev dependency, so run it through `npx`.

**Each member has to do this once on their own machine:**

```bash
npx supabase login
npx supabase link --project-ref vqziuybaesqlowlxoelm
```

`login` opens a browser and stores an access token under your user profile, not in the repo. `link` connects your local `supabase/` folder to the shared project and asks for the database password

Cloning the repo is not enough. Without these two commands you cannot push migrations.

## Database changes

**Do not create or alter tables in the Supabase dashboard.** Every schema change goes through a migration file in git, or the rest of the group has no idea what changed.

```bash
npx supabase migration new add_player_color
```

Write the SQL in the file that appears under `supabase/migrations/`, then:

```bash
npx supabase db push
```

Commit the migration file with the rest of your change.

Never edit a migration that has already been pushed. Supabase tracks which ones have run by their timestamp, so edits to an old file are silently skipped — the repo and the database drift apart and nobody notices until something breaks. Make a new migration instead.

## Branching

`main` is protected. Work on a branch and open a pull request:

CI has to pass before the pull request can be merged.

## Before you push

Run the same checks CI does:

```bash
npm run format
npm run lint
npm test
npm run build
```

CI runs `format:check`, which only reports. Run `format` locally so it fixes the formatting instead.

If you added a dependency, commit `package-lock.json` with it. CI installs with `npm ci`, which fails when the lockfile is missing or out of sync.

## Project structure

```
app/              routes and pages (App Router)
components/       UI components
lib/supabase/     Supabase clients for browser and server
supabase/         config and migrations
```

## Programming phase demo

Open `/game` and click five cards in execution order, then **Lock In**. Each
selected card shows its position in the program. Click it again to remove it
and renumber the remaining cards; select it again to place it at the end.
You can remove or replace cards until you submit. The player
menu includes a **Demo player** switcher. For now, **Lock In** immediately
executes only the selected player's five cards in order, without waiting for
other players. Other robots do not run programs, but can still be pushed by
movement. Every tab receives the updated board through polling. The execution
list shows what ran. The board animates each movement step and rotation, and
highlights the card being executed. **Replay movement** plays the stored sequence
again without resubmitting. **Start next round** clears the program for another turn.

This builds on the mock game, not authenticated multiplayer: the server holds
one shared game in memory, and the `player` query parameter selects a demo seat.
Locked programs survive page reloads but reset when the server process restarts;
separate server instances do not share state. The same six-card hands are reused
between rounds. Movement, rotation, backing up, walls, robot pushing, falling,
rebooting and ordered checkpoints are supported. Conveyors, gears, lasers,
damage-based register locking and victory rules await the full game engine.
Do not use the demo player selector as an authorization mechanism.
