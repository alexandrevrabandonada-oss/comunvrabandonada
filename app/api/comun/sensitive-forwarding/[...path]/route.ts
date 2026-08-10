import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { buildSensitiveDisclosurePreview } from "@/lib/comun-sensitive-disclosure";
import {
  canUseSensitiveForwarding,
  isSensitiveForwardingCategory,
  validateSensitiveDisclosureInput,
  type SensitiveDisclosureInput,
} from "@/lib/comun-sensitive-forwarding-feature";
import { forwardingDb } from "@/lib/comun-forwarding-runtime";
import {
  readWalletToken,
  walletSecretHash,
} from "@/lib/comun-participation-wallet-runtime";
import {
  findComunSensitiveInstitutionalChannel,
  listComunSensitiveInstitutionalChannels,
  publicComunSensitiveInstitutionalChannel,
} from "@/lib/server/comun-sensitive-institutional-channel-catalog";

export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store, max-age=0" };
const dormant = () =>
  NextResponse.json({ code: "not_found" }, { status: 404, headers });
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, { status, headers });
const uuid = (value: unknown) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;

async function body(request: NextRequest) {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function disclosureInput(value: Record<string, unknown>): SensitiveDisclosureInput {
  const text = (key: string) =>
    typeof value[key] === "string" ? (value[key] as string) : "";
  return {
    includeIssueType: value.includeIssueType === true,
    includeUnitLabel: value.includeUnitLabel === true,
    unitLabel: text("unitLabel"),
    includeNetworkLabel: value.includeNetworkLabel === true,
    networkLabel: text("networkLabel"),
    includeApproximatePeriod: value.includeApproximatePeriod === true,
    approximatePeriod: text("approximatePeriod"),
    includePersonAuthoredSummary: value.includePersonAuthoredSummary === true,
    personAuthoredSummary: text("personAuthoredSummary"),
  };
}

async function contextFor(tokenHash: string, walletItemId: string) {
  const result = await forwardingDb().rpc("comun_sensitive_wallet_item_context", {
    p_token_hash_hex: tokenHash,
    p_wallet_item_id: walletItemId,
  });
  const value = Array.isArray(result.data) ? result.data[0] : null;
  if (result.error || !value || !isSensitiveForwardingCategory(value.category))
    return null;
  if (!canUseSensitiveForwarding(value.category)) return null;
  return {
    category: value.category,
    issueType: typeof value.issue_type === "string" ? value.issue_type : null,
    immediateDanger: value.immediate_danger === true,
  };
}

function issueLabel(category: string, issueType: string | null) {
  const labels: Record<string, string> = {
    "public_health:access_or_waiting": "Atendimento ou demora",
    "public_health:exam_or_procedure": "Exame, procedimento ou cirurgia",
    "public_health:medicine_or_supply": "Medicamento ou insumo",
    "public_health:staff_or_service_availability": "Falta de profissional ou serviço",
    "public_health:facility_or_accessibility": "Estrutura ou acessibilidade",
    "public_health:care_conduct": "Conduta no atendimento",
    "public_health:transfer_or_health_transport": "Transferência ou transporte sanitário",
    "public_health:information_or_followup": "Informação ou acompanhamento",
    "public_health:other_health_service": "Outro problema no SUS",
    "public_education:staff_or_service_availability": "Falta de profissional ou serviço",
    "public_education:infrastructure_or_climate": "Estrutura ou climatização",
    "public_education:school_meals_or_supplies": "Merenda, material ou insumo",
    "public_education:school_transport_or_access": "Transporte ou acesso à escola",
    "public_education:accessibility_or_inclusion": "Acessibilidade ou inclusão",
    "public_education:enrollment_or_attendance": "Matrícula, vaga ou permanência",
    "public_education:discrimination_or_bullying": "Discriminação ou bullying",
    "public_education:information_or_management": "Informação ou gestão escolar",
    "public_education:other_education_service": "Outro problema na Educação",
  };
  return labels[`${category}:${issueType ?? ""}`] ?? null;
}

function tokenHash(request: NextRequest) {
  const token = readWalletToken(request);
  return token ? walletSecretHash(token) : null;
}

function authorizationProof(
  hash: string,
  walletItemId: string,
  category: string,
  disclosure: SensitiveDisclosureInput,
  expiresAt: string,
) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(
      JSON.stringify({
        version: 1,
        hash,
        walletItemId,
        category,
        disclosure,
        expiresAt,
      }),
    )
    .digest("base64url");
}

