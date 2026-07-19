import { rm } from "node:fs/promises";
import { assertNoComunTestFixtures, cleanupLocalComunFixtures } from "../fixtures/comun/local-fixtures.mjs";

export default async function teardownIntegralExperience() {
  process.env.ALLOW_LOCAL_TESTS = "true";
  process.env.COMUN_BASE_URL ??= "http://127.0.0.1:3000";
  await cleanupLocalComunFixtures();
  await assertNoComunTestFixtures();
  await rm(".local/comun-integral", { recursive: true, force: true });
}
