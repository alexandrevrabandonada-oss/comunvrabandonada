import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    files: ["app/comun/admin/calcadas/operacao/page.tsx"],
    rules: {
      // Server Component dinâmico: a idade da fila é calculada uma vez por requisição.
      "react-hooks/purity": "off",
    },
  },
  globalIgnores([
    ".next*/**",
    "node_modules/**",
    "backups/**",
    "coverage/**",
    "types/supabase.ts",
  ]),
]);
