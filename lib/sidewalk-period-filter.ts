const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_DAYS: Record<string, number> = { "30": 30, "90": 90, "365": 365 };

// The reference is supplied by the page load, never derived from the dataset.
export function matchesSidewalkPeriod(
  observedAt: string | null | undefined,
  period: string,
  referenceTime: number,
): boolean {
  if (!period) return true;
  const days = PERIOD_DAYS[period];
  if (!days || !observedAt || !Number.isFinite(referenceTime)) return false;
  const observedTime = Date.parse(observedAt);
  const age = referenceTime - observedTime;
  return Number.isFinite(age) && age >= 0 && age <= days * DAY_MS;
}
