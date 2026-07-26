import base from "./playwright.sidewalk-real-map.config";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  ...base,
  testDir: "./tests/sidewalk-operational",
  projects: [
    { name: "mobile", use: { viewport: { width: 412, height: 915 } } },
    { name: "desktop", use: { viewport: { width: 1366, height: 900 } } },
  ],
});
