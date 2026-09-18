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
  includeIgnoreFile(resolve(__dirname, ".gitignore")),
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  eslintConfigPrettier,
];

export default eslintConfig;
