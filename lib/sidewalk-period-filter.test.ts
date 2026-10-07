import { describe, expect, it } from "vitest";
import { matchesSidewalkPeriod } from "./sidewalk-period-filter";

const now = Date.parse("2026-10-06T00:00:00.000Z");
const day = 24 * 60 * 60 * 1000;
const date = (age: number) => new Date(now - age).toISOString();

describe("Calçadas calendar period", () => {
  it("does not make the newest record recent in an old dataset", () => {
    expect(matchesSidewalkPeriod("2026-09-01T00:00:00Z", "30", now)).toBe(
      false,
    );
    expect(matchesSidewalkPeriod("2026-09-01T00:00:00Z", "90", now)).toBe(true);
  });
  it.each(["30", "90", "365"])(
    "checks both boundaries of %s days",
    (period) => {
      const boundary = Number(period) * day;
      expect(matchesSidewalkPeriod(date(0), period, now)).toBe(true);
      expect(matchesSidewalkPeriod(date(boundary), period, now)).toBe(true);
      expect(matchesSidewalkPeriod(date(boundary + 1), period, now)).toBe(
        false,
      );
      expect(matchesSidewalkPeriod(date(-1), period, now)).toBe(false);
    },
  );
  it.each([null, undefined, "", "not-a-date"])(
    "excludes an undated/invalid observation: %s",
    (observedAt) => {
      expect(matchesSidewalkPeriod(observedAt, "30", now)).toBe(false);
      expect(matchesSidewalkPeriod(observedAt, "", now)).toBe(true);
    },
  );
  it("does not let one invalid date exclude valid neighboring records", () => {
    const observations = ["not-a-date", date(day)];
    expect(
      observations.filter((value) => matchesSidewalkPeriod(value, "30", now)),
    ).toEqual([date(day)]);
  });
  it.each(["30d", "30x", "-30", "0", "toString"])(
    "rejects unsupported period %s",
    (period) => {
      expect(matchesSidewalkPeriod(date(day), period, now)).toBe(false);
    },
  );
  it.each([NaN, Infinity])("rejects an invalid reference: %s", (reference) => {
    expect(matchesSidewalkPeriod(date(day), "30", reference)).toBe(false);
  });
  it("compares instants across time zones", () => {
    expect(matchesSidewalkPeriod("2026-09-05T21:00:00-03:00", "30", now)).toBe(
      true,
    );
    expect(matchesSidewalkPeriod("2026-09-05T20:59:59-03:00", "30", now)).toBe(
      false,
    );
  });
});
