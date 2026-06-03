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

function pointInAnyPolygon(point, polygons) {
  return polygons.some((polygon) => pointInPolygon(point, polygon));
}

function kmScaleAtLat(lat) {
  return {
    x: 111.32 * Math.cos(lat * Math.PI / 180),
    y: 111.32,
  };
}

function toLocalKm(coordinate, origin) {
  const scale = kmScaleAtLat(origin.lat);
  return {
    x: (coordinate[0] - origin.lon) * scale.x,
    y: (coordinate[1] - origin.lat) * scale.y,
  };
}

function pointToSegmentDistanceKm(point, a, b) {
  const ax = a.x - point.x;
  const ay = a.y - point.y;
  const bx = b.x - point.x;
  const by = b.y - point.y;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function distanceToSegmentKm(point, a, b) {
  const origin = { lat: point.lat, lon: point.lon };
  return pointToSegmentDistanceKm(
    { x: 0, y: 0 },
    toLocalKm(a, origin),
    toLocalKm(b, origin)
  );
}

function ringSegments(ring) {
  return ring.slice(1).map((coordinate, idx) => [ring[idx], coordinate]);
}

function distanceToPolygonKm(point, polygon) {
  if (pointInPolygon(point, polygon)) return 0;
  return Math.min(
    ...polygon.flatMap((ring) => ringSegments(ring).map(([a, b]) => distanceToSegmentKm(point, a, b)))
  );
}

function polygonsFromGeometry(geometry) {
  if (geometry?.type === "Polygon") return [geometry.coordinates];
  if (geometry?.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

export function distancePointToGeometryKm(point, geometry) {
  const polygons = polygonsFromGeometry(geometry);
  if (polygons.length === 0) return Infinity;
  return Math.min(...polygons.map((polygon) => distanceToPolygonKm(point, polygon)));
}

function orientation(a, b, c) {
  return (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
}

function onSegment(a, b, c) {
  return Math.min(a[0], c[0]) <= b[0] && b[0] <= Math.max(a[0], c[0])
    && Math.min(a[1], c[1]) <= b[1] && b[1] <= Math.max(a[1], c[1]);
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if ((o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0)) return true;
  if (Math.abs(o1) < Number.EPSILON && onSegment(a, c, b)) return true;
  if (Math.abs(o2) < Number.EPSILON && onSegment(a, d, b)) return true;
  if (Math.abs(o3) < Number.EPSILON && onSegment(c, a, d)) return true;
  if (Math.abs(o4) < Number.EPSILON && onSegment(c, b, d)) return true;
  return false;
}

function segmentDistanceKm(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  const origin = { lat: (a[1] + b[1] + c[1] + d[1]) / 4, lon: (a[0] + b[0] + c[0] + d[0]) / 4 };
  const ak = toLocalKm(a, origin);
  const bk = toLocalKm(b, origin);
  const ck = toLocalKm(c, origin);
  const dk = toLocalKm(d, origin);
  return Math.min(
    pointToSegmentDistanceKm(ak, ck, dk),
    pointToSegmentDistanceKm(bk, ck, dk),
    pointToSegmentDistanceKm(ck, ak, bk),
    pointToSegmentDistanceKm(dk, ak, bk)
  );
}

function polygonEdges(polygon) {
  return polygon.flatMap((ring) => ringSegments(ring));
}

function polygonsIntersect(a, b) {
  if (pointInPolygon({ lon: a[0][0][0], lat: a[0][0][1] }, b)) return true;
  if (pointInPolygon({ lon: b[0][0][0], lat: b[0][0][1] }, a)) return true;
  const aEdges = polygonEdges(a);
  const bEdges = polygonEdges(b);
  return aEdges.some(([a1, a2]) => bEdges.some(([b1, b2]) => segmentsIntersect(a1, a2, b1, b2)));
}

function polygonDistanceKm(a, b) {
  if (polygonsIntersect(a, b)) return 0;
  const aEdges = polygonEdges(a);
  const bEdges = polygonEdges(b);
  let min = Infinity;
  for (const [a1, a2] of aEdges) {
    for (const [b1, b2] of bEdges) {
      min = Math.min(min, segmentDistanceKm(a1, a2, b1, b2));
      if (min === 0) return 0;
    }
  }
  return min;
}

export function distanceGeometryToGeometryKm(a, b) {
  const aPolygons = polygonsFromGeometry(a);
  const bPolygons = polygonsFromGeometry(b);
  if (aPolygons.length === 0 || bPolygons.length === 0) return Infinity;
  let min = Infinity;
  for (const aPolygon of aPolygons) {
    for (const bPolygon of bPolygons) {
      min = Math.min(min, polygonDistanceKm(aPolygon, bPolygon));
      if (min === 0) return 0;
    }
  }
  return min;
}

function eventGeometry(event) {
  const geometry = event?.geometry;
  return polygonsFromGeometry(geometry).length > 0 ? geometry : null;
}

function areaRadiusKm(area, defaultRadiusKm) {
  return numberOrNull(area?.bufferKm ?? area?.proximityRadiusKm) ?? defaultRadiusKm;
}

export function findNearbyFireFoci(area, fireRecords, defaultRadiusKm = DEFAULT_FIRE_PROXIMITY_KM) {
  const radiusKm = areaRadiusKm(area, defaultRadiusKm);
  const areaGeometry = area?.geometry;
  const areaLat = numberOrNull(area?.lat);
  const areaLon = numberOrNull(area?.lon);

  if (radiusKm <= 0 || !Array.isArray(fireRecords)) return [];
  if (!areaGeometry && (areaLat === null || areaLon === null)) return [];

  return fireRecords
    .map((focus) => {
      const coordinates = getFocusCoordinates(focus);
      if (!coordinates) return null;
      const distanceKm = areaGeometry
        ? distancePointToGeometryKm(coordinates, areaGeometry)
        : haversineDistanceKm({ lat: areaLat, lon: areaLon }, coordinates);
      return distanceKm <= radiusKm ? { focus, distanceKm } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function findNearbyFireEvents(area, fireEvents, defaultRadiusKm = DEFAULT_FIRE_PROXIMITY_KM) {
  const radiusKm = areaRadiusKm(area, defaultRadiusKm);
  const areaGeometry = area?.geometry;
  const areaLat = numberOrNull(area?.lat);
  const areaLon = numberOrNull(area?.lon);

  if (radiusKm <= 0 || !Array.isArray(fireEvents)) return [];
  if (!areaGeometry && (areaLat === null || areaLon === null)) return [];

  const fallbackPoint = { lat: areaLat, lon: areaLon };
  return fireEvents
    .map((event) => {
      const geometry = eventGeometry(event);
      if (!geometry) return null;
      const distanceKm = areaGeometry
        ? distanceGeometryToGeometryKm(areaGeometry, geometry)
        : distancePointToGeometryKm(fallbackPoint, geometry);
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
