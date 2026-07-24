import { describe, expect, it } from "vitest";
import {
  CANONICAL_SIDEWALK_PAUTA_SLUG,
  canonicalSidewalkEditorialPauta,
  shouldUseCanonicalEditorialFallback,
} from "./canonical-editorial-pautas";

describe("canonical sidewalk editorial pauta", () => {
  it("uses the fallback only after a successful empty lookup", () => {
    expect(
      shouldUseCanonicalEditorialFallback({
        slug: CANONICAL_SIDEWALK_PAUTA_SLUG,
        queryFailed: false,
        rows: [],
      }),
    ).toBe(true);
  });

  it.each([
    ["public", "organizing"],
    ["internal", "organizing"],
    ["archived", "archived"],
  ])("does not shadow an existing %s row", (visibility, status) => {
    expect(
      shouldUseCanonicalEditorialFallback({
        slug: CANONICAL_SIDEWALK_PAUTA_SLUG,
        queryFailed: false,
        rows: [{ visibility, status }],
      }),
    ).toBe(false);
  });

  it("does not turn a database failure into editorial data", () => {
    expect(
      shouldUseCanonicalEditorialFallback({
        slug: CANONICAL_SIDEWALK_PAUTA_SLUG,
        queryFailed: true,
        rows: [],
      }),
    ).toBe(false);
  });

  it("keeps unknown slugs outside the fallback", () => {
    expect(
      shouldUseCanonicalEditorialFallback({
        slug: "pauta-desconhecida",
        queryFailed: false,
        rows: [],
      }),
    ).toBe(false);
  });

  it("uses an explicitly local identity and zero metrics", () => {
    expect(canonicalSidewalkEditorialPauta.id).toBe(
      "editorial:calcadas-em-circulacao",
    );
    expect(canonicalSidewalkEditorialPauta.source).toBe("editorial_fallback");
    expect(Object.values(canonicalSidewalkEditorialPauta.stats)).toEqual(
      expect.arrayContaining([0]),
    );
    expect(
      Object.values(canonicalSidewalkEditorialPauta.stats).every(
        (value) => value === 0,
      ),
    ).toBe(true);
  });
});
