// Ordering rules for the WiFi pages (wifi-city 10.2, wifi-hub 10). Pure functions, shared by the build, the
// client and scripts/fetch-wifi.mjs; checked by sort.check.ts.
import { catPlural, group, type Fee } from './labels.ts';

export interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category: string;
  /** Street address without the page's own city ("406 Walsh Street"), or "". */
  address: string;
  fee: Fee;
  /** OSM check date: "YYYY-MM-DD", "YYYY-MM" or "YYYY". */
  lastEdited: string | null;
}

const FEE_RANK: Record<Fee, number> = { free: 0, customers: 1, unknown: 2 };
// Category priority inside a status group: library, community center, cafe (and coffee), coworking, restaurant,
// fast food, bar, pub, places to stay, then the rest.
const GROUP_RANK: Record<string, number> = {
  library: 0, community_centre: 1, cafe: 2, coworking_space: 3, restaurant: 4, fast_food: 5, bar: 6, pub: 7, stay: 8,
};
const groupRank = (g: string) => GROUP_RANK[g] ?? 9;

/** Default order: free, customers, ask staff; dated before undated, newest first; category priority; name A to Z. */
export function compareDefault(a: Place, b: Place): number {
  const da = a.lastEdited ?? '', db = b.lastEdited ?? '';
  return FEE_RANK[a.fee] - FEE_RANK[b.fee]
    || (da > db ? -1 : da < db ? 1 : 0) // ISO strings: newer sorts first, undated ("") last
    || groupRank(group(a.category)) - groupRank(group(b.category))
    || a.name.localeCompare(b.name, 'en');
}

/** Great-circle distance in miles. */
export function miles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 7917.6 * Math.asin(Math.sqrt(h)); // Earth's mean diameter, 2 x 3,958.8 mi
}

/** Nearest first from a point, ties in the default order. Returns the distance with each place. */
export function sortByDistance<T extends Place>(places: T[], lat: number, lon: number): { place: T; mi: number }[] {
  return places
    .map((place) => ({ place, mi: miles(lat, lon, place.lat, place.lon) }))
    .sort((a, b) => a.mi - b.mi || compareDefault(a.place, b.place));
}

/** "0.4 mi" under 10 miles, "12 mi" from 10, joined with a no-break space (CRAFT-06). */
export const fmtMiles = (mi: number) => (mi < 10 ? Math.max(mi, 0.1).toFixed(1) : String(Math.round(mi))) + ' mi';

/**
 * The two most common categories among free places, `other` excluded, cafe and coffee counted together.
 * Ties: the default-sort category priority, then the plural label A to Z. Returns group keys.
 */
export function mostly(places: Pick<Place, 'fee' | 'category'>[]): string[] {
  const n = new Map<string, number>();
  for (const p of places) {
    const g = group(p.category);
    if (p.fee === 'free' && g !== 'other') n.set(g, (n.get(g) ?? 0) + 1);
  }
  return [...n]
    .sort((a, b) => b[1] - a[1] || groupRank(a[0]) - groupRank(b[0]) || catPlural(a[0]).localeCompare(catPlural(b[0]), 'en'))
    .slice(0, 2)
    .map(([g]) => g);
}
