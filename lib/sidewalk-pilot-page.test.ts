import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createClient: vi.fn(),
  results: new Map<
    string,
    { data: unknown[]; count: number | null; error: null }
  >(),
  from: vi.fn(),
}));
vi.mock("@/lib/admin-auth", () => ({ requireComunAdmin: mocks.requireAdmin }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceSupabaseClient: mocks.createClient,
}));
vi.mock("@/components/admin-shell", () => ({
  AdminShell: ({ children }: { children: ReactNode }) =>
    createElement("main", null, children),
}));

import SidewalkPilotPage from "@/app/comun/admin/calcadas/piloto/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.results.clear();
  mocks.results.set("comun_sidewalk_uploads", {
    data: [],
    count: 0,
    error: null,
  });
  mocks.results.set("comun_sidewalk_records", {
    data: [
      {
        id: "private-fixture-record",
        created_at: "2026-08-01T00:00:00.000Z",
        status: "pending",
        visibility: "internal",
      },
    ],
    count: 1,
    error: null,
  });
  mocks.results.set("comun_sidewalk_record_photos", {
    data: [],
    count: 0,
    error: null,
  });
  mocks.requireAdmin.mockResolvedValue({
    admin: { email: "operator@example.invalid" },
  });
  mocks.from.mockImplementation((table: string) => {
    const query = {
      select: () => query,
      gte: () => query,
      lt: () => query,
      order: () => query,
      in: () => query,
      limit: () => Promise.resolve(mocks.results.get(table)),
    };
    return query;
  });
  mocks.createClient.mockReturnValue({ from: mocks.from });
});

describe("pilot panel completeness boundary", () => {
  for (const table of [
    "comun_sidewalk_uploads",
    "comun_sidewalk_records",
    "comun_sidewalk_record_photos",
  ])
    it(`hides metrics when ${table} is incomplete`, async () => {
      mocks.results.get(table)!.count = 1001;
      const html = renderToStaticMarkup(await SidewalkPilotPage());
      expect(html).toContain('role="alert"');
      expect(html).toContain("Nenhuma métrica foi calculada");
      expect(html).not.toContain("Funil do piloto");
      expect(html).not.toContain("private-fixture-record");
      expect(mocks.requireAdmin).toHaveBeenCalledWith({
        roles: ["admin", "editor"],
      });
    });

  it("checks authorization before opening privileged reads", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(
      new Error("AUTHORIZATION_REQUIRED"),
    );
    await expect(SidewalkPilotPage()).rejects.toThrow("AUTHORIZATION_REQUIRED");
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
