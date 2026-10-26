const projectRef = "nvmdszymrtacfehdynpg";
const fields = [
  "formatVersion",
  "projectRef",
  "observedAt",
  "source",
  "plan",
  "scheduledBackups",
  "pitr",
  "nativeAuthRestore",
  "scheduledEvidenceSha256",
  "pitrEvidenceSha256",
];

// This contract records only an observed availability blocker. It grants no capability.
export function validateProviderAvailabilityObservation(
  input,
  now = Date.now(),
) {
  const fail = () => {
    throw new Error("COMUN_PROVIDER_OBSERVATION_INVALID");
  };
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).sort().join() !== [...fields].sort().join()
  )
    fail();
  const observed = Date.parse(input.observedAt);
  if (
    input.formatVersion !== 1 ||
    input.projectRef !== projectRef ||
    input.source !== "authenticated_dashboard" ||
    input.plan !== "free" ||
    input.scheduledBackups !== "unavailable_current_plan" ||
    input.pitr !== "unavailable_current_plan" ||
    input.nativeAuthRestore !== "not_exercised" ||
    !Number.isFinite(observed) ||
    !Number.isFinite(now) ||
    new Date(observed).toISOString() !== input.observedAt ||
    observed > now + 300000 ||
    now - observed > 86400000 ||
    !/^[a-f0-9]{64}$/.test(input.scheduledEvidenceSha256) ||
    !/^[a-f0-9]{64}$/.test(input.pitrEvidenceSha256) ||
    input.scheduledEvidenceSha256 === input.pitrEvidenceSha256
  )
    fail();
  return Object.freeze({ ...input });
}
