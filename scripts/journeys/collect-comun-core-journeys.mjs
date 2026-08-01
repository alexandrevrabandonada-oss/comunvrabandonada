import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import {
  coreJourneys,
  intermediateRoutes,
  journeyMetrics,
} from "./catalog.mjs";

const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const payload = {
  schema: "comun.core-journeys.evidence.v1",
  collectedAt: new Date().toISOString(),
  commit,
  journeys: coreJourneys.length,
  intermediateRoutes: intermediateRoutes.length,
  metrics: journeyMetrics(),
  containsPrivateFixtures: false,
  containsScreenshots: false,
  containsSessions: false,
  humanResult: null,
};
await mkdir("reports/current", { recursive: true });
await writeFile(
  "reports/current/comun-core-journeys-evidence.json",
  `${JSON.stringify(payload, null, 2)}\n`,
);
console.log(
  JSON.stringify({
    ok: true,
    output: "reports/current/comun-core-journeys-evidence.json",
  }),
);
