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
