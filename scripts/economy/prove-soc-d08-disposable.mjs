import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { spawnSync, execFileSync } from "node:child_process";
import { load } from "js-yaml";
import { createClient } from "@supabase/supabase-js";

// This runner can only own a disposable GitHub runner. No Production env/secret.
if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.COMUN_SOC_D08_DISPOSABLE !== "OWNED_RUNNER_ONLY"
)
  throw new Error("SOC_D08_OWNED_DISPOSABLE_REQUIRED");
for (const name of [
  "SUPABASE_DB_URL",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]) {
  if (process.env[name])
    throw new Error("SOC_D08_EXTERNAL_CREDENTIALS_REJECTED");
}
const source = readFileSync(
  ".github/workflows/comun-48-4-a5-disposable.yml",
  "utf8",
);
const canonical = load(source).jobs["disposable-supabase"].steps.find(
  (step) =>
    step.name === "Prove consent, authority, redaction and zero propagation",
)?.run;
if (
  !canonical ||
  !canonical.includes("supabase start -x") ||
  !canonical.includes('test -n "$db"') ||
  /SUPABASE_DB_URL|--db-url|workflow_dispatch/.test(canonical)
)
  throw new Error("SOC_D08_CANONICAL_PROOF_CONTRACT_CHANGED");
const port = Number(
  readFileSync("supabase/config.toml", "utf8").match(
    /\[db\][\s\S]*?^port\s*=\s*(\d+)/m,
  )?.[1],
);
if (!Number.isSafeInteger(port)) throw new Error("SOC_D08_LOCAL_PORT_REQUIRED");
// Reuse the canonical A5 SQL verbatim; guard the destination before its first SQL write.
const guarded = canonical.replace(
  'test -n "$db"',
  `test -n "$db"; case "$db" in postgresql://postgres:postgres@127.0.0.1:${port}/postgres|postgresql://postgres:postgres@localhost:${port}/postgres) ;; *) exit 97 ;; esac`,
);
const result = spawnSync("bash", ["-c", guarded], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
// Never print raw CLI output: it may contain keys issued only for this lab.
if (result.status !== 0)
  throw new Error(`SOC_D08_CANONICAL_A5_FAILED_EXIT_${result.status}`);
const raw = execFileSync("supabase", ["status", "-o", "env"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
});
const local = Object.fromEntries(
  [...raw.matchAll(/^([A-Z_]+)="([^"\r\n]*)"$/gm)].map((match) => [
    match[1],
    match[2],
  ]),
);
const url = new URL(local.API_URL);
if (
  url.protocol !== "http:" ||
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.username ||
  url.password ||
  url.pathname !== "/"
)
  throw new Error("SOC_D08_AUTH_LOOPBACK_REQUIRED");
if (!local.ANON_KEY || !local.SERVICE_ROLE_KEY)
  throw new Error("SOC_D08_OWNED_AUTH_KEYS_REQUIRED");
const admin = createClient(url.origin, local.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const users = [];
const clients = [];
try {
  for (const alias of ["a", "b"]) {
    const password = randomBytes(24).toString("base64url");
    const email = `soc-d08-${alias}-${randomBytes(6).toString("hex")}@example.invalid`;
    // All writes below use the same validated loopback client, never external identities.
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user)
      throw new Error("SOC_D08_SYNTHETIC_AUTH_CREATE_FAILED");
    users.push(created.data.user.id);
    const client = createClient(url.origin, local.ANON_KEY, {
      auth: { persistSession: false },
    });
    clients.push(client);
    const signed = await client.auth.signInWithPassword({ email, password });
    if (signed.error || signed.data.user?.id !== created.data.user.id)
      throw new Error("SOC_D08_AUTH_SIGNIN_FAILED");
    const checked = await client.auth.getUser();
    if (checked.error || checked.data.user?.id !== created.data.user.id)
      throw new Error("SOC_D08_AUTH_GETUSER_FAILED");
  }
  if (users[0] === users[1])
    throw new Error("SOC_D08_AUTH_IDENTITY_ISOLATION_FAILED");
  const cross = await clients[0].rpc(
    "comun_list_my_solidarity_connections_v1",
    { p_member_user_id: users[1] },
  );
  if (!cross.error || !/permission denied/i.test(cross.error.message))
    throw new Error("SOC_D08_AUTHENTICATED_BRIDGE_EXPOSED");
  for (const client of clients) {
    const signedOut = await client.auth.signOut();
    if (
      signedOut.error ||
      (await client.auth.getSession()).data.session !== null
    )
      throw new Error("SOC_D08_AUTH_SIGNOUT_FAILED");
  }
} finally {
  for (const client of clients) await client.auth.signOut();
  for (const id of users) {
    const removed = await admin.auth.admin.deleteUser(id);
    if (removed.error) throw new Error("SOC_D08_OWNED_USER_CLEANUP_FAILED");
  }
}
const proof = {
  status: "PASS",
  scope: "OWNED_DISPOSABLE_ONLY",
  runSha: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  canonicalA5Sha256: createHash("sha256").update(source).digest("hex"),
  canonicalSqlAndPermissions: "PASS",
  authIdentities: users.length,
  authSignInGetUserSignOut: "PASS",
  authenticatedClientBridgeDenied: true,
  ownedSyntheticUsersRemoved: users.length,
  productionWrites: 0,
  realMailSent: 0,
  limits:
    "Browser fixture uses controlled Auth/RPC transport; this separate proof uses real disposable Auth/Postgres. Access JWT expiry is not changed by signOut.",
};
mkdirSync(".ci-artifacts/soc-d08", { recursive: true });
writeFileSync(
  ".ci-artifacts/soc-d08/disposable.json",
  JSON.stringify(proof, null, 2),
);
console.log("SOC_D08_DISPOSABLE_AUTH_POSTGRES_PASS");
