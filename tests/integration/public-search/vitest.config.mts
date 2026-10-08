import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("../../../", import.meta.url)) },
  },
  test: {
    include: ["tests/integration/public-search/*.integration.ts"],
    fileParallelism: false,
  },
});
