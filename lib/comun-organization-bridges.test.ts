import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  from: vi.fn(),
  rows: [] as unknown[],
}));

vi.mock("server-only", () => ({}));
vi.mock("./supabase/server", () => ({
  createPublicSupabaseClient: () => ({ from: database.from }),
  createServiceSupabaseClient: () => null,
}));

import {
  listPublicOrganizationBridgesForCitations,
  projectPublicOrganizationBridges,
  publicOrganizationBridgeHref,
  type RawPublicOrganizationBridgeRow,
} from "./comun-organization-bridges";
import {
  createPublicEvidenceCitationV1,
  type PublicEvidenceCitationV1,
} from "./comun-public-evidence";

function citation(
  referencePeriod: string,
  refId = "panorama:territory:coverage",
): PublicEvidenceCitationV1 {
  return createPublicEvidenceCitationV1({
    refId,
    observatoryId: "territory",
    layerId: "territory",
    claimKind: "coverage_statement",
    title: "Território e serviços públicos",
    publicPath: "/comun/observatorios/territorio",
    sourceKind: "official_public_data",
    referencePeriod,
    sourceRefs: ["ibge:censo-2022"],
    limitations: ["Setor censitário não é bairro."],
  });
}

const current = citation("Censo 2022; verificação 2026-08-14");
const historical = citation("Censo 2022; verificação 2026-08-13");

function row(
  payload: PublicEvidenceCitationV1,
  pauta: Record<string, unknown> = {},
): RawPublicOrganizationBridgeRow {
  return {
    source_type: "public_evidence",
    status: "approved",
    sensitivity: "public_safe",
    public_evidence_ref_id: payload.refId,
    public_evidence_version: payload.versionId,
    public_evidence_payload: payload,
    pauta: {
      id: "pauta-1",
      slug: "territorio-em-pauta",
      title: "Território em pauta",
      summary: "Questão pública territorial.",
      public_status: "Em organização",
      next_step: "Entrar na roda.",
      status: "organizing",
      visibility: "public",
      updated_at: "2026-08-14T10:00:00Z",
      ...pauta,
    },
  };
}

function queryBuilder() {
  const builder: Record<string, ReturnType<typeof vi.fn>> & {
    then?: PromiseLike<unknown>["then"];
  } = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    neq: vi.fn(),
    order: vi.fn(),
  };
  for (const method of ["select", "eq", "in", "neq", "order"] as const) {
    builder[method].mockReturnValue(builder);
  }
  builder.then = (onFulfilled, onRejected) =>
    Promise.resolve({ data: database.rows, error: null }).then(
      onFulfilled,
      onRejected,
    );
  return builder;
}

beforeEach(() => {
  database.rows = [];
  database.from.mockReset();
});

describe("COMUN 48.3-E2 exact public organization bridges", () => {
  it("distinguishes current and historical versions without updating persisted evidence", () => {
    const bridges = projectPublicOrganizationBridges(
      [current],
      [
        row(current),
        row(historical, {
          id: "pauta-2",
          slug: "memoria-territorial",
          title: "Memória territorial",
          updated_at: "2026-08-13T10:00:00Z",
        }),
      ],
    );
    expect(bridges).toHaveLength(1);
    expect(bridges[0].pautas).toEqual([
      expect.objectContaining({
        pautaId: "pauta-1",
        relationVersionState: "current_version",
        linkedEvidenceVersion: current.versionId,
      }),
      expect.objectContaining({
        pautaId: "pauta-2",
        relationVersionState: "historical_version",
        linkedEvidenceVersion: historical.versionId,
      }),
    ]);
    expect(historical.versionId).not.toBe(current.versionId);
  });

  it("fails closed for private, unapproved, archived and mismatched rows", () => {
    const sameTitleDifferentRef = citation(
      current.referencePeriod,
      "panorama:transport:coverage",
    );
    const rows: RawPublicOrganizationBridgeRow[] = [
      { ...row(current), sensitivity: "private_only" },
      { ...row(current), status: "rejected" },
      { ...row(current), source_type: "manual" },
      row(current, { status: "archived" }),
      row(current, { visibility: "internal" }),
      row(sameTitleDifferentRef),
      {
        ...row(current),
        public_evidence_version: historical.versionId,
      },
    ];
    expect(projectPublicOrganizationBridges([current], rows)[0].pautas).toEqual(
      [],
    );
  });

  it("deduplicates the same pauta and prefers an exact current relation", () => {
    const bridges = projectPublicOrganizationBridges(
      [current],
      [row(historical), row(current)],
    );
    expect(bridges[0].pautas).toHaveLength(1);
    expect(bridges[0].pautas[0].relationVersionState).toBe("current_version");
  });

  it("uses one batched ref query and returns only allowlisted DTO fields", async () => {
    database.rows = [
      {
        ...row(current),
        original_text: "PRIVATE_TEXT_SENTINEL",
        report_id: "PRIVATE_REPORT_SENTINEL",
        wallet: "PRIVATE_WALLET_SENTINEL",
      },
    ];
    const builder = queryBuilder();
    database.from.mockReturnValue(builder);

    const result = await listPublicOrganizationBridgesForCitations([current]);

    expect(database.from).toHaveBeenCalledTimes(1);
    expect(database.from).toHaveBeenCalledWith("comun_pauta_evidence_items");
    expect(builder.in).toHaveBeenCalledTimes(1);
    expect(builder.in).toHaveBeenCalledWith("public_evidence_ref_id", [
      current.refId,
    ]);
    expect(JSON.stringify(result)).not.toMatch(
      /PRIVATE_|original_text|report_id|wallet|user_id|attachment|private_location|forwarding/i,
    );
  });

  it("creates no dead link, a direct one-pauta link, and the canonical filtered link for many", () => {
    const [empty] = projectPublicOrganizationBridges([current], []);
    const [single] = projectPublicOrganizationBridges([current], [row(current)]);
    const [multiple] = projectPublicOrganizationBridges(
      [current],
      [
        row(current),
        row(current, {
          id: "pauta-2",
          slug: "segunda-pauta",
          title: "Segunda pauta",
        }),
      ],
    );
    expect(publicOrganizationBridgeHref(empty)).toBeNull();
    expect(publicOrganizationBridgeHref(single)).toBe(
      "/comun/pautas/territorio-em-pauta",
    );
    expect(publicOrganizationBridgeHref(multiple)).toBe(
      "/comun/pautas?evidencia=panorama%3Aterritory%3Acoverage",
    );
  });
});
