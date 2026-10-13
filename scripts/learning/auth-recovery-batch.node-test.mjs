import test from "node:test";
import assert from "node:assert/strict";
import { prepareRecoveryBatch, recoveryBatch } from "./auth-recovery-batch.mjs";

const link = (flow, recipient = recoveryBatch.a) => {
  const url = `http://127.0.0.1:9999/verify?token=synthetic-${flow}&type=${flow}`;
  return {
    flow,
    recipient,
    subject: "Synthetic subject",
    expectedSubject: "Synthetic subject",
    html: `<a href="${url}">Confirmar</a>`,
    expectedUrl: url,
    expectedCode: null,
  };
};
const otp = () => ({
  flow: "reauthentication",
  recipient: recoveryBatch.b,
  subject: "Synthetic code",
  expectedSubject: "Synthetic code",
  html: "<p>Código: 123456</p>",
  expectedCode: "123456",
  expectedUrl: null,
});
test("whole nominal batch preserves five flows and at most six messages", () => {
  const messages = [
    link("signup"),
    link("recovery"),
    link("magiclink"),
    link("email_change"),
    link("email_change", recoveryBatch.b),
    otp(),
  ];
  assert.equal(prepareRecoveryBatch(messages).length, 6);
  assert.equal(prepareRecoveryBatch(messages)[5].html, "<p>Código: 123456</p>");
  assert.throws(
    () => prepareRecoveryBatch([...messages, otp()]),
    /COUNT_REJECTED/,
  );
});
test("extra recipient, duplicate recipient and flow replay are refused", () => {
  assert.throws(
    () => prepareRecoveryBatch([link("signup", "other@example.org")]),
    /RECIPIENT_REJECTED/,
  );
  assert.throws(
    () => prepareRecoveryBatch([link("email_change"), link("email_change")]),
    /DUPLICATE_REJECTED/,
  );
  assert.throws(
    () => prepareRecoveryBatch([link("signup"), link("signup")]),
    /FLOW_LIMIT_REJECTED/,
  );
});
test("masked or changed Source subjects never become defaults", () => {
  assert.throws(
    () => prepareRecoveryBatch([{ ...otp(), expectedSubject: "<redacted>" }]),
    /SOURCE_SUBJECT_REQUIRED/,
  );
  assert.throws(
    () => prepareRecoveryBatch([{ ...otp(), subject: "Changed" }]),
    /SUBJECT_DRIFT/,
  );
});
test("tracking, Production URL and mutated token fail closed", () => {
  assert.throws(
    () =>
      prepareRecoveryBatch([
        {
          ...link("signup"),
          html: link("signup").html + "<a href=javascript:alert(1)>Extra</a>",
        },
      ]),
    /UNREVIEWED_ANCHOR_REJECTED/,
  );
  assert.throws(
    () =>
      prepareRecoveryBatch([
        {
          ...link("signup"),
          html:
            link("signup").html + '<img src="https://tracking.example/pixel">',
        },
      ]),
    /HTML_REJECTED/,
  );
  const url = "https://production.example/verify?type=signup";
  assert.throws(
    () =>
      prepareRecoveryBatch([
        {
          ...link("signup"),
          html: `<a href="${url}">Open</a>`,
          expectedUrl: url,
        },
      ]),
    /DESTINATION_REJECTED/,
  );
  assert.throws(
    () =>
      prepareRecoveryBatch([
        {
          ...link("signup"),
          html: '<a href="http://127.0.0.1:9999/verify?token=changed&type=signup">Open</a>',
        },
      ]),
    /TOKEN_DRIFT/,
  );
});
test("OTP has exact code once, no hidden links or arbitrary template fields", () => {
  assert.throws(
    () => prepareRecoveryBatch([{ ...otp(), html: "<p>654321</p>" }]),
    /CODE_DRIFT/,
  );
  assert.throws(
    () => prepareRecoveryBatch([{ ...otp(), html: "123456 123456" }]),
    /CODE_DRIFT/,
  );
  assert.throws(
    () =>
      prepareRecoveryBatch([
        { ...otp(), html: '123456<a href="https://tracking.example">Open</a>' },
      ]),
    /OTP_LINK_REJECTED/,
  );
  assert.throws(
    () => prepareRecoveryBatch([{ ...otp(), cc: "other@example.org" }]),
    /FIELDS_REJECTED/,
  );
});
