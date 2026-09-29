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
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

The first two are in the group chat, and also behind the **Connect** button in the Supabase dashboard. They are not secrets — the publishable key is sent to every browser that loads the app. Row Level Security is what protects the data, not the key.

The third one **is a secret**. It lets the server write game state that no player is allowed to write, such as robot positions after a round resolves. Find it in the Supabase dashboard under **Settings → API Keys → Secret keys**, the row named `default`. Click the eye icon to reveal it or the copy icon next to it. It starts with `sb_secret_`.
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

## Deployment secrets

The service role key has to be set in every place the app runs. It is read at runtime, so it is not baked into the build.

**Vercel:** Project → **Settings → Environment Variables** → add `SUPABASE_SERVICE_ROLE_KEY` for Production and Preview. Redeploy after adding it, because running deployments do not pick up new variables.

**DTU server:** the deploy job in `.github/workflows/ci.yml` passes it to `docker compose` from a GitHub secret. Add it once under the repository's **Settings → Secrets and variables → Actions → Secrets → New repository secret**, named `SUPABASE_SERVICE_ROLE_KEY`. The next push to `main` deploys with it. Note the difference from the two public values, which live under **Variables** on the same page.

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

For database changes, start Docker and run the local pgTAP suite too:

```bash
npx supabase db start
npm run test:db
```

On its first start, the local database applies all migrations. If it is already
running, apply new migrations with `npx supabase migration up --local` before
testing. The tests use a transaction and roll back their fixtures. CI runs them
against a fresh local database; these commands do not change the shared project.

If you added a dependency, commit `package-lock.json` with it. CI installs with `npm ci`, which fails when the lockfile is missing or out of sync.

## Project structure

```
├── app/                              # Next.js App Router (pages, routes, and layouts)
│   ├── auth/                         # Authentication flow pages & API endpoints (login, sign-up, confirm, password reset)
│   ├── api/games/[gameId]/           # Game state route: reads, locks in, resolves and advances rounds
│   ├── games/[gameId]/               # Active in-game view for a specific match
│   └── lobbies/                      # Lobby browsing & individual lobby room pages ([lobbyId])
│
├── assets/                           # Raw source assets & asset pipeline tools
│   └── robots/crew/                  # Blender source files (.blend), rigging scripts, and generator tooling
│
├── components/                       # Reusable React components organized by domain
│   ├── auth/                         # Authentication UI (login forms, signup forms, auth/logout buttons)
│   ├── game/                         # Game screen, program editor and playback
│   │   └── board/                    # 3D Three.js / Canvas board renderer & robot model components
│   ├── lobbies/                      # Lobby management UI (create, list, and join lobby buttons/views)
│   ├── ui/                           # Base UI primitive design system (shadcn/radix buttons, cards, dialogs, inputs)
│   └── theme-switcher.tsx            # Light/Dark mode toggling component
│
├── lib/                              # Core business logic, utilities, and helper libraries
│   ├── game/                         # Game state and programming logic
│   │   └── game-model.ts             # Static demo board layout and robot start positions
│   ├── game/                         # Rules engine, deck, board model and database store
│   ├── hooks/                        # Custom client React hooks (e.g. motion/accessibility preferences)
│   ├── supabase/                     # Supabase client configurations (browser, server, and middleware proxy)
│   ├── robot-animation.ts            # Three.js animation controller for robot character models
│   ├── robots.json                   # Robot character specifications and metadata
│   ├── routes.ts                     # Route access helpers and route protection rules
│   └── utils.ts                      # General utilities (tailwind class merging)
│
├── public/                           # Static assets served directly by the web server
│   ├── models/robots/                # Compiled 3D robot models (.glb) and character manifests
│   └── robots/previews/              # Rendered robot character 2D preview images
│
└── supabase/                         # Supabase local environment & database configuration
    ├── migrations/                   # SQL migration scripts (tables, RLS policies, RPC functions)
    └── tests/                        # Database logic & lifecycle pgTAP tests
```

## Playing a game

A game starts from a lobby. The host presses **Start game** once at least two players have joined, and everyone in the lobby is taken to `/games/<id>` through Realtime.

Each round works like this:

1. Every player holds nine cards. Pick five in the order they should run and press **Lock In**. The first lock in starts a 30 second timer.
2. The round resolves when everyone has locked in, or when the timer runs out. A player who did not finish gets five random cards from their hand.
3. The server runs every program register by register in card priority order, then records the movement frames. Each client animates them. **Replay movement** plays the sequence again.
4. Press **Ready for next round**. The next round starts when every living player is ready.

The first robot to reach the last checkpoint wins. A robot that falls off the board or into a pit loses a life and reboots near where it started the round; at zero lives it is out.

The board comes from `staticBoard` in `lib/game/game-model.ts`. The rules live in `lib/game/engine.ts`, the deck in `lib/game/deck.ts`, and the database side in `lib/game/store.ts`. Hands are readable only by their owner, and programs only by their owner until the round resolves. The pgTAP suite in `supabase/tests/game_state_test.sql` proves both.
