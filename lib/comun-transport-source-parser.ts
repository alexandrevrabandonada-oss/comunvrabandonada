import type {
  Departure,
  ItineraryVariant,
  ServicePattern,
} from "./comun-transport-programmed-network";

export type TimetableFixture = {
  lineCode: string;
  patterns: ServicePattern[];
};

export type ItineraryFixture = {
  lineCode: string;
  variants: ItineraryVariant[];
};

const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;

function departureMinutes(departure: Departure) {
  return (
    departure.serviceDayOffset * 24 * 60 +
    Number(departure.time.slice(0, 2)) * 60 +
    Number(departure.time.slice(3, 5))
  );
}

/**
 * Fixtures represent facts already audited outside runtime. This fail-closed
 * parser only accepts explicit, chronological departures; it never guesses
 * columns, service days, or after-midnight offsets from a PDF.
 */
export function parseAuditedTimetableFixture(fixture: TimetableFixture) {
  const errors: string[] = [];
  if (!/^[0-9]{3}[A-Z]?$/.test(fixture.lineCode)) {
    errors.push("invalid_line_code");
  }

  for (const pattern of fixture.patterns) {
    let previous = -1;
    for (const departure of pattern.departures) {
      if (!validTime.test(departure.time)) {
        errors.push(`invalid_time:${pattern.originLabel}`);
        continue;
      }
      if (departure.serviceDayOffset !== 0 && departure.serviceDayOffset !== 1) {
        errors.push(`invalid_day_offset:${pattern.originLabel}`);
        continue;
      }
      const minutes = departureMinutes(departure);
      if (minutes <= previous) {
        errors.push(`non_chronological:${pattern.originLabel}`);
      }
      previous = minutes;
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    patterns: errors.length === 0 ? fixture.patterns : [],
  };
}

export function parseAuditedItineraryFixture(fixture: ItineraryFixture) {
  const errors = fixture.variants.flatMap((variant) => {
    if (!variant.variantId || !variant.direction || variant.streetSequence.length === 0) {
      return [`invalid_itinerary:${variant.variantId || "unknown"}`];
    }
    return [];
  });

  return {
    ok: errors.length === 0,
    errors,
    variants: errors.length === 0 ? fixture.variants : [],
  };
}
