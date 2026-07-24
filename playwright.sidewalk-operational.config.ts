import base from "./playwright.sidewalk-real-map.config";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  ...base,
  testDir: "./tests/sidewalk-operational",
});
