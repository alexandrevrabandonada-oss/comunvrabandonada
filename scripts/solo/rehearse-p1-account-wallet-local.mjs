import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const base = process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3142";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const dbUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (
  process.env.ALLOW_LOCAL_TESTS !== "true" ||
  !/^https?:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(supabaseUrl) ||
  !/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(dbUrl) ||
  !anonKey ||
  !serviceKey ||
  process.env.COMMUNITY_REGISTRATION_MODE !== "open" ||
  process.env.COMUN_PARTICIPATION_WALLET_LOCAL !== "enabled" ||
  process.env.COMUN_TERRITORY_PROFILE_ENABLED === "enabled" ||
  process.env.COMUN_GOOGLE_AUTH_ENABLED === "enabled"
) {
  throw new Error("COMUN_P1_LOCAL_CONTRACT_REQUIRED");
}

const token = () => randomBytes(32).toString("base64url");
const hash = (value) => createHash("sha256").update(`comun-wallet-v1:${value}`).digest("hex");
const email = `p1-${randomBytes(8).toString("hex")}@example.invalid`;
const password = `${token()}Aa1!`;
const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

const output = [];
const serverScript = process.env.COMUN_P1_USE_BUILT_SERVER === "1" ? "start" : "dev";
const server = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", serverScript, "--", "-p", new URL(base).port], {
  cwd: process.cwd(),
  env: process.env,
  shell: process.platform === "win32",
  detached: process.platform !== "win32",
  stdio: ["ignore", "pipe", "pipe"],
});
const capture = (chunk) => { output.push(String(chunk)); if (output.length > 80) output.shift(); };
server.stdout.on("data", capture);
server.stderr.on("data", capture);

