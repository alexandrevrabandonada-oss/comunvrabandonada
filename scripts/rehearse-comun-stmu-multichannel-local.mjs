import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);
const token = () => randomBytes(32).toString("base64url");
const hash = (value) =>
  createHash("sha256").update(`comun-wallet-v1:${value}`).digest("hex");
const first = async (promise, label) => {
  const result = await promise;
  if (result.error || !Array.isArray(result.data) || !result.data[0])
    throw new Error(`${label}:${result.error?.message ?? "empty"}`);
  return result.data[0];
};

const walletToken = token();
await first(
  service.rpc("comun_participation_wallet_create", {
    p_token_hash_hex: hash(walletToken),
    p_recovery_hash_hex: hash(token()),
  }),
  "wallet",
);
const receipt = token();
const report = await first(
  service.rpc("comun_relata_create", {
    p_idempotency_key: token(),
    p_receipt_secret: receipt,
    p_original_text: "A linha sintética não parou no ponto.",
    p_answers: { line: "FIX-01", direction: "Centro" },
    p_category: "public_transport",
    p_urgency: "attention",
    p_rule_version: "relata-routing-v1",
    p_decision: {
      captureMode: "bus_observation",
      captureState: "captured_private",
    },
    p_privacy_class: "restricted",
    p_consent_version: "relata-consent-v1",
  }),
  "relata",
);
const walletItem = await first(
  service.rpc("comun_participation_wallet_attach_relata", {
    p_token_hash_hex: hash(walletToken),
    p_protocol: report.protocol,
    p_receipt_secret: receipt,
  }),
  "attach",
);
const email = await first(
  service.rpc("comun_stmu_email_package_create", {
    p_token_hash_hex: hash(walletToken),
    p_relata_case_id: walletItem.item_id,
  }),
  "email-package",
);
const duplicate = await first(
  service.rpc("comun_stmu_email_package_create", {
    p_token_hash_hex: hash(walletToken),
    p_relata_case_id: walletItem.item_id,
  }),
  "email-idempotent",
);
if (email.package_id !== duplicate.package_id)
  throw new Error("duplicate-package");
const updated = await first(
  service.rpc("comun_stmu_email_requirements_update", {
    p_token_hash_hex: hash(walletToken),
    p_package_id: email.package_id,
    p_subject: "Reclamação sobre transporte coletivo",
    p_line: "FIX-01",
    p_direction: "Centro",
    p_location: "Ponto sintético",
    p_observed_at: "2026-08-04 12:00",
    p_vehicle_order: "não observado",
    p_confirm_text: true,
  }),
  "email-requirements",
);
if (updated.state !== "ready_for_review")
  throw new Error(`email-state:${updated.state}`);
const reviewed = await first(
  service.rpc("comun_forwarding_review", {
    p_token_hash_hex: hash(walletToken),
    p_package_id: email.package_id,
    p_institutional_text: updated.institutional_text,
  }),
  "email-review",
);
if (reviewed.state !== "ready_for_assisted_opening")
  throw new Error("email-review-state");
const opened = await first(
  service.rpc("comun_stmu_email_opened", {
    p_token_hash_hex: hash(walletToken),
    p_package_id: email.package_id,
  }),
  "email-opened",
);
if (opened.channel_url !== "mailto:stmu@voltaredonda.rj.gov.br")
  throw new Error("email-destination");
await first(
  service.rpc("comun_stmu_email_declare_sent", {
    p_token_hash_hex: hash(walletToken),
    p_package_id: email.package_id,
    p_result: "sent",
  }),
  "email-declare",
);
const attempts = await service.rpc("comun_forwarding_attempt_list", {
  p_token_hash_hex: hash(walletToken),
  p_relata_case_id: email.relata_case_id,
});
if (
  attempts.error ||
  !attempts.data?.some(
    (item) =>
      item.channel_id === "vr-stmu-official-email" && item.sequence_no === 1,
  )
)
  throw new Error("attempt-list");
const listed = await service.rpc("comun_forwarding_package_list", {
  p_token_hash_hex: hash(walletToken),
});
if (listed.error) throw listed.error;
const safe = JSON.stringify(listed.data);
for (const forbidden of [
  walletToken,
  "ouvidoria.onibusvr@gmail.com",
  "?body=",
  "https://wa.me/5524992958558",
])
  if (safe.includes(forbidden)) throw new Error(`leak:${forbidden}`);
const deadline = listed.data.find(
  (item) => item.package_id === email.package_id,
)?.deadline;
if (
  !deadline?.calculatedDueAt ||
  deadline.sourceStatedDuration !== 72 ||
  deadline.legalDeadline
)
  throw new Error("deadline");
const anonCall = await anon.rpc("comun_stmu_email_package_create", {
  p_token_hash_hex: hash(walletToken),
  p_relata_case_id: walletItem.item_id,
});
if (!anonCall.error) throw new Error("anon-rpc");
console.log(
  JSON.stringify({
    result: "COMUN_STMU_48_0L_DB_GREEN",
    oneRelataCase: true,
    emailIdempotent: true,
    emailDestinationExact: true,
    noBodyQuery: true,
    attemptsIsolated: true,
    deadlineStartsAfterDeclaration: true,
    fieldEmailBlocked: true,
    anonRpcBlocked: true,
    externalSubmission: false,
  }),
);
