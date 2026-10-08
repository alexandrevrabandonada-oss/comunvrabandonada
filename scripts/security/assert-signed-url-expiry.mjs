// This lifetime belongs only to synthetic recovery rehearsals, never to
// application links. Observe an active URL before checking the same URL expired.
export const REHEARSAL_SIGNED_URL_SECONDS = 15;
export const REHEARSAL_EXPIRY_WAIT_MS =
  (REHEARSAL_SIGNED_URL_SECONDS + 2) * 1000;

export async function assertSignedUrlExpiry(
  sign,
  {
    request = fetch,
    wait = (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)),
  } = {},
) {
  const url = await sign(REHEARSAL_SIGNED_URL_SECONDS);
  const active = await request(url, { redirect: "manual" });
  if (active.status !== 200) {
    throw new Error("COMUN_STORAGE_SIGNED_URL_NOT_ACTIVE");
  }
  await wait(REHEARSAL_EXPIRY_WAIT_MS);
  const expired = await request(url, { redirect: "manual" });
  if (expired.status === 200) {
    throw new Error("COMUN_STORAGE_SIGNED_URL_NOT_EXPIRED");
  }
}
