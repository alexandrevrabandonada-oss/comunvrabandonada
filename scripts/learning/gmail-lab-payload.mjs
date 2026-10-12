import assert from "node:assert/strict";
import { prepareLabPayload, labRecipient } from "./brevo-lab-relay.mjs";

// Connector adapter only: no send, credential or permission discovery.
// The private coordinator must consume an operation-specific durable marker
// before calling Gmail. A connector session is not an exported recovery secret.
export function prepareGmailLabPayload(message) {
  const checked = prepareLabPayload(message);
  assert.equal(checked.to.length, 1);
  return {
    link_id: "link_68e6e743d1fc8191bb5a7c92c6b25435",
    from_address: labRecipient,
    to: labRecipient,
    subject: checked.subject,
    payload: {
      mime_type: "text/html",
      charset: "UTF-8",
      content_disposition: "inline",
      body: { content: checked.htmlContent },
    },
    response_fields: ["id", "thread_id", "label_ids"],
  };
}
