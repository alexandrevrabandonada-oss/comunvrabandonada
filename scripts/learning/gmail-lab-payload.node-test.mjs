import test from "node:test";
import assert from "node:assert/strict";
import { prepareGmailLabPayload } from "./gmail-lab-payload.mjs";
const message = () => ({
  recipient: "alexandrevrabandonada@gmail.com",
  subject: "You have been invited",
  url: "http://127.0.0.1:9999/verify?token=synthetic&type=invite",
  html: '<a href="http://127.0.0.1:9999/verify?token=synthetic&amp;type=invite">Accept</a>',
});
test("preserves Auth HTML and subject in the nominal connected account", () => {
  const m = message(),
    p = prepareGmailLabPayload(m);
  assert.equal(p.payload.body.content, m.html);
  assert.equal(p.subject, m.subject);
  assert.equal(p.to, p.from_address);
  assert.equal(p.link_id, "link_68e6e743d1fc8191bb5a7c92c6b25435");
  assert.deepEqual(Object.keys(p).sort(), [
    "from_address",
    "link_id",
    "payload",
    "response_fields",
    "subject",
    "to",
  ]);
});
test("recipient substitution and arbitrary headers cannot reach a send payload", () => {
  assert.throws(() =>
    prepareGmailLabPayload({
      ...message(),
      recipient: "other@example.invalid",
    }),
  );
  assert.throws(() =>
    prepareGmailLabPayload({ ...message(), bcc: "other@example.invalid" }),
  );
});
test("Production URL, tracking and subject injection remain blocked", () => {
  assert.throws(() =>
    prepareGmailLabPayload({
      ...message(),
      url: "https://production.invalid/verify",
    }),
  );
  assert.throws(() =>
    prepareGmailLabPayload({
      ...message(),
      html: message().html + '<img src="https://tracking.invalid/pixel">',
    }),
  );
  assert.throws(() =>
    prepareGmailLabPayload({ ...message(), subject: "Invite\r\nBcc: third" }),
  );
});
