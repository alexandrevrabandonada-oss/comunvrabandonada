import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { fileURLToPath } from "node:url";
import { recoveryBatch } from "./auth-recovery-batch.mjs";

export const pinnedLab = Object.freeze({
  auth: "sha256:c0c25187a6b835e65a6f6e6c6b39d090e832d40e6de5186f2c038e0411944232",
  postgres:
    "sha256:8002645276dc3431d55a5049721a879e4d11c34177086dc0f13b61d98cff1e52",
});
export const capturedTemplates = Object.freeze({
  signup: [
    "cc59bb88d514ab1a3a517a8db6b26931bf65a424c753559bb5e28a32ac5f4b01",
    "c0ca25cb7be22bf10d89307bd2acbc9495b4878673716654895ce8768b9e52d4",
  ],
  recovery: [
    "0568c7b06559cc28a7d6fce914ac614c8aeabc97b7c4e88d7db1902dae69841a",
    "15c981d5df30d2de3360fcc72f8ad3e40c792c80555532d3afe1eaafa800eae6",
  ],
  magiclink: [
    "430e2f5f8f416cab6a000ba325ecd474d0d5313fa3a8225ef23b39e76200ab67",
    "6d2feac6c895b5da085175cbed685550c22fa7be7b1275b003cfb1474d1bf664",
  ],
  email_change: [
    "c2736949b6fef7a5b5ae9670024e3d81800152e8f454785a83a31f74cca570d1",
    "8d8e026d8a9412631b39bb08bd40426d4a7bd383777946a5356e9685d72a3df6",
  ],
  reauthentication: [
    "a91210cb180207b5ffb578ed1daeb01bf2e6c30388fab31b12535d474d804002",
    "0dc3df870ee086062fa88a1fde342bb02dd2d763ce4acaf999504f4415b84945",
  ],
});
export function matchesCapturedTemplates(actual) {
  return (
    actual &&
    Object.keys(actual).length === 5 &&
    Object.entries(capturedTemplates).every(
      ([flow, hashes]) =>
        Array.isArray(actual[flow]) &&
        actual[flow].length === 2 &&
        actual[flow].every((hash, index) => hash === hashes[index]),
    )
  );
}
export const flows = Object.freeze([
  "signup",
  "recovery",
  "magiclink",
  "email_change",
  "reauthentication",
]);
export function isLocalAuth(value) {
  try {
    const url = new URL(value);
    return (
      url.origin === "http://127.0.0.1:9999" &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
export async function widgetHostIsLoopback(value, resolve = lookup) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "http:" ||
      url.port !== "9996" ||
      url.pathname !== "/" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return false;
    const addresses = await resolve(url.hostname, { all: true });
    return (
      addresses.length > 0 &&
      addresses.every((item) => item.address === "127.0.0.1")
    );
  } catch {
    return false;
  }
}
// Receipt is prepared privately by the owned-stack coordinator after inspecting
// containers/configuration. This is NOT a migration permit or a CAPTCHA PASS.
export function assessLab(env, receipt) {
  const blockers = [];
  if (!isLocalAuth(env.COMUN_LAB_AUTH_URL))
    blockers.push("LAB_DESTINATION_REJECTED");
  if (env.COMUN_LAB_CAPTCHA_PROVIDER !== "turnstile")
    blockers.push("LAB_PROVIDER_REQUIRED");
  if (env.COMUN_LAB_CONFIG_SCOPE !== "LAB_ONLY")
    blockers.push("LAB_EXCLUSIVE_CONFIG_REQUIRED");
  const sitekey = env.COMUN_LAB_CAPTCHA_SITEKEY ?? "";
  const secret = env.COMUN_LAB_CAPTCHA_SECRET ?? "";
  let widgetHost = null;
  try {
    widgetHost = new URL(env.COMUN_LAB_WIDGET_ORIGIN ?? "http://127.0.0.1:9996")
      .hostname;
  } catch {
    /* blocked */
  }
  if (
    !/^0x4[A-Za-z0-9_-]{20,80}$/.test(sitekey) ||
    !/^0x4[A-Za-z0-9_-]{20,100}$/.test(secret)
  )
    blockers.push("LAB_REAL_KEYS_REQUIRED");
  // Turnstile dummy sitekeys/secrets (1x/2x/3x) fail the format above.
  if (
    !receipt ||
    receipt.scope !== "OWNED_SYNTHETIC_LAB" ||
    receipt.authUrl !== env.COMUN_LAB_AUTH_URL ||
    receipt.authImage !== pinnedLab.auth ||
    receipt.postgresImage !== pinnedLab.postgres ||
    receipt.captchaProvider !== "turnstile" ||
    receipt.smtp !== "LOCAL_ONLY" ||
    receipt.productionCredentials !== false ||
    receipt.productionData !== false ||
    receipt.templateHashesVerified !== true ||
    !matchesCapturedTemplates(receipt.templateHashes) ||
    receipt.sourceSubject !== "Confirm Email Change" ||
    receipt.sourceEmailChangePolicyVerified !== true ||
    receipt.sourceEmailPolicyCaptureSha256 !==
      "2e80a86d3135a0bd31ff65d49adf1aa69b0a5c58ed8bab67db16ce1472c3da66" ||
    !widgetHost ||
    receipt.allowedWidgetHost !== widgetHost ||
    receipt.providerHostAccepted !== true ||
    receipt.captchaSitekeySha256 !==
      createHash("sha256").update(sitekey).digest("hex") ||
    receipt.captchaSecretSha256 !==
      createHash("sha256").update(secret).digest("hex")
  )
    blockers.push("LAB_STACK_AND_HOST_RECEIPT_REQUIRED");
  return {
    status: blockers.length ? "BLOCKED" : "PREPARED_NOT_MANUAL_PASS",
    blockers,
    authUrl: "http://127.0.0.1:9999",
    provider: "turnstile",
    sitekey: blockers.length ? null : sitekey,
    identities: { a: recoveryBatch.a, b: recoveryBatch.b },
    maximumLocalMessages: recoveryBatch.maximum,
    externalMessages: 0,
    positiveCaptcha: "NOT_RUN",
  };
}
export function validFreshChallenge(present, issuedAt, now) {
  return (
    present === true &&
    Number.isFinite(issuedAt) &&
    Number.isFinite(now) &&
    now >= issuedAt &&
    now - issuedAt < 240000
  );
}

export async function createLabServer({
  env = process.env,
  receipt = null,
  markerDir = null,
} = {}) {
  const config = assessLab(env, receipt);
  const widgetOrigin = env.COMUN_LAB_WIDGET_ORIGIN ?? "http://127.0.0.1:9996";
  if (!(await widgetHostIsLoopback(widgetOrigin))) {
    config.blockers.push("LAB_WIDGET_HOST_NOT_LOOPBACK");
    config.status = "BLOCKED";
    config.sitekey = null;
  }
  const acceptedHost = config.blockers.includes("LAB_WIDGET_HOST_NOT_LOOPBACK")
    ? "127.0.0.1"
    : new URL(widgetOrigin).hostname;
  // Never retain or serialize secret. It belongs exclusively in the Auth local
  // process's unversioned environment; this web server does not verify tokens.
  const files = new Map([
    ["/", ["auth-interactive-lab.html", "text/html; charset=utf-8"]],
    [
      "/client.mjs",
      ["auth-interactive-lab-client.mjs", "text/javascript; charset=utf-8"],
    ],
  ]);
  const attempted = new Set();
  if (!markerDir || !path.isAbsolute(markerDir)) {
    config.blockers.push("LAB_PRIVATE_MARKER_DIRECTORY_REQUIRED");
    config.status = "BLOCKED";
    config.sitekey = null;
  }
  // Repositories are not a permitted store for attempt records. The configured
  // directory must already be protected externally (Windows ACL, not mode bits).
  const repository = fileURLToPath(new URL("../../", import.meta.url));
  if (markerDir && !path.relative(repository, markerDir).startsWith("..")) {
    config.blockers.push("LAB_PRIVATE_MARKER_DIRECTORY_REQUIRED");
    config.status = "BLOCKED";
    config.sitekey = null;
  }
  const server = http.createServer(async (req, res) => {
    // Bind + peer + exact Host + Origin defend loopback access/DNS rebinding.
    const origin = `http://${acceptedHost}:${server.address().port}`;
    const headers = {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": `default-src 'none'; script-src 'self' https://challenges.cloudflare.com; style-src 'unsafe-inline'; frame-src https://challenges.cloudflare.com; connect-src 'self' http://127.0.0.1:9999 https://challenges.cloudflare.com; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`,
    };
    const reply = (code, value, type = "application/json") => {
      res.writeHead(code, { ...headers, "Content-Type": type });
      res.end(type === "application/json" ? JSON.stringify(value) : value);
    };
    if (
      req.socket.remoteAddress !== "127.0.0.1" ||
      req.headers.host !== new URL(origin).host ||
      (req.headers.origin && req.headers.origin !== origin)
    )
      return reply(403, { status: "LAB_ORIGIN_REJECTED" });
    try {
      if (req.method === "GET" && req.url === "/config") {
        return reply(200, { ...config, attempted: [...attempted] });
      }
      if (req.method === "POST" && req.url === "/attempt") {
        if (req.headers.origin !== origin || config.status === "BLOCKED")
          return reply(403, { status: "LAB_NOT_READY" });
        let body = "";
        for await (const chunk of req) {
          body += chunk.toString();
          if (body.length > 128) {
            reply(413, { status: "LAB_FIELDS_REJECTED" });
            return;
          }
        }
        const item = JSON.parse(body);
        if (Object.keys(item).length !== 1 || !flows.includes(item.flow))
          return reply(400, { status: "LAB_FIELDS_REJECTED" });
        if (attempted.has(item.flow))
          return reply(409, { status: "LAB_ATTEMPT_CONSUMED" });
        await mkdir(markerDir, { recursive: true });
        // Exclusive creation before Auth fetch: accepted/uncertain outcomes may
        // not resend, including across reloads/restarts. No token in this file.
        try {
          await writeFile(
            path.join(markerDir, item.flow + ".json"),
            JSON.stringify({
              flow: item.flow,
              state: "ATTEMPT_CONSUMED_LOCAL_ONLY",
            }),
            { flag: "wx", mode: 0o600 },
          );
        } catch {
          return reply(409, {
            status: "LAB_ATTEMPT_CONSUMED_OR_STORAGE_UNAVAILABLE",
          });
        }
        attempted.add(item.flow);
        return reply(200, { status: "ATTEMPT_CONSUMED_LOCAL_ONLY" });
      }
      if (req.method !== "GET" || !files.has(req.url))
        return reply(404, { status: "NOT_FOUND" });
      const [name, type] = files.get(req.url);
      reply(200, await readFile(new URL(name, import.meta.url)), type);
    } catch {
      reply(400, { status: "LAB_REQUEST_REJECTED" });
    }
  });
  return server;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  let receipt = null;
  try {
    receipt = JSON.parse(
      await readFile(process.env.COMUN_LAB_READY_RECEIPT, "utf8"),
    );
  } catch {
    /* blocked */
  }
  const server = await createLabServer({
    receipt,
    markerDir: process.env.COMUN_LAB_PRIVATE_MARKER_DIR,
  });
  server.listen(9996, "127.0.0.1", () => {
    // Fixed public URL only; no environment, receipt or provider credentials.
    process.stdout.write(
      "COMUN lab interface: http://127.0.0.1:9996 (read /config for sanitized readiness)\n",
    );
  });
}
