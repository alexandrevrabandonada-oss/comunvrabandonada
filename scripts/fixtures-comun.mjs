import { assertLocalEnvironment } from "./local-environment.mjs";
import { assertNoComunTestFixtures, cleanupLocalComunFixtures, createLocalAuthFixtures, createLocalPautaMiniappFixture } from "../tests/fixtures/comun/local-fixtures.mjs";

assertLocalEnvironment();
const command = process.argv[2];
if (command === "prepare") { await cleanupLocalComunFixtures(); const users = await createLocalAuthFixtures(); const pauta = await createLocalPautaMiniappFixture(); console.log(`COMUN_FIXTURES_READY slug=${pauta.slug} personas=${Object.keys(users).length}`); }
else if (command === "cleanup") { await cleanupLocalComunFixtures(); await assertNoComunTestFixtures(); }
else if (command === "assert-clean") await assertNoComunTestFixtures();
else throw new Error("Use prepare, cleanup ou assert-clean.");
