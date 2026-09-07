import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import { includeIgnoreFile } from "@eslint/compat";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Gjenbruker .gitignore som ignore-liste, så ESLint slipper å lint-e
  // byggeoutput (.next/, out/, build/) og node_modules. Ingen egen liste
  // å holde i sync: er fila ikke i git, er den heller ikke vår kode.
  includeIgnoreFile(resolve(__dirname, ".gitignore")),
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Må stå sist: skrur av ESLint-regler som ellers krangler med Prettier.
  eslintConfigPrettier,
];

export default eslintConfig;
