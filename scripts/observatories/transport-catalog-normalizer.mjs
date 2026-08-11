import { createHash } from "node:crypto";

const LINE_CODE = /^[0-9]{3}[A-Z]?$/;

function decodeEntities(value) {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

export function cleanCatalogText(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function comparableCatalogText(value) {
  return cleanCatalogText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[×]/g, "x")
    .toLowerCase();
}

function compareLineCode(a, b) {
  return a.lineCode.localeCompare(b.lineCode, "en", { numeric: true })
    || a.operator.localeCompare(b.operator, "pt-BR")
    || String(a.timetableUrl ?? "").localeCompare(String(b.timetableUrl ?? ""))
    || String(a.itineraryUrl ?? "").localeCompare(String(b.itineraryUrl ?? ""));
}

function normalizeUrl(href, catalogUrl) {
  if (!href) return null;
  const url = new URL(decodeEntities(href), catalogUrl);
  if (url.protocol !== "https:" || url.hostname !== "www.voltaredonda.rj.gov.br") {
    throw new Error("non_official_catalog_link");
  }
  return url.href;
}

export function normalizeCatalogRecords(records) {
  const errors = [];
  const seen = new Set();
  const normalized = records.map((record) => {
    const lineCode = cleanCatalogText(record.lineCode).toUpperCase();
    const item = {
      operator: cleanCatalogText(record.operator),
      lineCode,
      lineLabel: cleanCatalogText(record.lineLabel),
      timetableUrl: record.timetableUrl ?? null,
      itineraryUrl: record.itineraryUrl ?? null,
    };
    if (!LINE_CODE.test(lineCode) || !item.operator || !item.lineLabel) errors.push(`invalid_record:${lineCode || "unknown"}`);
    if (seen.has(lineCode)) errors.push(`duplicate_line:${lineCode}`);
    seen.add(lineCode);
    return item;
  }).sort(compareLineCode);
  return { ok: errors.length === 0, errors, records: errors.length === 0 ? normalized : [] };
}

/**
 * Parses the public PMVR card markup. It intentionally recognizes only the
 * five fields that form the catalog contract and keeps no HTML at runtime.
 */
export function parseOfficialCatalogHtml(html, catalogUrl) {
  const card = /<strong[^>]*>\s*([^<]+?)\s*<\/strong>\s*<h4[^>]*>\s*LINHA\s+([0-9]{3}[A-Z]?)\s*<\/h4>\s*<h6[^>]*>\s*([^<]*?)\s*<\/h6>\s*<a[^>]*href=['"]([^'"]+)['"][\s\S]*?HORÁRIO[\s\S]*?<\/a>\s*<a[^>]*href=['"]([^'"]+)['"][\s\S]*?ITINERÁRIO[\s\S]*?<\/a>/gi;
  const records = [];
  const errors = [];
  for (const match of html.matchAll(card)) {
    try {
      records.push({
        operator: match[1],
        lineCode: match[2],
        lineLabel: match[3],
        timetableUrl: normalizeUrl(match[4], catalogUrl),
        itineraryUrl: normalizeUrl(match[5], catalogUrl),
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "invalid_catalog_link");
    }
  }
  if (!records.length) errors.push("no_catalog_cards");
  const normalized = normalizeCatalogRecords(records);
  return {
    ok: errors.length === 0 && normalized.ok,
    errors: [...errors, ...normalized.errors],
    records: errors.length === 0 && normalized.ok ? normalized.records : [],
  };
}

export function catalogSemanticHash(records) {
  const normalized = normalizeCatalogRecords(records);
  if (!normalized.ok) throw new Error(`invalid_catalog:${normalized.errors.join(",")}`);
  return createHash("sha256").update(JSON.stringify(normalized.records)).digest("hex");
}

export function snapshotLinesAsCatalogRecords(lines) {
  return normalizeCatalogRecords(lines.map((line) => ({
    operator: line.operator,
    lineCode: line.lineCode,
    lineLabel: line.routeLabel,
    timetableUrl: null,
    itineraryUrl: null,
  })));
}

export function compareNormalizedCatalogs(previousRecords, currentRecords) {
  const previous = normalizeCatalogRecords(previousRecords);
  const current = normalizeCatalogRecords(currentRecords);
  if (!previous.ok || !current.ok) {
    return { qualityState: "source_conflict", errors: [...previous.errors, ...current.errors] };
  }
  const before = new Map(previous.records.map((record) => [record.lineCode, record]));
  const after = new Map(current.records.map((record) => [record.lineCode, record]));
  const shared = [...before.keys()].filter((lineCode) => after.has(lineCode)).sort();
  const changedOperators = [];
  const changedLabels = [];
  const changedTimetableUrls = [];
  const changedItineraryUrls = [];
  const urlComparisonUnavailable = [];
  for (const lineCode of shared) {
    const oldLine = before.get(lineCode);
    const newLine = after.get(lineCode);
    if (comparableCatalogText(oldLine.operator) !== comparableCatalogText(newLine.operator)) changedOperators.push(lineCode);
    if (comparableCatalogText(oldLine.lineLabel) !== comparableCatalogText(newLine.lineLabel)) changedLabels.push(lineCode);
    for (const field of ["timetableUrl", "itineraryUrl"]) {
      if (oldLine[field] === null) urlComparisonUnavailable.push(`${lineCode}:${field}`);
      else if (oldLine[field] !== newLine[field]) (field === "timetableUrl" ? changedTimetableUrls : changedItineraryUrls).push(lineCode);
    }
  }
  const addedLines = [...after.keys()].filter((lineCode) => !before.has(lineCode)).sort();
  const removedLines = [...before.keys()].filter((lineCode) => !after.has(lineCode)).sort();
  const semanticChanges = addedLines.length + removedLines.length + changedOperators.length + changedLabels.length + changedTimetableUrls.length + changedItineraryUrls.length;
  return {
    qualityState: semanticChanges ? "verified_source" : "verified_source",
    addedLines, removedLines, changedOperators, changedLabels,
    changedTimetableUrls, changedItineraryUrls,
    unchangedLines: shared.filter((lineCode) => !changedOperators.includes(lineCode) && !changedLabels.includes(lineCode) && !changedTimetableUrls.includes(lineCode) && !changedItineraryUrls.includes(lineCode)),
    urlComparisonUnavailable,
    semanticDiffEmpty: semanticChanges === 0,
  };
}

export function comparePublicDocumentFacts(previous, current) {
  const changedFields = [...new Set([...Object.keys(previous), ...Object.keys(current)])]
    .filter((key) => JSON.stringify(previous[key] ?? null) !== JSON.stringify(current[key] ?? null))
    .sort();
  return { changedFields, semanticDiffEmpty: changedFields.length === 0 };
}
