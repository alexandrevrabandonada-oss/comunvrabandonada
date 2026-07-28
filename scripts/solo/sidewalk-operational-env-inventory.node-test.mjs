import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { tmpdir } from "node:os";
import {
  assertSanitizedOperationalEnvironmentInventory,
  createOperationalEnvironmentInventory,
  persistOperationalEnvironmentInventory,
} from "./sidewalk-operational-env-inventory.mjs";

const metadata = {
  envs: [
    { key: "COMUN_SIDEWALK_OPERATIONAL_V2", target: ["production"] },
    {
      key: "COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL",
      target: ["production"],
    },
    { key: "NEXT_PUBLIC_SUPABASE_URL", target: ["production", "preview"] },
    { key: "SUPABASE_SERVICE_ROLE_KEY", target: ["production"] },
  ],
};

test("operational environment inventory retains only key presence and production targets", () => {
  assert.deepEqual(createOperationalEnvironmentInventory(metadata), {
    flagKeyPresent: true,
    flagTargetsProduction: true,
    databaseUrlKeyPresent: true,
    databaseUrlTargetsProduction: true,
    publicSupabaseUrlPresent: true,
    serviceRoleKeyPresent: true,
  });
});

test("inventory distinguishes an absent key from a preview-only database URL", () => {
  const previewOnly = createOperationalEnvironmentInventory({
    envs: [
      { key: "COMUN_SIDEWALK_OPERATIONAL_V2", target: ["production"] },
      {
        key: "COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL",
        target: ["preview"],
      },
    ],
  });
  assert.equal(previewOnly.flagKeyPresent, true);
  assert.equal(previewOnly.databaseUrlKeyPresent, true);
  assert.equal(previewOnly.databaseUrlTargetsProduction, false);
  assert.equal(previewOnly.publicSupabaseUrlPresent, false);
  assert.equal(previewOnly.serviceRoleKeyPresent, false);
});

test("inventory fails closed when Vercel metadata contains a value field", () => {
  assert.throws(
    () =>
      createOperationalEnvironmentInventory({
        envs: [
          {
            key: "COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL",
            target: ["production"],
            value: "never-allowed",
          },
        ],
      }),
    /ENV_VALUE_CAPTURED/,
  );
});

test("inventory artifact has exactly the allowed booleans and no secret-shaped value", () => {
  const inventory = createOperationalEnvironmentInventory(metadata);
  assert.deepEqual(
    assertSanitizedOperationalEnvironmentInventory(inventory),
    inventory,
  );
  assert.throws(
    () =>
      assertSanitizedOperationalEnvironmentInventory({
        ...inventory,
        url: "postgresql://never-allowed",
      }),
    /ENV_INVENTORY_INVALID/,
  );
});

test("inventory persistence creates its parent directory and writes only sanitized JSON", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "comun-operational-env-"),
  );
  const output = path.join(directory, ".ci-artifacts", "inventory.json");
  const inventory = createOperationalEnvironmentInventory(metadata);
  await persistOperationalEnvironmentInventory(output, inventory);
  assert.deepEqual(JSON.parse(await readFile(output, "utf8")), inventory);
  assert.match(await readFile(output, "utf8"), /\n$/);
});
