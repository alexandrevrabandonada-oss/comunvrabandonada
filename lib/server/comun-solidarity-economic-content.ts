import "server-only";

import {
  SOLIDARITY_NEED_TYPES,
  SOLIDARITY_OFFER_KINDS,
  SOLIDARITY_OFFER_MODALITIES,
} from "@/lib/comun-solidarity-economy";
import type {
  SolidarityNeedOperation,
  SolidarityOfferOperation,
} from "@/lib/comun-solidarity-economic-content";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  getMySolidarityOrganizationAccess,
  getPublicSolidarityOrganizationDetail,
} from "./comun-solidarity-organization-governance";

const PRIVATE_CONTENT_LIMIT = 100;
type Row = Record<string, unknown>;

export type PrivateSolidarityOfferEditorV1 = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  kind: (typeof SOLIDARITY_OFFER_KINDS)[number];
  modalities: (typeof SOLIDARITY_OFFER_MODALITIES)[number][];
  priceAmountCents: number | null;
  priceNote: string | null;
  availability: string | null;
  status: "draft" | "pending_review" | "published" | "paused" | "expired" | "archived";
  publishedAt: string | null;
  validUntil: string | null;
  isExpired: boolean;
};

export type PrivateSolidarityNeedEditorV1 = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  needType: (typeof SOLIDARITY_NEED_TYPES)[number];
  status: "identified" | "verifying" | "open" | "partially_met" | "met" | "cancelled" | "archived";
  dueAt: string | null;
};

function text(value: unknown, maximum: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maximum ? normalized : null;
}

function iso(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : null;
}

function allowlisted<T extends string>(value: unknown, values: readonly T[]) {
  return typeof value === "string" && values.includes(value as T)
    ? (value as T)
    : null;
}

