export const DEFAULT_FIRE_PROXIMITY_KM = 10;

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getFocusCoordinates(focus) {
  const lat = numberOrNull(focus?.lat ?? focus?.properties?.lat);
  const lon = numberOrNull(focus?.lon ?? focus?.properties?.lon);
  return lat === null || lon === null ? null : { lat, lon };
}

export function haversineDistanceKm(a, b) {
  const earthRadiusKm = 6371.0088;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLon = toRadians(b.lon - a.lon);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function findNearbyFireFoci(area, fireRecords, defaultRadiusKm = DEFAULT_FIRE_PROXIMITY_KM) {
  const areaLat = numberOrNull(area?.lat);
  const areaLon = numberOrNull(area?.lon);
  const radiusKm = numberOrNull(area?.proximityRadiusKm) ?? defaultRadiusKm;

  if (areaLat === null || areaLon === null || radiusKm <= 0 || !Array.isArray(fireRecords)) {
    return [];
  }

  return fireRecords
    .map((focus) => {
      const coordinates = getFocusCoordinates(focus);
      if (!coordinates) return null;
      const distanceKm = haversineDistanceKm({ lat: areaLat, lon: areaLon }, coordinates);
      return distanceKm <= radiusKm ? { focus, distanceKm } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = ((yi > point.lat) !== (yj > point.lat))
      && (point.lon < ((xj - xi) * (point.lat - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, polygon) {
  if (!Array.isArray(polygon?.[0]) || !pointInRing(point, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(point, hole));
}

function distanceToSegmentKm(point, a, b) {
  const kmPerDegreeLat = 111.32;
  const kmPerDegreeLon = 111.32 * Math.cos(point.lat * Math.PI / 180);
  const ax = (a[0] - point.lon) * kmPerDegreeLon;
  const ay = (a[1] - point.lat) * kmPerDegreeLat;
  const bx = (b[0] - point.lon) * kmPerDegreeLon;
  const by = (b[1] - point.lat) * kmPerDegreeLat;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function distanceToPolygonKm(point, polygon) {
  if (pointInPolygon(point, polygon)) return 0;
  return Math.min(
    ...polygon.flatMap((ring) => ring.slice(1).map((coordinate, idx) => distanceToSegmentKm(point, ring[idx], coordinate)))
  );
}

function eventPolygons(event) {
  const geometry = event?.geometry;
  if (geometry?.type === "Polygon") return [geometry.coordinates];
  if (geometry?.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

export function findNearbyFireEvents(area, fireEvents, defaultRadiusKm = DEFAULT_FIRE_PROXIMITY_KM) {
  const areaLat = numberOrNull(area?.lat);
  const areaLon = numberOrNull(area?.lon);
  const radiusKm = numberOrNull(area?.proximityRadiusKm) ?? defaultRadiusKm;

  if (areaLat === null || areaLon === null || radiusKm <= 0 || !Array.isArray(fireEvents)) {
    return [];
  }

  const point = { lat: areaLat, lon: areaLon };
  return fireEvents
    .map((event) => {
      const polygons = eventPolygons(event);
      if (polygons.length === 0) return null;
      const distanceKm = Math.min(...polygons.map((polygon) => distanceToPolygonKm(point, polygon)));
      return distanceKm <= radiusKm ? { event, distanceKm } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function normalizeSpatialName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

export function findLocalUcSpatialReference(uc, localUcs) {
  const name = normalizeSpatialName(uc?.name);
  if (!name || !Array.isArray(localUcs)) return null;

  return localUcs.find((candidate) => {
    const candidateNames = [candidate?.name, ...(candidate?.spatialAliases || [])]
      .map(normalizeSpatialName)
      .filter(Boolean);
    return candidateNames.some((candidateName) => name.includes(candidateName) || candidateName.includes(name));
  }) || null;
}
