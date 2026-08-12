function validPublicCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
  );
}

function pointOnSegment(point, start, end) {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const lengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (lengthSquared <= 1e-20) {
    return Math.abs(x - x1) <= 1e-10 && Math.abs(y - y1) <= 1e-10;
  }
  const cross = (y - y1) * (x2 - x1) - (x - x1) * (y2 - y1);
  if (Math.abs(cross) > 1e-10) return false;
  const dot = (x - x1) * (x2 - x1) + (y - y1) * (y2 - y1);
  return dot >= 0 && dot <= lengthSquared;
}

function classifyPointInRing(point, ring) {
  let inside = false;
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
    const a = ring[previous];
    const b = ring[current];
    if (pointOnSegment(point, a, b)) return "boundary";
    const intersects =
      (a[1] > point[1]) !== (b[1] > point[1]) &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0];
    if (intersects) inside = !inside;
  }
  return inside ? "inside" : "outside";
}

function classifyPointInPolygon(point, rings) {
  if (rings.length === 0) return "outside";
  const outer = classifyPointInRing(point, rings[0]);
  if (outer !== "inside") return outer;
  for (const hole of rings.slice(1)) {
    const inHole = classifyPointInRing(point, hole);
    if (inHole === "boundary") return "boundary";
    if (inHole === "inside") return "outside";
  }
  return "inside";
}

function classifyPointInGeometry(point, geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  let inside = false;
  for (const polygon of polygons) {
    const result = classifyPointInPolygon(point, polygon);
    if (result === "boundary") return "boundary";
    if (result === "inside") inside = true;
  }
  return inside ? "inside" : "outside";
}

export function locateOfficialPointInTerritorialSector(point, sectors) {
  if (!validPublicCoordinate(point.latitude, point.longitude)) {
    return { state: "outside_or_geometry_gap" };
  }
  const position = [point.longitude, point.latitude];
  const matches = [];
  let boundary = false;
  for (const sector of sectors) {
    const result = classifyPointInGeometry(position, sector.geography.geometry);
    if (result === "boundary") boundary = true;
    if (result === "inside") matches.push(sector.sectorCode);
  }
  if (boundary || matches.length > 1) return { state: "boundary_ambiguous" };
  if (matches.length === 1) return { state: "matched", sectorCode: matches[0] };
  return { state: "outside_or_geometry_gap" };
}