function validAuthorizationProof(expected: string | null, supplied: unknown) {
  if (!expected || typeof supplied !== "string") return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const hash = tokenHash(request);
  const path = (await context.params).path;
  const walletItemId = path[0] === "packages" ? uuid(path[1]) : null;
  if (!hash || !walletItemId || path.length !== 2) return dormant();
  try {
    const access = await contextFor(hash, walletItemId);
    if (!access) return dormant();
    const result = await forwardingDb().rpc("comun_sensitive_assisted_list", {
      p_token_hash_hex: hash,
      p_wallet_item_id: walletItemId,
    });
    if (result.error) return dormant();
    return json({
      packages: Array.isArray(result.data) ? result.data : [],
      channels: listComunSensitiveInstitutionalChannels(
        access.category,
        access.immediateDanger,
      ).map(publicComunSensitiveInstitutionalChannel),
      category: access.category,
      issueLabel: issueLabel(access.category, access.issueType),
      channelOnly: access.category === "child_protection",
      noOfficialSend: true,
    });
  } catch {
    return dormant();
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const hash = tokenHash(request);
  if (!hash) return dormant();
  const path = (await context.params).path;
  const input = await body(request);
  const db = forwardingDb();
  try {
    if (path[0] === "packages" && uuid(path[1]) && path[2] === "preview") {
      const access = await contextFor(hash, path[1]);
      if (!access) return dormant();
      const disclosure = disclosureInput(input);
      const checked = validateSensitiveDisclosureInput(access.category, disclosure);
      if (!checked.ok) return json(checked, 422);
      const normalized = { ...disclosure, ...checked.value };
      const authorizationExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      return json({
        preview: buildSensitiveDisclosurePreview(
          access.category,
          issueLabel(access.category, access.issueType),
          normalized,
        ),
        disclosure: normalized,
        authorizationRequired: true,
        authorizationExpiresAt,
        authorizationProof: authorizationProof(
          hash,
          path[1],
          access.category,
          normalized,
          authorizationExpiresAt,
        ),
      });
    }
    if (path[0] === "packages" && uuid(path[1]) && path[2] === "prepare") {
      const access = await contextFor(hash, path[1]);
      if (!access || input.authorizationConfirmed !== true) return dormant();
      const disclosure = disclosureInput(input);
      const checked = validateSensitiveDisclosureInput(access.category, disclosure);
      if (!checked.ok) return json(checked, 422);
      const normalized = { ...disclosure, ...checked.value };
      const expiresAt =
        typeof input.authorizationExpiresAt === "string"
          ? input.authorizationExpiresAt
          : "";
      if (
        !expiresAt ||
        !Number.isFinite(Date.parse(expiresAt)) ||
        Date.parse(expiresAt) < Date.now() ||
        !validAuthorizationProof(
          authorizationProof(
            hash,
            path[1],
            access.category,
            normalized,
            expiresAt,
          ),
          input.authorizationProof,
        )
      )
        return dormant();
      const result = await db.rpc("comun_sensitive_assisted_prepare", {
        p_token_hash_hex: hash,
        p_wallet_item_id: path[1],
        p_include_issue_type: disclosure.includeIssueType,
        p_include_unit_label: disclosure.includeUnitLabel,
        p_unit_label: normalized.unitLabel || null,
        p_include_network_label: disclosure.includeNetworkLabel,
        p_network_label: normalized.networkLabel || null,
        p_include_approximate_period: disclosure.includeApproximatePeriod,
        p_approximate_period: normalized.approximatePeriod || null,
        p_include_person_authored_summary: disclosure.includePersonAuthoredSummary,
        p_person_authored_summary: normalized.personAuthoredSummary || null,
        p_authorization_confirmed: true,
      });
      if (result.error || !Array.isArray(result.data) || !result.data[0])
        return dormant();
      return json({ package: result.data[0], noOfficialSend: true }, 201);
    }
    if (
      path[0] === "packages" && uuid(path[1]) && uuid(path[2]) &&
      path[3] === "open" && path.length === 4
    ) {
      const access = await contextFor(hash, path[1]);
      if (!access) return dormant();
      const listed = await db.rpc("comun_sensitive_assisted_list", {
        p_token_hash_hex: hash,
        p_wallet_item_id: path[1],
      });
      const selected = Array.isArray(listed.data)
        ? (listed.data as Array<Record<string, unknown>>).find(
            (entry) => entry.package_id === path[2],
          )
        : null;
      if (!selected || selected.category !== access.category) return dormant();
      const channelId = typeof input.channelId === "string" ? input.channelId : "";
      const channel = findComunSensitiveInstitutionalChannel(
        access.category,
        channelId,
        access.immediateDanger,
      );
      if (!channel || channel.automationAllowed) return dormant();
      const result = await db.rpc("comun_assisted_forwarding_open", {
        p_token_hash_hex: hash,
        p_package_id: path[2],
        p_channel: channel.channelType,
      });
      if (result.error || !Array.isArray(result.data) || !result.data[0])
        return dormant();
      return json({
        attempt: result.data[0],
        destination: channel.destination,
        channel: publicComunSensitiveInstitutionalChannel(channel),
        noOfficialSend: true,
      });
    }
    if (path[0] === "attempts" && uuid(path[1]) && path[2] === "declare-sent") {
      if (typeof input.sent !== "boolean") return dormant();
      const result = await db.rpc("comun_assisted_forwarding_declare_sent", {
        p_token_hash_hex: hash,
        p_attempt_id: path[1],
        p_sent: input.sent,
      });
      if (result.error || !Array.isArray(result.data) || !result.data[0])
        return dormant();
      return json({ attempt: result.data[0], personDeclared: true });
    }
    if (path[0] === "attempts" && uuid(path[1]) && path[2] === "response") {
      const outcome = typeof input.outcome === "string" ? input.outcome : "";
      const note = typeof input.note === "string" ? input.note.trim() : "";
      const protocol = typeof input.officialProtocol === "string"
        ? input.officialProtocol.trim()
        : "";
      if (note && validateSensitiveDisclosureInput("public_health", {
        includeIssueType: false,includeUnitLabel: false,unitLabel: "",
        includeNetworkLabel: false,networkLabel: "",includeApproximatePeriod: false,
        approximatePeriod: "",includePersonAuthoredSummary: true,personAuthoredSummary: note,
      }).ok === false) return json({ code: "review_sensitive_information" }, 422);
      const result = await db.rpc("comun_sensitive_assisted_record_response", {
        p_token_hash_hex: hash,
        p_attempt_id: path[1],
        p_response_outcome: outcome,
        p_response_note: note || null,
        p_official_protocol: protocol || null,
      });
      if (result.error || !Array.isArray(result.data) || !result.data[0])
        return dormant();
      return json({ attempt: result.data[0] });
    }
    if (path[0] === "packages" && uuid(path[1]) && path[2] === "withdraw") {
      const result = await db.rpc("comun_assisted_forwarding_withdraw", {
        p_token_hash_hex: hash,
        p_package_id: path[1],
      });
      return result.error || result.data !== true ? dormant() : json({ withdrawn: true });
    }
    return dormant();
  } catch {
    return dormant();
  }
}

export const PUT = dormant;
export const PATCH = dormant;
export const DELETE = dormant;
export const HEAD = dormant;
export const OPTIONS = dormant;
