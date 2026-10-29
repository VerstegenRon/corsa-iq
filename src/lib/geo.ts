// Recognising the circuit from the phone's location: the nearest track with coordinates, if it is
// close enough to be the one you are standing at.

export type Located = { latitude: number | null; longitude: number | null };

/** Tracks are often a few km outside the town they are named after; two are never this close. */
export const NEAREST_TRACK_MAX_KM = 15;

/** Great-circle distance in km (haversine). */
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function nearestTrack<T extends Located>(
  tracks: T[],
  here: { latitude: number; longitude: number },
): { track: T; km: number } | null {
  let best: { track: T; km: number } | null = null;
  for (const track of tracks) {
    if (track.latitude === null || track.longitude === null) continue;
    const km = distanceKm(here, { latitude: track.latitude, longitude: track.longitude });
    if (!best || km < best.km) best = { track, km };
  }
  return best && best.km <= NEAREST_TRACK_MAX_KM ? best : null;
}
