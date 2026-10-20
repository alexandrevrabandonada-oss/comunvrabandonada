import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { open, realpath, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const labRecipient = "alexandrevrabandonada@gmail.com";
const hash = (value) => createHash("sha256").update(value).digest("hex");

// Fail closed for MIME formats not emitted by the reviewed single-part fixture.
// This decoder never renders HTML or requests any URLs.
export function decodeLabAuthMessage(raw) {
  assert.ok(
    Buffer.isBuffer(raw) && raw.length <= 65536,
    "LAB_MIME_SIZE_REJECTED",
  );
  const source = raw.toString("utf8");
  const boundary = source.indexOf("\r\n\r\n");
  assert.ok(boundary > 0, "LAB_MIME_HEADERS_REQUIRED");
  const headers = new Map();
  for (const line of source
    .slice(0, boundary)
    .replace(/\r\n[ \t]+/g, " ")
    .split("\r\n")) {
    const index = line.indexOf(":");
    assert.ok(index > 0, "LAB_MIME_HEADER_INVALID");
    const name = line.slice(0, index).toLowerCase();
    assert.ok(!headers.has(name), "LAB_MIME_DUPLICATE_HEADER");
    headers.set(name, line.slice(index + 1).trim());
  }
  assert.match(
    headers.get("content-type") ?? "",
    /^text\/html(?:;\s*charset="?utf-8"?)?$/i,
    "LAB_MIME_TYPE_UNSUPPORTED",
  );
  assert.equal(
    headers.get("content-transfer-encoding")?.toLowerCase(),
    "quoted-printable",
    "LAB_MIME_ENCODING_UNSUPPORTED",
  );
  assert.equal(headers.get("to"), labRecipient, "LAB_MIME_RECIPIENT_REJECTED");
  assert.ok(
    !headers.has("cc") && !headers.has("bcc"),
    "LAB_MIME_EXTRA_RECIPIENT_REJECTED",
  );
  const encoded = source.slice(boundary + 4).replace(/=\r\n/g, "");
  assert.ok(!/=(?![a-f0-9]{2})/i.test(encoded), "LAB_MIME_QP_INVALID");
  const chunks = encoded
    .split(/(=[a-f0-9]{2})/i)
    .map((value) =>
      /^=[a-f0-9]{2}$/i.test(value)
        ? Buffer.from([parseInt(value.slice(1), 16)])
        : Buffer.from(value, "utf8"),
    );
  const html = new TextDecoder("utf-8", { fatal: true }).decode(
    Buffer.concat(chunks),
  );
  const subject = headers.get("subject");
  assert.ok(
    subject && !/=\?/.test(subject),
    "LAB_MIME_ENCODED_SUBJECT_UNSUPPORTED",
  );
  const links = [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)];
  assert.equal(links.length, 1, "LAB_LINK_COUNT_REJECTED");
  const message = {
    subject,
    recipient: labRecipient,
    html,
    url: links[0][2].replace(/&amp;/gi, "&"),
  };
  prepareLabPayload(message);
  return message;
}

// Decoded message from the synthetic Auth SMTP sink, never a restored real user.
// No listener, CLI, Production credential discovery or automatic retry.
export function prepareLabPayload(message) {
  assert.deepEqual(
    Object.keys(message).sort(),
    ["html", "recipient", "subject", "url"],
    "LAB_MESSAGE_FIELDS_REJECTED",
  );
  assert.equal(message.recipient, labRecipient, "LAB_RECIPIENT_REJECTED");
  assert.ok(
    typeof message.subject === "string" &&
      message.subject.length <= 200 &&
      !/[\r\n]|redacted|masked|placeholder/i.test(message.subject),
    "LAB_SUBJECT_REJECTED",
  );
  assert.ok(
    typeof message.html === "string" &&
      Buffer.byteLength(message.html) <= 32768,
    "LAB_HTML_REJECTED",
  );
  const url = new URL(message.url);
  assert.ok(
    url.origin === "http://127.0.0.1:9999" &&
      url.pathname === "/verify" &&
      !url.username &&
      !url.password,
    "LAB_AUTH_URL_REQUIRED",
  );
  assert.ok(
    !/<(?:img|iframe|script|link|object|embed)\b|\b(?:src|srcset|background)\s*=|url\s*\(/i.test(
      message.html,
    ),
    "LAB_REMOTE_CONTENT_REJECTED",
  );
  const links = [
    ...message.html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi),
  ];
  assert.equal(links.length, 1, "LAB_LINK_COUNT_REJECTED");
  assert.equal(
    links[0][2].replace(/&amp;/gi, "&"),
    message.url,
    "LAB_LINK_DRIFT",
  );
  assert.equal(
    (message.html.match(/<a\b/gi) || []).length,
    1,
    "LAB_ANCHOR_FORMAT_REJECTED",
  );
  return {
    sender: { email: labRecipient, name: "COMUN isolated recovery" },
    to: [{ email: labRecipient, contactPixelTrackingConsent: false }],
    subject: message.subject,
    htmlContent: message.html,
  };
}

