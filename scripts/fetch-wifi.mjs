// Data refresh: public WiFi venues from OpenStreetMap (ODbL, © OpenStreetMap contributors).
// Run: node scripts/fetch-wifi.mjs [slug ...]   (no slugs = every city)
// Writes src/data/wifi/{slug}.json, cities.json and src/data/wifi-date.ts, and prints a summary per city
// for the specs. Inclusion and status rule: docs/design/specs/wifi-city.md 10.1.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { compareDefault, mostly } from '../src/components/wifi/sort.ts';
import { catPlural, group, isLodging } from '../src/components/wifi/labels.ts';

const OUT = new URL('../src/data/wifi/', import.meta.url);
const DATE_FILE = new URL('../src/data/wifi-date.ts', import.meta.url);
const UA = 'free-tools-wifi-finder/0.2 (data refresh for a static free public WiFi finder; one query per city, a few times a year)';
const CITIES = [
  { name: 'Austin', state: 'TX', slug: 'austin-tx', center: [30.2672, -97.7431] },
  { name: 'New York', state: 'NY', slug: 'new-york-ny', center: [40.7128, -74.006], bbox: [[40.49, -74.27, 40.70, -73.98], [40.49, -73.98, 40.70, -73.70], [40.70, -74.27, 40.92, -73.98], [40.70, -73.98, 40.92, -73.70]] },
  { name: 'San Francisco', state: 'CA', slug: 'san-francisco-ca', center: [37.7749, -122.4194] },
  { name: 'Chicago', state: 'IL', slug: 'chicago-il', center: [41.8781, -87.6298], bbox: [[41.64, -87.94, 42.02, -87.52]] },
  { name: 'Seattle', state: 'WA', slug: 'seattle-wa', center: [47.6062, -122.3321] },
];

// bbox (south,west,north,east) is the fallback when the area query times out on big cities.
const query = (c, b) => b ? `[out:json][timeout:180];
nwr["internet_access"~"^(wlan|wifi)$"](${b.join(',')});
out center tags;` : `[out:json][timeout:120];
area["ISO3166-2"="US-${c.state}"]["admin_level"="4"]->.st;
area["name"="${c.name}"]["boundary"="administrative"]["admin_level"~"^(5|6|8)$"](area.st)->.a;
nwr["internet_access"~"^(wlan|wifi)$"](area.a);
out center tags;`;

// ---------- Inclusion rule (10.1): only places that offer WiFi to the public ----------
const GONE = ['disused:', 'was:', 'abandoned:', 'demolished:', 'razed:', 'removed:'];
const is = (v, ...xs) => xs.includes(v);

/** Why a named, located element is left out, or null to keep it. Checked in the spec's order. */
function dropReason(t) {
  if (is(t.type, 'route', 'route_master') || t.route) return 'transit line';
  if (t.disused === 'yes' || Object.keys(t).some((k) => GONE.some((p) => k.startsWith(p)))) return 'closed';
  const a = t['internet_access:access'] ?? t.access;
  if (is(a, 'private', 'no')) return 'private';
  if (t['internet_access:access'] === 'yes') return null;
  const venue = t.amenity || t.shop || t.tourism || t.leisure;
  if (t.office) return 'office';
  if (is(t.amenity, 'school', 'college', 'university', 'kindergarten') || (!venue && is(t.building, 'school', 'college', 'university'))) return 'school or university';
  if (is(t.tourism, 'apartment', 'chalet', 'caravan_site', 'camp_site')) return 'private rental or RV park';
  if (is(t.amenity, 'social_facility', 'studio', 'nursing_home') || is(t.healthcare, 'rehabilitation', 'nursing_home')) return 'care facility';
  if (t.landuse === 'residential' || (!venue && is(t.building, 'house', 'residential', 'apartments', 'detached'))) return 'residential';
  return null;
}

// ---------- Category and status ----------
const CAT_KEYS = ['amenity', 'tourism', 'shop', 'leisure', 'craft', 'aeroway', 'public_transport'];

function category(t) {
  for (const k of CAT_KEYS) {
    const v = t[k]?.split(';')[0].trim();
    if (v && v !== 'yes') return v; // "shop=yes" says nothing about the place; try the next key
  }
  if (t.healthcare) return 'clinic';
  if (is(t.building, 'hotel', 'hostel')) return t.building;
  return 'other';
}

const lodging = (t) => is(t.tourism, 'hotel', 'motel', 'hostel', 'guest_house') || is(t.building, 'hotel', 'hostel');
const waitingRoom = (t) => is(t.amenity, 'clinic', 'doctors', 'dentist', 'hospital', 'veterinary') || Boolean(t.healthcare)
  || is(t.shop, 'car_repair', 'tyres', 'car', 'laundry', 'dry_cleaning', 'hairdresser', 'beauty', 'massage');

function status(t) {
  const fee = t['internet_access:fee'];
  const ia = t['internet_access:access'];
  let s = fee === 'no' ? 'free' : is(fee, 'yes', 'customers') ? 'customers' : 'unknown';
  if (ia === 'customers') s = 'customers';
  // Hotels and waiting rooms that list free WiFi mean free for guests and customers, not for anyone walking in.
  if (s === 'free' && ia !== 'yes' && (lodging(t) || waitingRoom(t))) s = 'customers';
  return s;
}

