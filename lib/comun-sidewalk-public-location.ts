import "server-only";

const GRID_METERS = 150;
const METERS_PER_LATITUDE_DEGREE = 111_320;

export type SidewalkPublicPoint = {
  type: "Point";
  coordinates: [number, number];
};

function assertCoordinate(longitude: number, latitude: number) {
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error("COMUN_SIDEWALK_PRIVATE_POINT_INVALID");
  }
}

export function sanitizeSidewalkPointForPublic(input: {
  longitude: number;
  latitude: number;
}): SidewalkPublicPoint {
  assertCoordinate(input.longitude, input.latitude);
  const latitudeStep = GRID_METERS / METERS_PER_LATITUDE_DEGREE;
  const longitudeScale = Math.max(
    0.2,
    Math.cos((input.latitude * Math.PI) / 180),
  );
  const longitudeStep = GRID_METERS / (METERS_PER_LATITUDE_DEGREE * longitudeScale);

  let latitude = (Math.floor(input.latitude / latitudeStep) + 0.5) * latitudeStep;
  let longitude = (Math.floor(input.longitude / longitudeStep) + 0.5) * longitudeStep;
  if (
    Math.abs(latitude - input.latitude) < 1e-10 &&
    Math.abs(longitude - input.longitude) < 1e-10
  ) {
    longitude += longitudeStep;
  }

  latitude = Number(latitude.toFixed(6));
  longitude = Number(longitude.toFixed(6));
  return { type: "Point", coordinates: [longitude, latitude] };
}

export const SIDEWALK_PUBLIC_LOCATION_GRID_METERS = GRID_METERS;
