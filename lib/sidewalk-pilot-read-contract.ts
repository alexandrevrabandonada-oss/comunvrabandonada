// Capped reads cannot certify denominators or the absence of incidents.
// Never include provider errors or rows in the failure message.
export function assertCompletePilotRead(result: {
  error: unknown;
  data: unknown;
  count: unknown;
}) {
  if (result.error || !Array.isArray(result.data))
    throw new Error("SIDEWALK_PILOT_READ_FAILED");
  if (
    typeof result.count !== "number" ||
    !Number.isSafeInteger(result.count) ||
    result.count < 0 ||
    result.count !== result.data.length
  )
    throw new Error("SIDEWALK_PILOT_SAMPLE_INCOMPLETE");
}
