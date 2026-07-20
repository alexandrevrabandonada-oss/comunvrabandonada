import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { assertLocalEnvironment } from "../../scripts/local-environment.mjs";
import { cleanupLocalComunFixtures } from "../fixtures/comun/local-fixtures.mjs";
import setupSidewalk from "../sidewalk-pilot/global-setup.mjs";
export default async function setup(){process.env.ALLOW_LOCAL_TESTS="true";process.env.COMUN_BASE_URL??="http://127.0.0.1:3000";assertLocalEnvironment();await cleanupLocalComunFixtures();await setupSidewalk();await mkdir(".local/comun-integral",{recursive:true});const svg='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#aaa"/><path d="M0 420L800 180" stroke="#222" stroke-width="80"/><rect x="80" y="500" width="640" height="14" fill="#ffd400"/></svg>';await sharp(Buffer.from(svg)).jpeg({quality:84}).toFile(".local/comun-integral/calcada-fixture.jpg")}
