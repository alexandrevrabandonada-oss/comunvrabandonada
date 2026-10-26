import { readFile, writeFile, open, access } from "node:fs/promises";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { validateSource, probePlan } from "./preflight-recovery-source.mjs";
import {
  canonicalRoleCatalog,
  roleCatalogDigest,
} from "./recovery-role-contract.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const certificate = fileURLToPath(
  new URL("./supabase-prod-ca-2021.crt", import.meta.url),
);
const query = (
  await readFile(
    new URL("./recovery-role-catalog.sql", import.meta.url),
    "utf8",
  )
).replace(/\r\n/g, "\n");
const queryDigest =
  "6125bc1fd8cc920c2fefee6d4a552f8f2b26bda95a7d369963041181024f3007";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fail = () => {
  throw new Error("COMUN_ROLE_CATALOG_OPERATION_REJECTED");
};
const localHosts = [
  "npipe:////./pipe/dockerDesktopLinuxEngine",
  "unix:///var/run/docker.sock",
];

export function roleCatalogReadPlan(password) {
  if (hash(query) !== queryDigest) fail();
  const plan = probePlan(password, certificate);
  if (plan.args.at(-2) !== "-c") fail();
  plan.args[plan.args.length - 1] =
    `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL statement_timeout='20s'; SET LOCAL search_path=pg_catalog; ${query} ROLLBACK;`;
  plan.options.maxBuffer = 1024 * 1024;
  return plan;
}
export function parseRoleCaptureArguments(argv) {
  const mode = argv[0];
  const fields =
    mode === "capture"
      ? ["config", "age", "age-sha256", "recipient", "output", "receipt"]
      : mode === "verify"
        ? ["age", "age-sha256", "identity", "input", "cipher-sha256"]
        : null;
  if (!fields || argv.length !== 1 + fields.length * 2) fail();
  const values = { mode };
  for (let i = 1; i < argv.length; i += 2) {
    const key = argv[i].slice(2);
    if (
      argv[i] !== `--${key}` ||
      !fields.includes(key) ||
      Object.hasOwn(values, key) ||
      !argv[i + 1]
    )
      fail();
    values[key] = argv[i + 1];
  }
  for (const field of fields.filter(
    (key) => !["age-sha256", "cipher-sha256", "recipient"].includes(key),
  ))
    if (!path.isAbsolute(values[field])) fail();
  return values;
}
async function verifyAge(binary, digest) {
  if (
    !path.isAbsolute(binary) ||
    !/^[a-f0-9]{64}$/.test(digest) ||
    hash(await readFile(binary)) !== digest
  )
    fail();
  const result = spawnSync(binary, ["--version"], {
    encoding: "utf8",
    timeout: 10000,
    windowsHide: true,
  });
  if (result.status !== 0 || result.stdout.trim() !== "v1.3.2") fail();
}
async function absent(file) {
  try {
    await access(file);
    fail();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
function dockerResult(args) {
  return spawnSync("docker", args, {
    encoding: "utf8",
    timeout: 10000,
    windowsHide: true,
    maxBuffer: 128 * 1024,
  });
}
function cleanupClient(name) {
  const names = () => {
    const r = dockerResult([
      "ps",
      "-a",
      "--filter",
      `name=^/${name}$`,
      "--format",
      "{{.Names}}",
    ]);
    if (r.status !== 0) fail();
    return r.stdout.trim();
  };
  if (!names()) return true;
  const record = dockerResult(["inspect", name]);
  if (record.status !== 0) fail();
  const value = JSON.parse(record.stdout)[0];
  if (value.Config.Labels["comun.recovery.owner"] !== name) fail();
  if (dockerResult(["rm", "--force", name]).status !== 0) fail();
  if (names()) fail();
  return true;
}

export async function captureRoleCatalog(options) {
  let clientAttempted = false,
    cleanupVerified = false;
  const client = `comun-role-read-${randomUUID()}`;
  const intent = `${options.receipt}.intent.json`;
  try {
    if (
      !options.output.endsWith(".age") ||
      options.output === options.receipt ||
      !/^age1[0-9a-z]{58}$/.test(options.recipient)
    )
      fail();
    await absent(options.output);
    await absent(options.receipt);
    await absent(intent);
    await verifyAge(options.age, options["age-sha256"]);
    if (
      hash(await readFile(certificate)) !==
      "700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7"
    )
      fail();
    const sources = [
      "scripts/security/capture-recovery-role-catalog.mjs",
      "scripts/security/recovery-role-catalog.sql",
      "scripts/security/recovery-role-contract.mjs",
      "scripts/security/preflight-recovery-source.mjs",
    ];
    execFileSync("git", ["ls-files", "--error-unmatch", "--", ...sources], {
      cwd: root,
      stdio: "ignore",
      windowsHide: true,
    });
    execFileSync("git", ["diff", "--exit-code", "HEAD", "--", ...sources], {
      cwd: root,
      stdio: "ignore",
      windowsHide: true,
    });
    const sha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    }).trim();
    const { password } = validateSource(await readFile(options.config, "utf8"));
    if (
      process.env.DOCKER_HOST &&
      !localHosts.includes(process.env.DOCKER_HOST)
    )
      fail();
    const context = dockerResult(["context", "inspect"]);
    if (
      context.status !== 0 ||
      !localHosts.includes(JSON.parse(context.stdout)[0].Endpoints.docker.Host)
    )
      fail();
    await writeFile(
      intent,
      JSON.stringify({
        kind: "READONLY_ROLE_METADATA_INTENT",
        sha,
        querySha256: queryDigest,
        client,
        utc: new Date().toISOString(),
        roleWrites: false,
        credentialExport: false,
      }),
      { flag: "wx", mode: 0o600 },
    );
    const plan = roleCatalogReadPlan(password);
    plan.args.splice(
      1,
      0,
      "--name",
      client,
      "--label",
      `comun.recovery.owner=${client}`,
      "--tmpfs",
      "/var/lib/postgresql/data:rw,noexec,nosuid,size=1m",
    );
    clientAttempted = true;
    const source = spawnSync(plan.binary, plan.args, plan.options);
    if (source.error || source.status !== 0) fail();
    const catalog = canonicalRoleCatalog(JSON.parse(source.stdout));
    cleanupVerified = cleanupClient(client);
    const plain = Buffer.from(JSON.stringify(catalog));
    const sealed = spawnSync(
      options.age,
      ["--encrypt", "--recipient", options.recipient],
      {
        input: plain,
        stdio: ["pipe", "pipe", "ignore"],
        maxBuffer: 2 * 1024 * 1024,
        timeout: 30000,
        windowsHide: true,
      },
    );
    if (sealed.error || sealed.status !== 0 || !sealed.stdout?.length) fail();
    const file = await open(options.output, "wx", 0o600);
    try {
      await file.writeFile(sealed.stdout);
    } finally {
      await file.close();
    }
    const receipt = {
      kind: "ENCRYPTED_ROLE_METADATA_NOT_ROLE_RESTORE",
      sha,
      querySha256: queryDigest,
      observedAt: new Date().toISOString(),
      roleCount: catalog.roles.length,
      membershipCount: catalog.memberships.length,
      catalogDigest: roleCatalogDigest(catalog),
      cipherSha256: hash(sealed.stdout),
      cipherBytes: sealed.stdout.length,
      transactionReadOnly: true,
      clientTls: "verify-full_pinned_CA_client_to_pooler",
      credentialsExported: false,
      gucValuesExported: false,
      authAccountsRead: false,
      roleWrites: false,
      plaintextPersisted: false,
      cleanupVerified,
      offsiteVerified: false,
      recoveryComplete: false,
    };
    await writeFile(options.receipt, JSON.stringify(receipt, null, 2), {
      flag: "wx",
      mode: 0o600,
    });
    return receipt;
  } finally {
    if (clientAttempted && !cleanupVerified) cleanupClient(client);
  }
}
export async function verifyRoleCatalogCipher(options) {
  await verifyAge(options.age, options["age-sha256"]);
  const cipher = await readFile(options.input);
  if (
    !/^[a-f0-9]{64}$/.test(options["cipher-sha256"]) ||
    hash(cipher) !== options["cipher-sha256"]
  )
    fail();
  const decrypted = spawnSync(
    options.age,
    ["--decrypt", "--identity", options.identity],
    {
      input: cipher,
      stdio: ["pipe", "pipe", "ignore"],
      maxBuffer: 1024 * 1024,
      timeout: 30000,
      windowsHide: true,
    },
  );
  if (decrypted.error || decrypted.status !== 0) fail();
  const catalog = canonicalRoleCatalog(
    JSON.parse(decrypted.stdout.toString("utf8")),
  );
  return {
    kind: "ROLE_METADATA_CIPHER_INTEGRITY_NOT_ROLE_RESTORE",
    roleCount: catalog.roles.length,
    membershipCount: catalog.memberships.length,
    catalogDigest: roleCatalogDigest(catalog),
    cipherSha256: hash(cipher),
    plaintextPersisted: false,
    recoveryComplete: false,
  };
}
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  try {
    const options = parseRoleCaptureArguments(process.argv.slice(2));
    console.log(
      JSON.stringify(
        await (options.mode === "capture"
          ? captureRoleCatalog(options)
          : verifyRoleCatalogCipher(options)),
      ),
    );
  } catch {
    console.error("COMUN_ROLE_CATALOG_OPERATION_REJECTED");
    process.exitCode = 1;
  }
}
