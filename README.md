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
│   ├── game/                         # 3D board standalone prototype route
│   ├── games/[gameId]/               # Active in-game view for a specific match
│   └── lobbies/                      # Lobby browsing & individual lobby room pages ([lobbyId])
│
├── assets/                           # Raw source assets & asset pipeline tools
│   └── robots/crew/                  # Blender source files (.blend), rigging scripts, and generator tooling
│
├── components/                       # Reusable React components organized by domain
│   ├── auth/                         # Authentication UI (login forms, signup forms, auth/logout buttons)
│   ├── game/                         # In-game interactive components
│   │   └── board/                    # 3D Three.js / Canvas board renderer & robot model components
│   ├── lobbies/                      # Lobby management UI (create, list, and join lobby buttons/views)
│   ├── ui/                           # Base UI primitive design system (shadcn/radix buttons, cards, dialogs, inputs)
│   └── theme-switcher.tsx            # Light/Dark mode toggling component
│
├── lib/                              # Core business logic, utilities, and helper libraries
│   ├── game/                         # Game state and programming logic
│   │   └── game-model.ts             # Static demo board layout and robot start positions
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

## Programming phase demo

Static board generation is configured in `lib/game/game-model.ts`. Its
`staticBoard` export is the single source for the demo layout. To change the
board, edit its dimensions, row-major tile grid (`tiles[y][x]`), wall pairs,
and `startpositions` in that file. Keep `width` and `height` consistent with
the tile grid.

`lib/game/mock-game-state.ts` builds the initial game state from this model,
creating one demo player and robot per start position. The current 4×4 board
therefore has two players. The renderer and movement logic consume that same
board data. Changing the model resets the shared demo on its next request,
including during hot reload.

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
