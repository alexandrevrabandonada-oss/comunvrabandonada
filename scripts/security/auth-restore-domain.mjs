// Synthetic-only HTTP driver. Invoked exclusively inside the owned internal network.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile, writeFile, statfs } from "node:fs/promises";

const owner = process.env.COMUN_AUTH_RESTORE_OWNER;
const phase = process.argv[2];
const results = [];
const check = (name, value) => {
  assert(value);
  results.push({ name, result: "PASS" });
};
const stateFile = "/state/accounts.json";
const save = (state) =>
  writeFile(stateFile, JSON.stringify(state), { mode: 0o600 });
const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
let admin;
let lastHttpStatus = null;
function url(kind, surface, route) {
  assert(["source", "restored"].includes(kind));
  assert(["auth", "rest"].includes(surface));
  assert(route.startsWith("/") && !route.startsWith("//"));
  return `http://${owner}-${kind}-${surface}:${surface === "auth" ? 9999 : 3000}${route}`;
}
async function request(
  kind,
  surface,
  route,
  { method = "GET", token, body } = {},
) {
  const response = await fetch(url(kind, surface, route), {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
    redirect: "error",
  });
  const text = await response.text();
  lastHttpStatus = response.status;
  return { status: response.status, data: text ? JSON.parse(text) : null };
}
async function ready(kind, surface) {
  for (let n = 0; n < 60; n++) {
    try {
      if (
        (await request(kind, surface, surface === "auth" ? "/health" : "/"))
          .status === 200
      )
        return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("OWNED_SERVICE_NOT_READY");
}
async function create(kind, email, id) {
  const result = await request(kind, "auth", "/admin/users", {
    method: "POST",
    token: admin,
    body: {
      email,
      password: process.env.COMUN_AUTH_RESTORE_PASSWORD,
      email_confirm: true,
      ...(id ? { id } : {}),
    },
  });
  assert.equal(result.status, 200);
  assert(result.data.id);
  if (id) assert.equal(result.data.id, id);
  return { id: result.data.id, email };
}
async function login(kind, account) {
  const result = await request(kind, "auth", "/token?grant_type=password", {
    method: "POST",
    body: {
      email: account.email,
      password: process.env.COMUN_AUTH_RESTORE_PASSWORD,
    },
  });
  assert.equal(result.status, 200);
  assert.equal(result.data.user.id, account.id);
  const token = result.data.access_token;
  const claims = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString(),
  );
  assert.equal(claims.sub, account.id);
  assert(claims.session_id);
  assert(claims.exp > Date.now() / 1000);
  const user = await request(kind, "auth", "/user", { token });
  assert.equal(user.status, 200);
  assert.equal(user.data.id, account.id);
  return {
    token,
    refresh: result.data.refresh_token,
    sessionId: claims.session_id,
  };
}
async function memberships(kind, token, id) {
  const response = await request(
    kind,
    "rest",
    `/comun_community_memberships?select=id,member_user_id${id ? `&member_user_id=eq.${id}` : ""}`,
    { token },
  );
  assert.equal(response.status, 200);
  assert(Array.isArray(response.data));
  return response.data;
}
try {
  assert.match(owner ?? "", /^comun-ar-[a-f0-9-]{36}$/);
  assert.equal((await statfs("/state")).type, 0x01021994);
  assert.match(process.env.COMUN_AUTH_RESTORE_SECRET ?? "", /^[a-f0-9]{96}$/);
  const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ iss: "supabase", role: "service_role", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 1800 })}`;
  admin = `${unsigned}.${createHmac("sha256", process.env.COMUN_AUTH_RESTORE_SECRET).update(unsigned).digest("base64url")}`;
  let internal;
  if (phase === "create-source") {
    await ready("source", "auth");
    const a = await create("source", `a-${owner}@example.invalid`);
    const b = await create("source", `b-${owner}@example.invalid`);
    const state = {
      a,
      b,
      aSource: await login("source", a),
      bSource: await login("source", b),
    };
    await save(state);
    internal = { a: a.id, b: b.id };
    check("source_A_B_real_login", true);
  } else if (phase === "source-read") {
    await ready("source", "rest");
    const s = JSON.parse(await readFile(stateFile, "utf8"));
    check(
      "source_A_owns_only_A",
      (await memberships("source", s.aSource.token)).length === 1 &&
        (await memberships("source", s.aSource.token, s.b.id)).length === 0,
    );
    check(
      "source_B_cannot_read_A",
      (await memberships("source", s.bSource.token, s.a.id)).length === 0,
    );
    check(
      "source_B_reads_own_restored_fixture_control",
      (await memberships("source", s.bSource.token, s.b.id)).length === 1,
    );
  } else if (phase === "create-restored") {
    await ready("restored", "auth");
    const s = JSON.parse(await readFile(stateFile, "utf8"));
    // Only this known synthetic UUID is recreated by the test administrator.
    // This is NOT a mechanism to rebind real accounts or prove provider recovery.
    s.bNew = await create("restored", s.a.email);
    assert.notEqual(s.bNew.id, s.a.id);
    s.aRestored = await create(
      "restored",
      `restored-a-${owner}@example.invalid`,
      s.a.id,
    );
    s.aTarget = await login("restored", s.aRestored);
    s.bTarget = await login("restored", s.bNew);
    await save(s);
    internal = { a: s.a.id, bNew: s.bNew.id };
    check("controlled_synthetic_UUID_reauthentication", true);
  } else if (phase === "restored-read") {
    await ready("restored", "rest");
    const s = JSON.parse(await readFile(stateFile, "utf8"));
    const sourceUser = await request("source", "auth", "/user", {
      token: s.aSource.token,
    });
    check("source_session_still_valid_at_source", sourceUser.status === 200);
    check(
      "source_JWT_cannot_restore_target_session",
      (await memberships("restored", s.aSource.token)).length === 0,
    );
    check(
      "same_email_new_UUID_cannot_inherit_ownership",
      (await memberships("restored", s.bTarget.token, s.a.id)).length === 0,
    );
    check(
      "new_identity_active_profile_has_no_membership",
      (await memberships("restored", s.bTarget.token)).length === 0,
    );
    check(
      "reauthenticated_known_UUID_reads_own_restored_row",
      (await memberships("restored", s.aTarget.token, s.a.id)).length === 1,
    );
    check(
      "restored_A_cannot_read_original_B",
      (await memberships("restored", s.aTarget.token, s.b.id)).length === 0,
    );
    const anonymous = await request(
      "restored",
      "rest",
      "/comun_community_memberships?select=id",
    );
    check(
      "anonymous_reads_no_memberships",
      [401, 403].includes(anonymous.status),
    );
  } else if (phase === "revoke") {
    const s = JSON.parse(await readFile(stateFile, "utf8"));
    s.revoked = s.aTarget;
    assert(
      JSON.parse(
        Buffer.from(s.revoked.token.split(".")[1], "base64url").toString(),
      ).exp >
        Date.now() / 1000,
    );
    const response = await request("restored", "auth", "/logout?scope=global", {
      method: "POST",
      token: s.revoked.token,
    });
    check("native_logout_accepted", response.status === 204);
    check(
      "revoked_unexpired_JWT_reads_no_private_rows",
      (await memberships("restored", s.revoked.token)).length === 0,
    );
    const refresh = await request(
      "restored",
      "auth",
      "/token?grant_type=refresh_token",
      { method: "POST", body: { refresh_token: s.revoked.refresh } },
    );
    check("revoked_refresh_rejected", [400, 401].includes(refresh.status));
    s.aTarget = await login("restored", s.aRestored);
    check(
      "fresh_session_is_distinct",
      s.aTarget.sessionId !== s.revoked.sessionId &&
        s.aTarget.sessionId !== s.aSource.sessionId,
    );
    check(
      "fresh_session_restores_own_access",
      (await memberships("restored", s.aTarget.token)).length === 1,
    );
    check(
      "relogin_does_not_resurrect_old_JWT",
      (await memberships("restored", s.revoked.token)).length === 0,
    );
    await save(s);
  } else if (phase === "suspended-profile") {
    const s = JSON.parse(await readFile(stateFile, "utf8"));
    check(
      "suspended_restored_profile_denies_session",
      (await memberships("restored", s.aTarget.token)).length === 0,
    );
  } else if (phase === "ban") {
    const s = JSON.parse(await readFile(stateFile, "utf8"));
    check(
      "active_profile_and_live_session_work_before_ban",
      (await memberships("restored", s.aTarget.token)).length === 1,
    );
    const result = await request("restored", "auth", `/admin/users/${s.a.id}`, {
      method: "PUT",
      token: admin,
      body: { ban_duration: "1h" },
    });
    check("native_synthetic_ban_accepted", result.status === 200);
    check(
      "ban_denies_unexpired_JWT_with_active_profile",
      (await memberships("restored", s.aTarget.token)).length === 0,
    );
  } else if (phase === "cleanup-users") {
    for (const kind of ["source", "restored"]) {
      const response = await request(kind, "auth", "/admin/users", {
        token: admin,
      });
      assert.equal(response.status, 200);
      for (const user of response.data.users) {
        assert(user.email.endsWith("@example.invalid"));
        const removed = await request(kind, "auth", `/admin/users/${user.id}`, {
          method: "DELETE",
          token: admin,
        });
        assert.equal(removed.status, 200);
      }
      const after = await request(kind, "auth", "/admin/users", {
        token: admin,
      });
      check(
        `${kind}_synthetic_accounts_absent`,
        after.status === 200 && after.data.users.length === 0,
      );
    }
  } else throw new Error("PHASE_INVALID");
  console.log(JSON.stringify({ results, internal }));
} catch {
  console.log(JSON.stringify({ failureDiagnostic: { phase, lastHttpStatus } }));
  console.error("COMUN_AUTH_RESTORE_DOMAIN_FAILED");
  process.exitCode = 1;
}