const typographic = (s) => s.trim().replace(/'/g, '’'); // CRAFT-07: "Applebee’s"
const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

function normalize(el) {
  const t = el.tags || {};
  const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
  if (!t.name || lat == null) return null;
  const first = (v) => v?.split(';')[0].trim(); // "236;240;242" lists several numbers: keep the first
  const street = [first(t['addr:housenumber']), first(t['addr:street'])].filter(Boolean).join(' ');
  const checked = t['check_date:internet_access'] || t.check_date;
  return {
    id: `${el.type[0]}${el.id}`,
    name: typographic(t.name),
    lat: +lat.toFixed(5),
    lon: +lon.toFixed(5),
    category: category(t),
    address: typographic([street, t['addr:city']].filter(Boolean).join(', ')),
    fee: status(t),
    access: t['internet_access:access'] ?? t.access ?? null,
    osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    lastEdited: DATE.test(checked ?? '') ? checked : null,
    _drop: dropReason(t),
  };
}

// ---------- Fetch ----------
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(c, b) {
  const res = await fetch(process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(query(c, b)),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).elements;
}

async function fetchCity(c) {
  // OVERPASS_SAVED=<folder>: re-apply the rule to a saved raw response (<folder>/<slug>.json) instead of querying again.
  if (process.env.OVERPASS_SAVED) return JSON.parse(await readFile(`${process.env.OVERPASS_SAVED}/${c.slug}.json`, 'utf8')).elements;
  const elements = [];
  for (const [j, b] of (c.bbox ?? [null]).entries()) {
    if (j) await pause(8000);
    elements.push(...(await overpass(c, b)));
  }
  return elements;
}

// ---------- Summary ----------
const monYear = (d) => new Date(`${d.slice(0, 7).padEnd(7, '-01')}-15T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

function summary(c, items, was, dropped) {
  const count = (f) => items.filter(f).length;
  const free = items.filter((p) => p.fee === 'free');
  const customers = items.filter((p) => p.fee === 'customers');
  const dated = items.filter((p) => p.lastEdited).map((p) => p.lastEdited).sort();
  const types = new Map();
  for (const p of items) types.set(group(p.category), (types.get(group(p.category)) ?? 0) + 1);
  const first = [...items].sort(compareDefault).slice(0, 3)
    .map((p) => `${p.name} (${[p.category, p.address.split(',')[0]].filter(Boolean).join(', ')}${p.lastEdited ? `, ${p.lastEdited}` : ''})`);
  const reasons = [...dropped].sort((a, b) => b[1] - a[1]).map(([r, n]) => `${n} ${r}`).join(', ');
  console.log([
    `${c.name}, ${c.state}`,
    `  places ${items.length} (was ${was ?? '?'})`,
    `  free ${free.length} (libraries ${count((p) => p.fee === 'free' && p.category === 'library')})`,
    `  customers ${customers.length} (guests ${customers.filter((p) => isLodging(p.category)).length})`,
    `  ask staff ${count((p) => p.fee === 'unknown')}`,
    `  with a check date ${dated.length}, newest ${dated.length ? monYear(dated.at(-1)) : 'none'}`,
    `  dropped ${[...dropped.values()].reduce((a, b) => a + b, 0)}: ${reasons || 'none'}`,
    `  free places mostly: ${mostly(items).map((g) => catPlural(g)).join(' and ') || 'none'}`,
    `  places to stay ${types.get('stay') ?? 0}; types ${[...types].sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${n}`).join(', ')}`,
    `  first rows: ${first.join('; ')}`,
  ].join('\n'));
}

// ---------- Run ----------
await mkdir(OUT, { recursive: true });
const only = process.argv.slice(2);
const index = JSON.parse(await readFile(new URL('cities.json', OUT), 'utf8').catch(() => '[]'));
const failed = [];
for (const [i, c] of CITIES.filter((c) => !only.length || only.includes(c.slug)).entries()) {
  if (i) await pause(8000);
  let elements;
  try {
    elements = await fetchCity(c);
  } catch (e) {
    console.error(`${c.slug}: ${e.message}; retrying once in 60 s`);
    await pause(60_000);
    try { elements = await fetchCity(c); } catch (e2) {
      console.error(`${c.slug}: ${e2.message} again; keeping the old file`);
      failed.push(c.slug);
      continue;
    }
  }
  const was = await readFile(new URL(`${c.slug}.json`, OUT), 'utf8').then((s) => JSON.parse(s).length, () => null);
  const seen = new Set(), dropped = new Map(), items = [];
  for (const x of elements.map(normalize)) {
    if (!x || seen.has(x.id)) continue;
    seen.add(x.id);
    const { _drop, ...place } = x;
    if (_drop) dropped.set(_drop, (dropped.get(_drop) ?? 0) + 1);
    else items.push(place);
  }
  items.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  await writeFile(new URL(`${c.slug}.json`, OUT), JSON.stringify(items));
  const entry = { name: c.name, state: c.state, slug: c.slug, count: items.length, center: c.center };
  const k = index.findIndex((x) => x.slug === c.slug);
  if (k >= 0) index[k] = entry; else index.push(entry);
  summary(c, items, was, dropped);
}
const order = CITIES.map((c) => c.slug);
index.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
await writeFile(new URL('cities.json', OUT), JSON.stringify(index, null, 1));
if (failed.length) {
  console.error(`Not refreshed: ${failed.join(', ')}. WIFI_DATA_DATE left unchanged.`);
  process.exitCode = 1;
} else {
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
  await writeFile(DATE_FILE, `// Written by scripts/fetch-wifi.mjs: the date of the last data refresh.\nexport const WIFI_DATA_DATE: string = '${today}';\n`);
}
