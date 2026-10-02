import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import roster from "@/lib/robots.json";

const MIGRATIONS = "supabase/migrations";

it("keeps the robots the database accepts equal to the roster the lobby shows", () => {
  const definition = readdirSync(MIGRATIONS)
    .sort()
    .map((file) => readFileSync(join(MIGRATIONS, file), "utf8"))
    .filter((sql) => sql.includes("function public.choose_robot"))
    .at(-1);
  const list = definition?.match(/p_model not in \(([^)]*)\)/)?.[1] ?? "";
  const accepted = [...list.matchAll(/'([^']+)'/g)].map(([, id]) => id);

  expect(
    accepted.sort(),
    "lib/robots.json changed: add a migration that redefines choose_robot with the same robots",
  ).toEqual(roster.map((robot) => robot.id).sort());
});