function cents(value: unknown) {
  const parsed =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof parsed === "number" && Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

async function economicRpc(name: string, parameters: Record<string, unknown>) {
  const database = createServiceSupabaseClient();
  if (!database) throw new Error("COMUN_SOLIDARITY_ECONOMIC_DATABASE_UNAVAILABLE");
  const result = await (database as any).rpc(name, parameters);
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : null;
  const subjectId = text(row?.subject_id, 80);
  const subjectSlug = text(row?.subject_slug, 120);
  const state = text(row?.state, 40);
  if (!subjectId || !subjectSlug || !state)
    throw new Error("COMUN_SOLIDARITY_ECONOMIC_RPC_INVALID");
  return { subjectId, subjectSlug, state, idempotent: row?.idempotent === true };
}

export async function getSolidarityEconomicEditorContext(
  organizationSlug: string,
  memberUserId: string,
) {
  const detail = await getPublicSolidarityOrganizationDetail(organizationSlug);
  if (!detail) return null;
  const access = await getMySolidarityOrganizationAccess(
    memberUserId,
    detail.organization.territoryId,
  );
  if (access?.state !== "active" || !access.role) return null;
  return { detail, access };
}

export async function listSolidarityOrganizationEconomicContent(
  organizationSlug: string,
  memberUserId: string,
) {
  const context = await getSolidarityEconomicEditorContext(
    organizationSlug,
    memberUserId,
  );
  if (!context) return null;
  const database = createServiceSupabaseClient();
  if (!database) return null;
  const organizationId = context.detail.organization.territoryId;
  const [offers, needs] = await Promise.all([
    database
      .from("comun_solidarity_offers")
      .select(
        "id,slug,title,public_summary,offer_kind,modalities,price_amount_cents,price_note_public,availability_public,status,published_at,valid_until",
      )
      .eq("organization_territory_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(PRIVATE_CONTENT_LIMIT),
    database
      .from("comun_territorial_needs")
      .select("id,slug,title,public_summary,need_type,status,due_at")
      .eq("organization_territory_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(PRIVATE_CONTENT_LIMIT),
  ]);
  if (offers.error || needs.error) {
    console.warn("COMUN_SOLIDARITY_ECONOMIC_PRIVATE_CONTENT_UNAVAILABLE", {
      offers: offers.error?.code ?? null,
      needs: needs.error?.code ?? null,
    });
    return null;
  }
  const now = Date.now();
  return {
    ...context,
    offers: ((offers.data ?? []) as Row[]).flatMap((row) => {
      const id = text(row.id, 80);
      const slug = text(row.slug, 120);
      const title = text(row.title, 140);
      const summary = text(row.public_summary, 1_200);
      const kind = allowlisted(row.offer_kind, SOLIDARITY_OFFER_KINDS);
      const status = allowlisted(row.status, [
        "draft",
        "pending_review",
        "published",
        "paused",
        "expired",
        "archived",
      ] as const);
      const modalities = Array.isArray(row.modalities)
        ? row.modalities.filter(
            (item): item is (typeof SOLIDARITY_OFFER_MODALITIES)[number] =>
              typeof item === "string" &&
              SOLIDARITY_OFFER_MODALITIES.includes(
                item as (typeof SOLIDARITY_OFFER_MODALITIES)[number],
              ),
          )
        : [];
      if (!id || !slug || !title || !summary || !kind || !status || !modalities.length)
        return [];
      const validUntil = iso(row.valid_until);
      return [
        {
          id,
          slug,
          title,
          summary,
          kind,
          modalities,
          priceAmountCents:
            row.price_amount_cents == null ? null : cents(row.price_amount_cents),
          priceNote: text(row.price_note_public, 300),
          availability: text(row.availability_public, 500),
          status,
          publishedAt: iso(row.published_at),
          validUntil,
          isExpired: Boolean(validUntil && Date.parse(validUntil) <= now),
        } satisfies PrivateSolidarityOfferEditorV1,
      ];
    }),
    needs: ((needs.data ?? []) as Row[]).flatMap((row) => {
      const id = text(row.id, 80);
      const slug = text(row.slug, 120);
      const title = text(row.title, 160);
      const summary = text(row.public_summary, 1_200);
      const needType = allowlisted(row.need_type, SOLIDARITY_NEED_TYPES);
      const status = allowlisted(row.status, [
        "identified",
        "verifying",
        "open",
        "partially_met",
        "met",
        "cancelled",
        "archived",
      ] as const);
      return id && slug && title && summary && needType && status
        ? [
            {
              id,
              slug,
              title,
              summary,
              needType,
              status,
              dueAt: iso(row.due_at),
            } satisfies PrivateSolidarityNeedEditorV1,
          ]
        : [];
    }),
  };
}

export function createSolidarityOfferByAccess(input: {
  requestId: string;
  organizationTerritoryId: string;
  actorUserId: string;
  slugBase: string;
  title: string;
  summary: string;
  modalities: string[];
  kind: string;
  priceAmountCents: number | null;
  priceNote: string | null;
  availability: string | null;
  validityDays: number;
}) {
  return economicRpc("comun_create_solidarity_offer_by_access_v1", {
    p_request_id: input.requestId,
    p_organization_territory_id: input.organizationTerritoryId,
    p_actor_user_id: input.actorUserId,
    p_slug_base: input.slugBase,
    p_title: input.title,
    p_public_summary: input.summary,
    p_modalities: input.modalities,
    p_offer_kind: input.kind,
    p_price_amount_cents: input.priceAmountCents,
    p_price_note_public: input.priceNote,
    p_availability_public: input.availability,
    p_validity_days: input.validityDays,
  });
}

export function mutateSolidarityOfferByAccess(input: {
  requestId: string;
  organizationTerritoryId: string;
  actorUserId: string;
  offerId: string;
  operation: SolidarityOfferOperation;
  title?: string | null;
  summary?: string | null;
  modalities?: string[] | null;
  kind?: string | null;
  priceAmountCents?: number | null;
  priceNote?: string | null;
  availability?: string | null;
  validityDays?: number | null;
}) {
  return economicRpc("comun_mutate_solidarity_offer_by_access_v1", {
    p_request_id: input.requestId,
    p_organization_territory_id: input.organizationTerritoryId,
    p_actor_user_id: input.actorUserId,
    p_offer_id: input.offerId,
    p_operation: input.operation,
    p_title: input.title ?? null,
    p_public_summary: input.summary ?? null,
    p_modalities: input.modalities ?? null,
    p_offer_kind: input.kind ?? null,
    p_price_amount_cents: input.priceAmountCents ?? null,
    p_price_note_public: input.priceNote ?? null,
    p_availability_public: input.availability ?? null,
    p_validity_days: input.validityDays ?? null,
  });
}

export function createSolidarityNeedByAccess(input: {
  requestId: string;
  organizationTerritoryId: string;
  actorUserId: string;
  slugBase: string;
  title: string;
  summary: string;
  needType: string;
  dueAt: string | null;
}) {
  return economicRpc("comun_create_solidarity_need_by_access_v1", {
    p_request_id: input.requestId,
    p_organization_territory_id: input.organizationTerritoryId,
    p_actor_user_id: input.actorUserId,
    p_slug_base: input.slugBase,
    p_title: input.title,
    p_public_summary: input.summary,
    p_need_type: input.needType,
    p_due_at: input.dueAt,
  });
}

export function mutateSolidarityNeedByAccess(input: {
  requestId: string;
  organizationTerritoryId: string;
  actorUserId: string;
  needId: string;
  operation: SolidarityNeedOperation;
  title?: string | null;
  summary?: string | null;
  needType?: string | null;
  dueAt?: string | null;
}) {
  return economicRpc("comun_mutate_solidarity_need_by_access_v1", {
    p_request_id: input.requestId,
    p_organization_territory_id: input.organizationTerritoryId,
    p_actor_user_id: input.actorUserId,
    p_need_id: input.needId,
    p_operation: input.operation,
    p_title: input.title ?? null,
    p_public_summary: input.summary ?? null,
    p_need_type: input.needType ?? null,
    p_due_at: input.dueAt ?? null,
  });
}
