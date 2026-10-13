import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import {
  assessLab,
  createLabServer,
  isLocalAuth,
  validFreshChallenge,
  pinnedLab,
  capturedTemplates,
  matchesCapturedTemplates,
  widgetHostIsLoopback,
} from "./auth-interactive-lab.mjs";

test("all five exact Source template hash pairs are mandatory", () => {
  assert.equal(matchesCapturedTemplates(capturedTemplates), true);
  assert.equal(
    matchesCapturedTemplates({ ...capturedTemplates, signup: [] }),
    false,
  );
  assert.equal(
    matchesCapturedTemplates({
      ...capturedTemplates,
      email_change: capturedTemplates.signup,
    }),
    false,
  );
  assert.equal(
    matchesCapturedTemplates({ ...capturedTemplates, extra: [] }),
    false,
  );
});
test("named widget hosts require existing exclusively loopback resolution; no DNS writes", async () => {
  const local = async () => [{ address: "127.0.0.1" }];
  assert.equal(
    await widgetHostIsLoopback("http://lab.example:9996", local),
    true,
  );
  assert.equal(
    await widgetHostIsLoopback("http://lab.example:9996", async () => [
      { address: "192.0.2.1" },
    ]),
    false,
  );
  assert.equal(
    await widgetHostIsLoopback("http://lab.example:9996", async () => [
      { address: "127.0.0.1" },
      { address: "192.0.2.1" },
    ]),
    false,
  );
  assert.equal(
    await widgetHostIsLoopback("https://lab.example:9996", local),
    false,
  );
  assert.equal(
    await widgetHostIsLoopback("http://lab.example:9996/?token=x", local),
    false,
  );
});

test("only the fixed loopback Auth origin is accepted", () => {
  assert.equal(isLocalAuth("http://127.0.0.1:9999"), true);
  for (const value of [
    "https://example.com",
    "http://127.0.0.1:9999@evil.example",
    "http://localhost:9999",
    "http://0.0.0.0:9999",
    "http://127.0.0.1:9999/verify",
    "http://127.0.0.1:9999?token=x",
    "http://127.0.0.1:9999/#x",
  ])
    assert.equal(isLocalAuth(value), false);
});
test("missing, placeholder and official dummy keys fail closed without provider calls", () => {
  for (const sitekey of [
    undefined,
    "placeholder",
    "1x00000000000000000000AA",
    "2x00000000000000000000AB",
    "3x00000000000000000000FF",
  ]) {
    const result = assessLab(
      {
        COMUN_LAB_AUTH_URL: "http://127.0.0.1:9999",
        COMUN_LAB_CAPTCHA_SITEKEY: sitekey,
      },
      null,
    );
    assert.equal(result.status, "BLOCKED");
    assert.ok(result.blockers.includes("LAB_REAL_KEYS_REQUIRED"));
    assert.equal(result.sitekey, null);
    assert.equal(result.positiveCaptcha, "NOT_RUN");
  }
});
test("Production config scope and absent stack/host attestation are rejected", () => {
  const result = assessLab({ COMUN_LAB_CONFIG_SCOPE: "PRODUCTION" }, null);
  assert.ok(result.blockers.includes("LAB_EXCLUSIVE_CONFIG_REQUIRED"));
  assert.ok(result.blockers.includes("LAB_STACK_AND_HOST_RECEIPT_REQUIRED"));
  assert.equal(result.externalMessages, 0);
});
test("receipt cannot replace pinned images or Source policy with assumptions", () => {
  assert.match(pinnedLab.auth, /^sha256:[a-f0-9]{64}$/);
  for (const receipt of [
    {},
    { authImage: "latest" },
    { providerHostAccepted: false },
    { sourceSubject: "Change email" },
    { productionCredentials: true },
  ]) {
    assert.ok(
      assessLab({}, receipt).blockers.includes(
        "LAB_STACK_AND_HOST_RECEIPT_REQUIRED",
      ),
    );
  }
});
test("missing, expired and future-dated challenges are rejected using metadata only", () => {
  // No CAPTCHA token is fabricated or sent in these unit tests.
  assert.equal(validFreshChallenge(false, 0, 1), false);
  assert.equal(validFreshChallenge(true, 0, 240000), false);
  assert.equal(validFreshChallenge(true, 2, 1), false);
  assert.equal(validFreshChallenge(true, NaN, 1), false);
});
test("blocked HTTP interface accepts no attempt, credential or token endpoint", async (t) => {
  const server = await createLabServer({ env: {} });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const config = await (await fetch(origin + "/config")).json();
  assert.equal(config.status, "BLOCKED");
  assert.equal(config.sitekey, null);
  assert.equal(JSON.stringify(config).includes("SECRET"), false);
  for (const route of ["/attempt", "/token", "/send", "/verify"]) {
    const response = await fetch(origin + route, {
      method: "POST",
      headers: { Origin: origin },
      body: "{}",
    });
    assert.ok(response.status >= 400);
  }
});
test("foreign Origin and rebound Host rejected, with no-store and CSP", async (t) => {
  const server = await createLabServer({ env: {} });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  assert.equal(
    (await fetch(origin, { headers: { Origin: "https://evil.example" } }))
      .status,
    403,
  );
  // Undici replaces Host; use an independent raw HTTP connection for rebinding.
  const rebound = await new Promise((resolve, reject) => {
    http
      .get(origin, { headers: { Host: "evil.example" } }, (response) => {
        response.resume();
        resolve(response.statusCode);
      })
      .on("error", reject);
  });
  assert.equal(rebound, 403);
  const response = await fetch(origin);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(
    response.headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
});
test("client handles widget expiry/error and never persists or logs token/session", async () => {
  const source = await readFile(
    new URL("auth-interactive-lab-client.mjs", import.meta.url),
    "utf8",
  );
  assert.match(source, /"response-field": false/);
  assert.match(source, /"expired-callback": clearChallenge/);
  assert.match(source, /"error-callback":/);
  assert.match(source, /providerFailed = true/);
  assert.doesNotMatch(
    source,
    /console\.|localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon|generate_link/,
  );
  assert.match(source, /gotrue_meta_security = \{ captcha_token: challenge \}/);
  assert.match(source, /credentials: "omit",\s*redirect: "error"/);
  assert.match(source, /challenge = null;\s*session = null/);
});
test("operation reservation is persisted before direct Auth request, with no retries", async () => {
  const source = await readFile(
    new URL("auth-interactive-lab-client.mjs", import.meta.url),
    "utf8",
  );
  assert.ok(
    source.indexOf('fetch("/attempt"') <
      source.search(/const response = await auth\(/),
  );
  assert.match(source, /used\.add\(flow\)/);
  assert.match(source, /retry: "never"/);
  assert.match(source, /"refresh-expired": "never"/);
  assert.match(source, /body: JSON\.stringify\(\{ flow \}\)/);
});
test("HTML contains no secret/token field, no remote resource, and gates start disabled", async () => {
  const source = await readFile(
    new URL("auth-interactive-lab.html", import.meta.url),
    "utf8",
  );
  assert.equal((source.match(/data-flow=/g) ?? []).length, 5);
  assert.equal((source.match(/data-flow="\w+" disabled/g) ?? []).length, 5);
  assert.doesNotMatch(
    source,
    /https?:\/\/|name="(?:captcha|secret|token)|GMAIL_SEND/,
  );
  assert.match(source, /Confirm Email Change/);
});