export async function submitLabOnce({
  message,
  approval,
  apiKey,
  privateRoot,
  fetchImpl = fetch,
}) {
  const payload = prepareLabPayload(message);
  assert.deepEqual(
    Object.keys(approval).sort(),
    [
      "cost",
      "expiresAt",
      "id",
      "maxMessages",
      "operation",
      "payloadSha256",
      "recipient",
      "source",
      "subjectSha256",
      "urlSha256",
    ],
    "LAB_APPROVAL_FIELDS_REJECTED",
  );
  assert.equal(approval.operation, "ONE_BREVO_API_SYNTHETIC_AUTH_INVITE");
  assert.equal(approval.source, "EXPLICIT_HUMAN_OPERATION_APPROVAL");
  assert.equal(approval.recipient, labRecipient);
  assert.equal(approval.maxMessages, 1);
  assert.equal(approval.cost, 0);
  assert.match(approval.id, /^[a-z0-9-]{8,80}$/);
  assert.equal(approval.subjectSha256, hash(message.subject));
  assert.equal(approval.urlSha256, hash(message.url));
  assert.equal(approval.payloadSha256, hash(JSON.stringify(payload)));
  assert.ok(
    Date.parse(approval.expiresAt) > Date.now(),
    "LAB_APPROVAL_EXPIRED",
  );
  assert.ok(
    typeof apiKey === "string" && /^xkeysib-[a-zA-Z0-9-]+$/.test(apiKey),
    "LAB_API_KEY_REQUIRED_NOT_SMTP",
  );
  const root = await realpath(privateRoot);
  const metadata = await stat(root);
  const ephemeralOwnedLab =
    process.platform !== "win32" &&
    path.dirname(root) === (await realpath(tmpdir())) &&
    /^comun-school-lab-[a-zA-Z0-9-]+$/.test(path.basename(root)) &&
    metadata.uid === process.getuid() &&
    (metadata.mode & 0o077) === 0;
  assert.ok(
    /^E:[\\/]COMUN-ESCOLA-RECOVERY-20261009(?:[\\/]|$)/i.test(root) ||
      ephemeralOwnedLab,
    "LAB_PRIVATE_ROOT_REQUIRED",
  );
  const marker = await open(
    path.join(root, `brevo-api-${approval.id}.consumed.json`),
    "wx",
    0o600,
  );
  try {
    await marker.writeFile(
      JSON.stringify({
        id: approval.id,
        state: "ATTEMPT_CONSUMED",
        payloadSha256: hash(JSON.stringify(payload)),
        at: new Date().toISOString(),
      }) + "\n",
    );
    await marker.sync();
  } finally {
    await marker.close();
  }
  // Persistent marker is consumed before network access, including timeout/failure.
  try {
    const response = await fetchImpl("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (response.status !== 201)
      return {
        status: "BLOCKED",
        marker: "BREVO_API_NOT_ACCEPTED",
        http: response.status,
        retryAllowed: false,
      };
    const result = await response.json();
    if (
      typeof result.messageId !== "string" ||
      result.messageId.length > 300 ||
      /[\r\n]/.test(result.messageId)
    )
      return {
        status: "BLOCKED",
        marker: "BREVO_API_RESPONSE_INVALID",
        retryAllowed: false,
      };
    return {
      status: "ACCEPTED_AWAITING_RECEIPT",
      messageId: result.messageId,
      retryAllowed: false,
      productionWrites: 0,
    };
  } catch {
    return {
      status: "BLOCKED",
      marker: "BREVO_API_SUBMISSION_UNCERTAIN",
      retryAllowed: false,
    };
  }
}
