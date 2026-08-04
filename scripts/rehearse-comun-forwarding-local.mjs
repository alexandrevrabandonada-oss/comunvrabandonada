import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = process.env;
const service = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const anon = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const token = () => randomBytes(32).toString("base64url");
const hash = (value) =>
  createHash("sha256").update(`comun-wallet-v1:${value}`).digest("hex");
const recovery = () =>
  `${randomBytes(24).toString("hex").slice(0, 4)}-${randomBytes(24).toString("hex").slice(0, 4)}-${randomBytes(24).toString("hex").slice(0, 4)}-${randomBytes(24).toString("hex").slice(0, 4)}-${randomBytes(24).toString("hex").slice(0, 4)}-${randomBytes(24).toString("hex").slice(0, 4)}`.toUpperCase();

const first = async (promise, label) => {
  const { data, error } = await promise;
  if (error || !Array.isArray(data) || !data[0])
    throw new Error(`${label}:${error?.message ?? "empty"}`);
  return data[0];
};

const observations = await service.rpc("comun_forwarding_observation_list", {
  p_channel_id: "vr-fiscaliza-web",
});
if (observations.error || !observations.data?.length)
  throw new Error("fiscaliza operational observation missing");
const sourceRecords = await service.rpc("comun_forwarding_source_reconciliation");
if (sourceRecords.error || sourceRecords.data.length !== 3)
  throw new Error("fiscaliza source reconciliation missing");
const general = sourceRecords.data.find((row) => row.source_kind === "current_general");
const lighting = sourceRecords.data.find((row) => row.source_kind === "current_specific_service");
const historical = sourceRecords.data.find((row) => row.source_kind === "historical_source");
if (general.deadline_value !== null || lighting.deadline_value !== 30 || lighting.deadline_unit !== "days" || historical.deadline_value !== 48 || historical.included_in_due_calculation)
  throw new Error("fiscaliza deadline reconciliation failed");

const walletToken = token();
await first(
  service.rpc("comun_participation_wallet_create", {
    p_token_hash_hex: hash(walletToken),
    p_recovery_hash_hex: hash(recovery()),
  }),
  "wallet-create",
);
const receiptSecret = token();
const relata = await first(
  service.rpc("comun_relata_create", {
    p_idempotency_key: token(),
    p_receipt_secret: receiptSecret,
    p_original_text: "A luminária da rua está apagada há vários dias.",
    p_answers: {},
    p_category: "public_lighting",
    p_urgency: "attention",
    p_rule_version: "relata-routing-v1",
    p_decision: { captureMode: "quick_v2", captureState: "captured_private" },
    p_privacy_class: "restricted",
    p_consent_version: "relata-consent-v1",
  }),
  "relata-create",
);
await first(
  service.rpc("comun_participation_wallet_attach_relata", {
    p_token_hash_hex: hash(walletToken),
    p_protocol: relata.protocol,
    p_receipt_secret: receiptSecret,
  }),
  "wallet-attach",
);
const walletItems = await service.rpc("comun_participation_wallet_list", {
  p_token_hash_hex: hash(walletToken),
});
if (walletItems.error)
  throw new Error(`wallet-list:${walletItems.error.message}`);
const walletItem = walletItems.data.find(
  (item) => item.item_type === "relata_report",
);
if (!walletItem) throw new Error("relata wallet item missing");

const created = await first(
  service.rpc("comun_forwarding_package_create", {
    p_token_hash_hex: hash(walletToken),
    p_relata_case_id: walletItem.item_id,
    p_adapter_id: "vr-fiscaliza-lighting-v1",
  }),
  "package-create",
);
if (created.state !== "missing_information" || !created.relata_case_id)
  throw new Error("package did not resolve wallet item");
const duplicate = await first(
  service.rpc("comun_forwarding_package_create", {
    p_token_hash_hex: hash(walletToken),
    p_relata_case_id: walletItem.item_id,
    p_adapter_id: "vr-fiscaliza-lighting-v1",
  }),
  "package-idempotent",
);
if (duplicate.package_id !== created.package_id)
  throw new Error("package duplicate");