let appCookie = "";
let walletCookie = "";
const absorb = (response, target = "app") => {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const current = new Map((target === "wallet" ? walletCookie : appCookie)
    .split(/;\s*/).filter(Boolean).map((part) => part.split("=", 2)));
  for (const part of setCookie.split(/,(?=[^;]+?=)/)) {
    const pair = part.split(";", 1)[0];
    const index = pair.indexOf("=");
    if (index > 0) current.set(pair.slice(0, index), pair.slice(index + 1));
  }
  const value = [...current.entries()].map(([name, item]) => `${name}=${item}`).join("; ");
  if (target === "wallet") walletCookie = value;
  else appCookie = value;
};
const request = async (path, init = {}, cookie = "", target = "app") => {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  absorb(response, target);
  return response;
};
const waitForServer = async () => {
  for (let i = 0; i < 90; i += 1) {
    if (server.exitCode !== null) throw new Error(`COMUN_P1_LOCAL_SERVER_EXIT_${server.exitCode}`);
    try {
      const response = await fetch(`${base}/comun`);
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("COMUN_P1_LOCAL_HTTP_UNAVAILABLE");
};
const stopServer = async () => {
  if (server.exitCode !== null) return;
  try { process.platform !== "win32" && server.pid ? process.kill(-server.pid, "SIGTERM") : server.kill("SIGTERM"); } catch {}
  await new Promise((resolve) => setTimeout(resolve, 800));
  try { process.platform !== "win32" && server.pid ? process.kill(-server.pid, "SIGKILL") : server.kill("SIGKILL"); } catch {}
};

const cookieStore = new Map();
const authClient = createServerClient(supabaseUrl, anonKey, {
  cookies: {
    getAll: () => [...cookieStore.entries()].map(([name, value]) => ({ name, value })),
    setAll: (cookies) => cookies.forEach(({ name, value }) => cookieStore.set(name, value)),
  },
});
const authCookieHeader = () => [...cookieStore.entries()].map(([name, value]) => `${name}=${value}`).join("; ");

let userId = "";
let firstWalletToken = "";
let recoveredWalletToken = "";
let secondWalletToken = "";
let recoveryCode = "";
try {
  await waitForServer();
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: "P1 synthetic" } });
  if (created.error || !created.data.user) throw new Error("P1_USER_CREATE_FAILED");
  userId = created.data.user.id;
  const profile = await service.from("comun_member_profiles").upsert({
    user_id: userId,
    display_name: "P1 synthetic",
    participation_visibility: "private",
    profile_visibility: "private",
    status: "active",
    onboarding_completed_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (profile.error) throw new Error("P1_PROFILE_CREATE_FAILED");

  const signedIn = await authClient.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.user) throw new Error("P1_LOGIN_FAILED");
  const firstArea = await request("/comun/minha-participacao", {}, authCookieHeader());
  assert.equal(firstArea.status, 200);
  await authClient.auth.signOut();
  cookieStore.clear();
  const signedInAgain = await authClient.auth.signInWithPassword({ email, password });
  assert.equal(Boolean(signedInAgain.data.user), true);
  const secondArea = await request("/comun/minha-participacao", {}, authCookieHeader());
  assert.equal(secondArea.status, 200);
  const wrong = await anon.auth.signInWithPassword({ email, password: `${password}wrong` });
  assert.ok(wrong.error);

  const walletCreated = await request("/api/comun/participation-wallet", { method: "POST" }, "", "wallet");
  assert.equal(walletCreated.status, 201);
  const walletBody = await walletCreated.json();
  assert.equal(typeof walletBody.recoveryCode, "string");
  recoveryCode = walletBody.recoveryCode;
  firstWalletToken = walletCookie.match(/comun_participation_wallet_v1=([^;]+)/)?.[1] ?? "";
  assert.ok(firstWalletToken);
  const walletListed = await request("/api/comun/participation-wallet", {}, walletCookie, "wallet");
  assert.equal(walletListed.status, 200);
  assert.deepEqual((await walletListed.json()).items, []);

  const wrongRecovery = await request("/api/comun/participation-wallet/recovery/redeem", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ recoveryCode: "AAAA-AAAA-AAAA-AAAA-AAAA-AAAA" }),
  }, "", "wallet");
  assert.equal(wrongRecovery.status, 404);
  const recovered = await request("/api/comun/participation-wallet/recovery/redeem", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ recoveryCode }),
  }, "", "wallet");
  assert.equal(recovered.status, 200);
  recoveredWalletToken = walletCookie.match(/comun_participation_wallet_v1=([^;]+)/)?.[1] ?? "";
  assert.ok(recoveredWalletToken && recoveredWalletToken !== firstWalletToken);

  const authenticatedWalletCookie = `${authCookieHeader()}; ${walletCookie}`;
  const link = await request("/api/comun/participation-wallet/account/link", {
    method: "POST", headers: { "content-type": "application/json" }, body: "{}",
  }, authenticatedWalletCookie);
  assert.equal(link.status, 200);
  const unlink = await request("/api/comun/participation-wallet/account/unlink", {
    method: "POST", headers: { "content-type": "application/json" }, body: "{}",
  }, authenticatedWalletCookie);
  assert.equal(unlink.status, 200);

  const secondWallet = await request("/api/comun/participation-wallet", { method: "POST" }, "", "wallet");
  assert.equal(secondWallet.status, 201);
  const secondWalletCookie = secondWallet.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
  secondWalletToken = secondWalletCookie.split("=", 2)[1] ?? "";
  const isolated = await request("/api/comun/participation-wallet", {}, secondWalletCookie, "wallet");
  assert.deepEqual((await isolated.json()).items, []);
  console.log(JSON.stringify({
    result: "COMUN_48_1B_P1_ACCOUNT_WALLET_DISPOSABLE_E2E_GREEN",
    signup: "synthetic_admin_user",
    login_logout_login: true,
    onboarding: "profile_completed_synthetic",
    wallet: true,
    recovery: true,
    explicit_link_unlink: true,
    cross_wallet_isolated: true,
    territory: "disabled",
    google: "disabled",
    remote: "not_contacted",
  }));
} finally {
  const client = new pg.Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query("begin");
    const walletHashes = [firstWalletToken, recoveredWalletToken, secondWalletToken].filter(Boolean).map(hash);
    if (walletHashes.length) {
      await client.query("delete from private.comun_participation_wallet_events e using private.comun_participation_wallets w where e.wallet_id=w.id and w.token_hash=any($1::bytea[])", [walletHashes.map((value) => Buffer.from(value, "hex"))]);
      await client.query("delete from private.comun_participation_wallet_account_links l using private.comun_participation_wallets w where l.wallet_id=w.id and w.token_hash=any($1::bytea[])", [walletHashes.map((value) => Buffer.from(value, "hex"))]);
      await client.query("delete from private.comun_participation_wallet_recovery_credentials c using private.comun_participation_wallets w where c.wallet_id=w.id and w.token_hash=any($1::bytea[])", [walletHashes.map((value) => Buffer.from(value, "hex"))]);
      await client.query("delete from private.comun_participation_wallet_items i using private.comun_participation_wallets w where i.wallet_id=w.id and w.token_hash=any($1::bytea[])", [walletHashes.map((value) => Buffer.from(value, "hex"))]);
      await client.query("delete from private.comun_participation_wallets where token_hash=any($1::bytea[])", [walletHashes.map((value) => Buffer.from(value, "hex"))]);
    }
    if (userId) await client.query("delete from public.comun_member_profiles where user_id=$1", [userId]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
    if (userId) await service.auth.admin.deleteUser(userId).catch(() => {});
    await stopServer();
  }
}
