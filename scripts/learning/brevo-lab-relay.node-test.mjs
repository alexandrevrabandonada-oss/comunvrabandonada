import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  prepareLabPayload,
  submitLabOnce,
  labRecipient,
  decodeLabAuthMessage,
} from "./brevo-lab-relay.mjs";
const hash = (v) => createHash("sha256").update(v).digest("hex");
const message = () => ({
  subject: "You have been invited",
  recipient: labRecipient,
  url: "http://127.0.0.1:9999/verify?type=invite&token=synthetic",
  html: '<p>Invite</p><a href="http://127.0.0.1:9999/verify?type=invite&amp;token=synthetic">Accept</a>',
});
const approval = (m) => ({
  id: "local-contract-test",
  operation: "ONE_BREVO_API_SYNTHETIC_AUTH_INVITE",
  source: "EXPLICIT_HUMAN_OPERATION_APPROVAL",
  recipient: labRecipient,
  maxMessages: 1,
  cost: 0,
  expiresAt: new Date(Date.now() + 60000).toISOString(),
  subjectSha256: hash(m.subject),
  urlSha256: hash(m.url),
  payloadSha256: hash(JSON.stringify(prepareLabPayload(m))),
});
const key = "xkeysib-synthetic-not-a-real-key";
const mime = () =>
  Buffer.from(
    "To: " +
      labRecipient +
      "\r\nSubject: You have been invited\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n" +
      message().html.replace(/=/g, "=3D"),
  );
test("Auth single-part MIME decoder preserves the local confirmation link", () => {
  const decoded = decodeLabAuthMessage(mime());
  assert.equal(decoded.url, message().url);
  assert.deepEqual(prepareLabPayload(decoded), prepareLabPayload(message()));
});
test("multipart, encoded subject, duplicate header and copied recipient block", () => {
  for (const raw of [
    mime().toString().replace("text/html; charset=UTF-8", "multipart/mixed"),
    mime()
      .toString()
      .replace("Subject: You have been invited", "Subject: =?UTF-8?B?YWJj?="),
    mime()
      .toString()
      .replace("Subject:", "To: " + labRecipient + "\r\nSubject:"),
    mime()
      .toString()
      .replace(
        "To: " + labRecipient,
        "To: " + labRecipient + "\r\nCc: other@example.invalid",
      ),
  ])
    assert.throws(() => decodeLabAuthMessage(Buffer.from(raw)));
});
async function isolated(fn) {
  const root = await mkdtemp(
    process.platform === "win32"
      ? "E:/COMUN-ESCOLA-RECOVERY-20261009/relay-contract-"
      : path.join(tmpdir(), "comun-school-lab-contract-"),
  );
  try {
    await fn(root);
  } finally {
    for (const name of await readdir(root)) await unlink(root + "/" + name);
    await rmdir(root);
  }
}
test("payload has one recipient with tracking false and no attachments/campaign/cc", () => {
  const p = prepareLabPayload(message());
  assert.deepEqual(Object.keys(p).sort(), [
    "htmlContent",
    "sender",
    "subject",
    "to",
  ]);
  assert.deepEqual(p.to, [
    { email: labRecipient, contactPixelTrackingConsent: false },
  ]);
});
for (const [name, edit] of [
  [
    "extra recipient",
    (m) => {
      m.recipient = "other@example.invalid";
    },
  ],
  [
    "extra field",
    (m) => {
      m.cc = [labRecipient];
    },
  ],
  [
    "masked subject",
    (m) => {
      m.subject = "<redacted>";
    },
  ],
  [
    "header injection",
    (m) => {
      m.subject = "Invite\r\nBcc: other";
    },
  ],
  [
    "Production URL",
    (m) => {
      m.url = "https://source.invalid/verify";
    },
  ],
  [
    "tracking pixel",
    (m) => {
      m.html += '<img src="https://tracking.invalid/p">';
    },
  ],
  [
    "rewritten URL",
    (m) => {
      m.html = m.html.replace(
        "http://127.0.0.1:9999/verify",
        "https://tracking.invalid/verify",
      );
    },
  ],
  [
    "duplicate link",
    (m) => {
      m.html += m.html;
    },
  ],
  [
    "token mutation",
    (m) => {
      m.html = m.html.replace("token=synthetic", "token=changed");
    },
  ],
])
  test(name + " blocks before network", () => {
    const m = message();
    edit(m);
    assert.throws(() => prepareLabPayload(m));
  });
