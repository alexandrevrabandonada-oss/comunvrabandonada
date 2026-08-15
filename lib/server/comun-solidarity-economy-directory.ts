import "server-only";

import {
  COMUN_SOLIDARITY_DIRECTORY_LIMIT,
  createUnavailableSolidarityEconomyDirectory,
  projectPublicSolidarityEconomyDirectory,
  type RawSolidarityNeedRow,
  type RawSolidarityOfferRow,
  type RawSolidarityOrganizationRow,
  type RawSolidarityTerritoryRow,
} from "@/lib/comun-solidarity-economy";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const QUERY_LIMIT = COMUN_SOLIDARITY_DIRECTORY_LIMIT + 1;

export async function getPublicSolidarityEconomyDirectory() {
  const database = createServiceSupabaseClient();
  if (!database) return createUnavailableSolidarityEconomyDirectory();

  const now = new Date();
  const [territories, organizations, offers, needs] = await Promise.all([
    database
      .from("comun_hub_territories")
      .select(
        "id,slug,municipality,neighborhood,public_approximate_address,status,visibility,verification_status",
      )
      .eq("visibility", "public")
      .in("status", ["active", "monitoring"])
      .in("verification_status", ["source_checked", "verified"])
      .order("id", { ascending: true })
      .limit(QUERY_LIMIT),
    database
      .from("comun_territorial_organizations")
      .select(
        "territory_id,public_name,organization_type,status,service_territory_public,presentation_public,services_public,public_contact_authorized,verification_status,last_verified_at",
      )
      .in("status", ["active", "forming"])
      .in("verification_status", ["source_checked", "verified"])
      .order("public_name", { ascending: true })
      .limit(QUERY_LIMIT),
    database
      .from("comun_solidarity_offers")
      .select(
        "id,slug,organization_territory_id,title,public_summary,offer_kind,modalities,price_amount_cents,price_currency,price_note_public,availability_public,status,reviewed_at,published_at,valid_until",
      )
      .eq("status", "published")
      .gt("valid_until", now.toISOString())
      .order("valid_until", { ascending: true })
      .order("title", { ascending: true })
      .limit(QUERY_LIMIT),
    database
      .from("comun_territorial_needs")
      .select(
        "id,slug,title,public_summary,need_type,status,visibility,territory_id,organization_territory_id,due_at",
      )
      .eq("visibility", "public")
      .in("status", ["open", "partially_met"])
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true })
      .limit(QUERY_LIMIT),
  ]);

  if (
    territories.error ||
    organizations.error ||
    offers.error ||
    needs.error
  ) {
    console.warn("COMUN_SOLIDARITY_DIRECTORY_UNAVAILABLE", {
      territories: territories.error?.code ?? null,
      organizations: organizations.error?.code ?? null,
      offers: offers.error?.code ?? null,
      needs: needs.error?.code ?? null,
    });
    return createUnavailableSolidarityEconomyDirectory();
  }

  return projectPublicSolidarityEconomyDirectory(
    {
      territories: (territories.data ?? []) as RawSolidarityTerritoryRow[],
      organizations: (organizations.data ?? []) as RawSolidarityOrganizationRow[],
      offers: (offers.data ?? []) as RawSolidarityOfferRow[],
      needs: (needs.data ?? []) as RawSolidarityNeedRow[],
    },
    { now },
  );
}
