export function assertOwnedRunner(env, endpoint, containers) {
  if (
    env.GITHUB_ACTIONS !== "true" ||
    env.RUNNER_ENVIRONMENT !== "github-hosted" ||
    env.COMUN_DISCOVERY_LAB !== "OWNED_EPHEMERAL_RUNNER"
  )
    throw Error("DISCOVERY_OWNED_RUNNER_REQUIRED");
  for (const name of [
    "SUPABASE_DB_URL",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ])
    if (env[name]) throw Error("DISCOVERY_EXTERNAL_CREDENTIAL_REJECTED");
  if (endpoint !== "unix:///var/run/docker.sock" || containers.trim())
    throw Error("DISCOVERY_EMPTY_LOCAL_DOCKER_REQUIRED");
}
export function assertLabDestination(status, container) {
  const api = new URL(status.API_URL),
    db = new URL(status.DB_URL);
  if (
    api.protocol !== "http:" ||
    api.hostname !== "127.0.0.1" ||
    api.port !== "55431" ||
    db.hostname !== "127.0.0.1" ||
    db.port !== "55432" ||
    db.pathname !== "/postgres"
  )
    throw Error("DISCOVERY_LOOPBACK_DESTINATION_REQUIRED");
  if (
    container.Name !== "/supabase_db_COMUM_VR_ABANDONADA" ||
    !container.Config.Image.includes("supabase/postgres") ||
    !container.NetworkSettings?.Ports?.["5432/tcp"]?.some(
      (p) => p.HostPort === db.port,
    )
  )
    throw Error("DISCOVERY_CONTAINER_PROVENANCE_REQUIRED");
  if (!status.ANON_KEY || !status.SERVICE_ROLE_KEY)
    throw Error("DISCOVERY_LOCAL_KEYS_REQUIRED");
}
