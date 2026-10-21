// A successful DeleteObjects/remove response alone is not proof of cleanup.
// Unknown or failed read-after-delete results must never authorize green evidence.
export async function assertStorageObjectsMissing(provider, rows) {
  for (const [scope, key] of rows) {
    let exists;
    try {
      exists = await provider.exists(scope, key);
    } catch {
      throw new Error("COMUN_STORAGE_DELETE_POSTFLIGHT_FAILED");
    }
    if (exists !== false)
      throw new Error("COMUN_STORAGE_DELETE_POSTFLIGHT_FAILED");
  }
}
