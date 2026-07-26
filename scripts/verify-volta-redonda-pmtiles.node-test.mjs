import assert from "node:assert/strict";
import test from "node:test";
import {
  validateVoltaRedondaPmtiles,
  VOLTA_REDONDA_PMTILES_SHA256,
} from "./verify-volta-redonda-pmtiles.mjs";

test("o PMTiles canônico de Volta Redonda está versionado, íntegro e em v3", async () => {
  const result = await validateVoltaRedondaPmtiles();

  assert.equal(result.sha256, VOLTA_REDONDA_PMTILES_SHA256);
  assert.equal(result.pmtilesVersion, 3);
  assert.ok(result.sizeBytes > 0);
  assert.equal(result.manifest, "public/maps/volta-redonda/manifest.json");
});
