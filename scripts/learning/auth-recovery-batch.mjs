import assert from "node:assert/strict";

// Pure preparation only. No send, credentials, Production or token consumption.
// The private coordinator must persist a per-message one-use marker BEFORE send.
export const recoveryBatch = Object.freeze({
  sender: "alexandrevrabandonada@gmail.com",
  a: "alexandrevrabandonada+comun-escola-lab-a@gmail.com",
  b: "alexandrevrabandonada+comun-escola-lab-b@gmail.com",
  maximum: 6,
});
const limits = Object.freeze({
  signup: 1,
  recovery: 1,
  magiclink: 1,
  email_change: 2,
  reauthentication: 1,
});
const types = Object.freeze({
  signup: "signup",
  recovery: "recovery",
  magiclink: "magiclink",
  email_change: "email_change",
});

export function prepareRecoveryBatch(messages) {
  assert.ok(
    Array.isArray(messages) &&
      messages.length > 0 &&
      messages.length <= recoveryBatch.maximum,
    "AUTH_BATCH_COUNT_REJECTED",
  );
  const counts = {},
    recipientsByFlow = new Set();
  return messages.map((message) => {
    assert.deepEqual(
      Object.keys(message).sort(),
      [
        "expectedCode",
        "expectedSubject",
        "expectedUrl",
        "flow",
        "html",
        "recipient",
        "subject",
      ],
      "AUTH_BATCH_FIELDS_REJECTED",
    );
    const {
      flow,
      subject,
      expectedSubject,
      recipient,
      html,
      expectedUrl,
      expectedCode,
    } = message;
    assert.ok(Object.hasOwn(limits, flow), "AUTH_BATCH_FLOW_REJECTED");
    counts[flow] = (counts[flow] ?? 0) + 1;
    assert.ok(counts[flow] <= limits[flow], "AUTH_BATCH_FLOW_LIMIT_REJECTED");
    assert.ok(
      (flow === "email_change" &&
        [recoveryBatch.a, recoveryBatch.b].includes(recipient)) ||
        (flow === "reauthentication" && recipient === recoveryBatch.b) ||
        (!["email_change", "reauthentication"].includes(flow) &&
          recipient === recoveryBatch.a),
      "AUTH_BATCH_RECIPIENT_REJECTED",
    );
    const key = flow + ":" + recipient;
    assert.ok(!recipientsByFlow.has(key), "AUTH_BATCH_DUPLICATE_REJECTED");
    recipientsByFlow.add(key);
    assert.ok(
      typeof expectedSubject === "string" &&
        expectedSubject.length > 0 &&
        expectedSubject.length <= 200 &&
        !/[\r\n]|redacted|masked|placeholder|^[*•]+$/i.test(expectedSubject),
      "AUTH_BATCH_SOURCE_SUBJECT_REQUIRED",
    );
    assert.equal(subject, expectedSubject, "AUTH_BATCH_SUBJECT_DRIFT");
    assert.ok(
      typeof html === "string" &&
        Buffer.byteLength(html) <= 32768 &&
        !/<(?:img|script|iframe|object|embed|link|style|base)\b|\b(?:src|srcset|style|on\w+)\s*=|url\s*\(|\{\{/i.test(
          html,
        ),
      "AUTH_BATCH_HTML_REJECTED",
    );
    const links = [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)];
    if (expectedUrl !== null) {
      assert.equal(expectedCode, null, "AUTH_BATCH_MIXED_TOKEN_REJECTED");
      assert.equal(links.length, 1, "AUTH_BATCH_LINK_COUNT_REJECTED");
      assert.equal(
        links[0][2].replace(/&amp;/g, "&"),
        expectedUrl,
        "AUTH_BATCH_TOKEN_DRIFT",
      );
      const url = new URL(expectedUrl);
      assert.ok(
        url.origin === "http://127.0.0.1:9999" &&
          url.pathname === "/verify" &&
          !url.username &&
          !url.password &&
          url.searchParams.get("type") === types[flow],
        "AUTH_BATCH_DESTINATION_REJECTED",
      );
      // Any other remote URL/resource is forbidden, including a tracking wrapper.
      assert.equal(
        (html.match(/https?:\/\//g) ?? []).length,
        1,
        "AUTH_BATCH_REMOTE_RESOURCE_REJECTED",
      );
    } else {
      assert.ok(
        ["magiclink", "reauthentication"].includes(flow),
        "AUTH_BATCH_OTP_FLOW_REJECTED",
      );
      assert.equal(links.length, 0, "AUTH_BATCH_OTP_LINK_REJECTED");
      assert.ok(
        typeof expectedCode === "string" && /^\d{6,10}$/.test(expectedCode),
        "AUTH_BATCH_CODE_REQUIRED",
      );
      assert.ok(
        !/https?:\/\//i.test(html),
        "AUTH_BATCH_REMOTE_RESOURCE_REJECTED",
      );
      assert.equal(
        (html.match(new RegExp(`(?<!\\d)${expectedCode}(?!\\d)`, "g")) ?? [])
          .length,
        1,
        "AUTH_BATCH_CODE_DRIFT",
      );
    }
    return { from: recoveryBatch.sender, to: recipient, subject, html };
  });
}
