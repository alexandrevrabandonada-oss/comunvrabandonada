// Read-only protocol validation. No credentials, network clients or source writes.
export async function listCompleteStorageScope(listPage, limits = {}) {
  const maxPages = limits.maxPages ?? 1000;
  const maxObjects = limits.maxObjects ?? 50000;
  if (
    !Number.isSafeInteger(maxPages) ||
    maxPages < 1 ||
    maxPages > 1000 ||
    !Number.isSafeInteger(maxObjects) ||
    maxObjects < 1 ||
    maxObjects > 50000
  )
    throw new Error("COMUN_STORAGE_INVENTORY_BUDGET_INVALID");
  const rows = [];
  const keys = new Set();
  const cursors = new Set();
  let cursor;
  let bytes = 0;
  for (let pageNumber = 0; pageNumber < maxPages; pageNumber++) {
    let page;
    try {
      page = await listPage(cursor);
    } catch {
      throw new Error("COMUN_STORAGE_INVENTORY_READ_FAILED");
    }
    if (
      !page ||
      typeof page.IsTruncated !== "boolean" ||
      (page.Contents !== undefined && !Array.isArray(page.Contents))
    )
      throw new Error("COMUN_STORAGE_INVENTORY_INCOMPLETE");
    const contents = page.Contents ?? [];
    if (page.KeyCount !== undefined && page.KeyCount !== contents.length)
      throw new Error("COMUN_STORAGE_INVENTORY_INCOMPLETE");
    if (rows.length + contents.length > maxObjects)
      throw new Error("COMUN_STORAGE_INVENTORY_BUDGET_EXCEEDED");
    for (const object of contents) {
      if (
        !object ||
        typeof object.Key !== "string" ||
        !object.Key ||
        !Number.isSafeInteger(object.Size) ||
        object.Size < 0
      )
        throw new Error("COMUN_STORAGE_INVENTORY_OBJECT_INVALID");
      if (keys.has(object.Key))
        throw new Error("COMUN_STORAGE_INVENTORY_DUPLICATE_OBJECT");
      keys.add(object.Key);
      bytes += object.Size;
      if (!Number.isSafeInteger(bytes))
        throw new Error("COMUN_STORAGE_INVENTORY_OBJECT_INVALID");
      rows.push({ key: object.Key, size: object.Size });
    }
    const next = page.NextContinuationToken;
    if (!page.IsTruncated) {
      if (next !== undefined && next !== null && next !== "")
        throw new Error("COMUN_STORAGE_INVENTORY_INCOMPLETE");
      return rows;
    }
    if (typeof next !== "string" || !next)
      throw new Error("COMUN_STORAGE_INVENTORY_INCOMPLETE");
    if (cursors.has(next))
      throw new Error("COMUN_STORAGE_INVENTORY_CURSOR_REPEATED");
    cursors.add(next);
    cursor = next;
  }
  throw new Error("COMUN_STORAGE_INVENTORY_BUDGET_EXCEEDED");
}

export function assertStorageObjectLength(declaredSize, downloadedSize) {
  if (
    !Number.isSafeInteger(declaredSize) ||
    declaredSize < 0 ||
    !Number.isSafeInteger(downloadedSize) ||
    downloadedSize < 0 ||
    declaredSize !== downloadedSize
  )
    throw new Error("COMUN_STORAGE_BACKUP_OBJECT_CHANGED");
}
