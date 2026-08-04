import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = process.env;
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const token = () => randomBytes(32).toString("base64url");
const hash = (value) => createHash("sha256").update(`comun-wallet-v1:${value}`).digest("hex");
const recovery = () => `${randomBytes(24).toString("hex").slice(0, 4)}-${randomBytes(24).toString("hex").slice(0, 4)}-${randomBytes(24).toString("hex").slice(0, 4)}-${randomBytes(24).toString("hex").slice(0, 4)}-${randomBytes(24).toString("hex").slice(0, 4)}-${randomBytes(24).toString("hex").slice(0, 4)}`.toUpperCase();

const first = async (promise, label) => {
  const { data, error } = await promise;
  if (error || !Array.isArray(data) || !data[0]) throw new Error(`${label}:${error?.message ?? "empty"}`);
  return data[0];
};

const walletToken = token();
const walletRecovery = recovery();
await first(service.rpc("comun_participation_wallet_create", { p_token_hash_hex: hash(walletToken), p_recovery_hash_hex: hash(walletRecovery) }), "create");
const empty = await service.rpc("comun_participation_wallet_list", { p_token_hash_hex: hash(walletToken) });
if (empty.error || empty.data?.length) throw new Error("new wallet not empty");

const legacy = await first(service.rpc("comun_participation_wallet_follow_legacy", { p_token_hash_hex: hash(walletToken), p_protocol: "COMUN-20260804-123456" }), "legacy");
const idempotentLegacy = await first(service.rpc("comun_participation_wallet_follow_legacy", { p_token_hash_hex: hash(walletToken), p_protocol: "COMUN-20260804-123456" }), "legacy-idempotent");
if (legacy.item_id !== idempotentLegacy.item_id) throw new Error("legacy duplicate");

const receiptSecret = token();
const relata = await first(service.rpc("comun_relata_create", {
  p_idempotency_key: token(), p_receipt_secret: receiptSecret, p_original_text: "a calçada está totalmente bloqueada por entulho", p_answers: {}, p_category: "sidewalk_accessibility", p_urgency: "attention", p_rule_version: "relata-routing-v1", p_decision: { captureMode: "quick_v2", captureState: "captured_private" }, p_privacy_class: "never_automatic" === "never_automatic" ? "restricted" : "restricted", p_consent_version: "relata-consent-v1",
}), "relata-create");
await first(service.rpc("comun_participation_wallet_attach_relata", { p_token_hash_hex: hash(walletToken), p_protocol: relata.protocol, p_receipt_secret: receiptSecret }), "relata-attach");

const listed = await service.rpc("comun_participation_wallet_list", { p_token_hash_hex: hash(walletToken) });
if (listed.error || listed.data.length !== 2) throw new Error(`list-count:${listed.error?.message ?? listed.data.length}`);
const safeJson = JSON.stringify(listed.data);
for (const secret of [walletRecovery, walletToken, receiptSecret]) if (safeJson.includes(secret)) throw new Error("secret leaked in list");

const otherToken = token();
await first(service.rpc("comun_participation_wallet_create", { p_token_hash_hex: hash(otherToken), p_recovery_hash_hex: hash(recovery()) }), "other-create");
const cross = await service.rpc("comun_participation_wallet_list", { p_token_hash_hex: hash(otherToken) });
if (cross.error || cross.data.length !== 0) throw new Error("cross-wallet access");

const rotatedToken = token(); const rotatedRecovery = recovery();
await first(service.rpc("comun_participation_wallet_rotate_recovery", { p_token_hash_hex: hash(walletToken), p_new_recovery_hash_hex: hash(rotatedRecovery), p_new_token_hash_hex: hash(rotatedToken) }), "rotate");
const oldToken = await service.rpc("comun_participation_wallet_list", { p_token_hash_hex: hash(walletToken) });
if (oldToken.error || oldToken.data.length !== 0) throw new Error("old token remained valid");
const recoveredToken = token();
await first(service.rpc("comun_participation_wallet_redeem", { p_recovery_code_hash_hex: hash(rotatedRecovery), p_new_token_hash_hex: hash(recoveredToken) }), "redeem");
const recovered = await service.rpc("comun_participation_wallet_list", { p_token_hash_hex: hash(recoveredToken) });
if (recovered.error || recovered.data.length !== 2) throw new Error("recovery lost items");

const anonCall = await anon.rpc("comun_participation_wallet_list", { p_token_hash_hex: hash(recoveredToken) });
if (!anonCall.error) throw new Error("anon wallet RPC allowed");

const removed = await service.rpc("comun_participation_wallet_remove_item", { p_token_hash_hex: hash(recoveredToken), p_item_id: recovered.data.find((item) => item.item_type === "relata_report")?.item_id });
if (removed.error || !(removed.data === true || removed.data?.[0] === true)) throw new Error(`withdraw failed:${removed.error?.message ?? JSON.stringify(removed.data)}`);

console.log(JSON.stringify({ result: "COMUN_WALLET_48_0G_DB_GREEN", multipleItems: true, legacyFollow: true, relataAttached: true, crossWalletBlocked: true, rotation: true, recovery: true, anonRpcBlocked: true, withdraw: true }));