const updated = await first(
  service.rpc("comun_forwarding_requirements_update", {
    p_token_hash_hex: hash(walletToken),
    p_package_id: created.package_id,
    p_location_reference: "Rua sintética, bairro piloto",
    p_contact: "contato-sintetico@example.invalid",
    p_confirm_text: true,
  }),
  "requirements",
);
if (updated.state !== "ready_for_review")
  throw new Error("requirements not satisfied");
const reviewed = await first(
  service.rpc("comun_forwarding_review", {
    p_token_hash_hex: hash(walletToken),
    p_package_id: created.package_id,
    p_institutional_text:
      "Mensagem sintética revisada pela pessoa para o Fiscaliza VR.",
  }),
  "review",
);
if (reviewed.state !== "ready_for_assisted_opening")
  throw new Error("review failed");
const opened = await first(
  service.rpc("comun_forwarding_opened", {
    p_token_hash_hex: hash(walletToken),
    p_package_id: created.package_id,
  }),
  "opened",
);
if (
  opened.state !== "opened_by_person" ||
  !opened.channel_url.startsWith("https://www.voltaredonda.rj.gov.br/")
)
  throw new Error("official channel contract failed");
await first(
  service.rpc("comun_forwarding_declare_sent", {
    p_token_hash_hex: hash(walletToken),
    p_package_id: created.package_id,
    p_result: "sent",
  }),
  "declare-sent",
);
const protocol = await first(
  service.rpc("comun_forwarding_record_official_protocol", {
    p_token_hash_hex: hash(walletToken),
    p_package_id: created.package_id,
    p_protocol: "FISCALIZA-SINTETICO-001",
  }),
  "official-protocol",
);
const protocolDuplicate = await first(
  service.rpc("comun_forwarding_record_official_protocol", {
    p_token_hash_hex: hash(walletToken),
    p_package_id: created.package_id,
    p_protocol: "FISCALIZA-SINTETICO-CHANGED",
  }),
  "official-protocol-idempotent",
);
if (protocol.protocol_masked !== protocolDuplicate.protocol_masked)
  throw new Error("official protocol changed silently");
await first(
  service.rpc("comun_forwarding_record_response", {
    p_token_hash_hex: hash(walletToken),
    p_package_id: created.package_id,
    p_note: "Resposta sintética registrada",
    p_state: "response_recorded",
  }),
  "response",
);

const listed = await service.rpc("comun_forwarding_package_list", {
  p_token_hash_hex: hash(walletToken),
});
if (listed.error || listed.data.length !== 1)
  throw new Error("package list failed");
const safe = JSON.stringify(listed.data);
for (const forbidden of [
  "contato-sintetico",
  "FISCALIZA-SINTETICO-001",
  receiptSecret,
  walletToken,
])
  if (safe.includes(forbidden))
    throw new Error("private forwarding data leaked");
const otherToken = token();
await first(
  service.rpc("comun_participation_wallet_create", {
    p_token_hash_hex: hash(otherToken),
    p_recovery_hash_hex: hash(recovery()),
  }),
  "other-wallet",
);
const cross = await service.rpc("comun_forwarding_package_list", {
  p_token_hash_hex: hash(otherToken),
});
if (cross.error || cross.data.length !== 0)
  throw new Error("cross-wallet forwarding access");
const anonCall = await anon.rpc("comun_forwarding_package_list", {
  p_token_hash_hex: hash(walletToken),
});
if (!anonCall.error) throw new Error("anon forwarding RPC allowed");
const withdrawn = await service.rpc("comun_forwarding_withdraw", {
  p_token_hash_hex: hash(walletToken),
  p_package_id: created.package_id,
});
if (
  withdrawn.error ||
  !(withdrawn.data === true || withdrawn.data?.[0] === true)
)
  throw new Error("withdraw failed");

console.log(
  JSON.stringify({
    result: "COMUN_FORWARDING_48_0H_DB_GREEN",
    adapter: "vr-fiscaliza-lighting-v1",
    sourceVerified: true,
    operationallyUnchecked: true,
    observationState: observations.data[0].state,
    sourceReconciliation: { general: "not_stated", lighting: "30 days estimate", historical2019: "48 hours excluded" },
    automationAllowed: false,
    packageIdempotent: true,
    protocolImmutable: true,
    privateContactOmitted: true,
    crossWalletBlocked: true,
    anonRpcBlocked: true,
    withdrawal: true,
  }),
);