test("accepted submission cannot replay and fixed endpoint forbids redirects", async () =>
  isolated(async (root) => {
    const m = message(),
      a = approval(m);
    let calls = 0;
    const f = async (url, o) => {
      calls++;
      assert.equal(url, "https://api.brevo.com/v3/smtp/email");
      assert.equal(o.redirect, "error");
      assert.equal(JSON.parse(o.body).to[0].contactPixelTrackingConsent, false);
      return {
        status: 201,
        json: async () => ({ messageId: "<synthetic@invalid>" }),
      };
    };
    assert.equal(
      (
        await submitLabOnce({
          message: m,
          approval: a,
          apiKey: key,
          privateRoot: root,
          fetchImpl: f,
        })
      ).status,
      "ACCEPTED_AWAITING_RECEIPT",
    );
    await assert.rejects(
      submitLabOnce({
        message: m,
        approval: a,
        apiKey: key,
        privateRoot: root,
        fetchImpl: f,
      }),
      { code: "EEXIST" },
    );
    assert.equal(calls, 1);
  }));
test("independent simultaneous submissions send once", async () =>
  isolated(async (root) => {
    const m = message();
    let calls = 0;
    const opts = {
      message: m,
      approval: approval(m),
      apiKey: key,
      privateRoot: root,
      fetchImpl: async () => {
        calls++;
        return {
          status: 201,
          json: async () => ({ messageId: "<synthetic@invalid>" }),
        };
      },
    };
    const results = await Promise.allSettled([
      submitLabOnce(opts),
      submitLabOnce(opts),
    ]);
    assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
    assert.equal(calls, 1);
  }));
for (const mode of ["timeout", "http-error", "invalid-response"])
  test(mode + " consumes attempt without retry", async () =>
    isolated(async (root) => {
      const m = message();
      let calls = 0;
      const opts = {
        message: m,
        approval: approval(m),
        apiKey: key,
        privateRoot: root,
        fetchImpl: async () => {
          calls++;
          if (mode === "timeout") throw Error("secret must not escape");
          return {
            status: mode === "http-error" ? 503 : 201,
            json: async () => ({}),
          };
        },
      };
      const result = await submitLabOnce(opts);
      assert.equal(result.status, "BLOCKED");
      assert.equal(result.retryAllowed, false);
      assert.ok(!JSON.stringify(result).includes("secret"));
      await assert.rejects(submitLabOnce(opts), { code: "EEXIST" });
      assert.equal(calls, 1);
    }),
  );
test("missing/expired approval, drift, and SMTP key never call provider", async () =>
  isolated(async (root) => {
    const m = message();
    let calls = 0;
    const base = {
      message: m,
      apiKey: key,
      privateRoot: root,
      fetchImpl: async () => {
        calls++;
        throw Error();
      },
    };
    for (const a of [
      {},
      { ...approval(m), expiresAt: "2000-01-01" },
      { ...approval(m), urlSha256: hash("changed") },
      { ...approval(m), payloadSha256: hash("changed") },
      { ...approval(m), maxMessages: 2 },
    ])
      await assert.rejects(submitLabOnce({ ...base, approval: a }));
    await assert.rejects(
      submitLabOnce({
        ...base,
        approval: approval(m),
        apiKey: "xsmtpsib-synthetic",
      }),
    );
    assert.equal(calls, 0);
    assert.deepEqual(await readdir(root), []);
  }));
