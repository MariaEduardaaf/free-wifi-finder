// node --experimental-strip-types src/components/wifi/sort.check.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareDefault, sortByDistance, fmtMiles, mostly, type Place } from './sort.ts';
import { badgeText, catPlural, group, groupLabel } from './labels.ts';

const p = (o: Partial<Place>): Place => ({ id: 'x', name: 'A', lat: 0, lon: 0, category: 'other', address: '', fee: 'unknown', lastEdited: null, ...o });
const names = (xs: Place[]) => xs.map((x) => x.name);

// 1. fee group, 2. dated first, 3. newest first, 4. category priority, 5. name A to Z
assert.deepEqual(names([p({ name: 'U', fee: 'unknown' }), p({ name: 'C', fee: 'customers' }), p({ name: 'F', fee: 'free' })].sort(compareDefault)), ['F', 'C', 'U']);
assert.deepEqual(names([p({ name: 'undated' }), p({ name: 'old', lastEdited: '2013' }), p({ name: 'new', lastEdited: '2026-07-06' }), p({ name: 'month', lastEdited: '2026-08' })].sort(compareDefault)), ['month', 'new', 'old', 'undated']);
assert.deepEqual(names([p({ name: 'Bar', category: 'bar' }), p({ name: 'Zoo', category: 'zoo' }), p({ name: 'Lib', category: 'library' }), p({ name: 'Coffee', category: 'coffee' }), p({ name: 'Inn', category: 'motel' })].sort(compareDefault)), ['Lib', 'Coffee', 'Bar', 'Inn', 'Zoo']);
assert.deepEqual(names([p({ name: 'Ben’s' }), p({ name: 'Applebee’s' })].sort(compareDefault)), ['Applebee’s', 'Ben’s']);

// Real data: Austin's default order (WC-02)
const austin = (JSON.parse(readFileSync(new URL('../../data/wifi/austin-tx.json', import.meta.url), 'utf8')) as Place[]).sort(compareDefault);
assert.equal(austin[0].name, 'Better Half Coffee & Cocktails');
const firstNonFree = austin.findIndex((x) => x.fee !== 'free');
assert.ok(firstNonFree > 0 && austin.slice(firstNonFree).every((x) => x.fee !== 'free'), 'all free places come first');
const free = austin.slice(0, firstNonFree);
const firstUndated = free.findIndex((x) => !x.lastEdited);
assert.ok(free.slice(firstUndated).every((x) => !x.lastEdited), 'dated before undated');
assert.ok(free.slice(0, firstUndated).every((x, i, a) => i === 0 || a[i - 1].lastEdited! >= x.lastEdited!), 'newest first');

// Distance: nearest first, ties in the default order; distances typeset with a no-break space
const near = sortByDistance([p({ name: 'far', lat: 1 }), p({ name: 'tie-unknown', lat: 0.1 }), p({ name: 'tie-free', lat: 0.1, fee: 'free' })], 0, 0);
assert.deepEqual(near.map((x) => x.place.name), ['tie-free', 'tie-unknown', 'far']);
assert.ok(Math.abs(near[2].mi - 69.09) < 0.1, 'one degree of latitude is about 69 mi');
assert.equal(fmtMiles(0.43), '0.4 mi');
assert.equal(fmtMiles(0.01), '0.1 mi');
assert.equal(fmtMiles(12.4), '12 mi');

// "Mostly": counts of free places, other excluded, cafe and coffee together, ties by priority then label
assert.deepEqual(mostly([p({ fee: 'free', category: 'coffee' }), p({ fee: 'free', category: 'cafe' }), p({ fee: 'free', category: 'supermarket' }), p({ fee: 'free', category: 'restaurant' }), p({ fee: 'free', category: 'other' }), p({ fee: 'free', category: 'other' }), p({ fee: 'free', category: 'other' })]), ['cafe', 'restaurant']);
assert.deepEqual(mostly([p({ fee: 'free', category: 'restaurant' }), p({ fee: 'free', category: 'library' })]), ['library', 'restaurant']);
assert.deepEqual(mostly([p({ fee: 'free', category: 'museum' }), p({ fee: 'free', category: 'bakery' })]), ['bakery', 'museum']);
assert.deepEqual(mostly([p({ fee: 'customers', category: 'cafe' })]), []);
assert.deepEqual(mostly(austin).map((g) => catPlural(g)), ['cafes', 'restaurants']);

// Labels
assert.equal(group('guest_house'), 'stay');
assert.equal(groupLabel('stay'), 'Places to stay');
assert.equal(groupLabel('fast_food'), 'Fast food');
assert.equal(groupLabel('library'), 'Libraries');
assert.equal(badgeText('customers', 'hostel'), 'Customers only (guests)');
assert.equal(badgeText('customers', 'cafe'), 'Customers only');
assert.equal(badgeText('unknown', 'hotel'), 'Ask staff');

console.log('sort.check: all passed');
