// VenueRow (DESIGN-SYSTEM 3.11): one template for the 20 server-rendered rows and the client. Every data string
// goes through esc(). The PlaceCard reuses the meta and status lines.
import { esc } from '../ui/html.ts';
import { icon, statusShape } from '../ui/icons.ts';
import { badgeText, catLabel, type Fee } from './labels.ts';
import { fmtMiles, type Place } from './sort.ts';

const TONE: Record<Fee, string> = { free: 'good', customers: 'caution', unknown: 'neutral' };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Checked Jul 2026", "Checked 2013", or "" without a date. */
export const checkedText = (d: string | null) =>
  !d ? '' : d.length >= 7 ? `Checked ${MON[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}` : `Checked ${d.slice(0, 4)}`;

export const directionsUrl = (p: Place) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`;
export const reportUrl = (p: Place) => `https://www.openstreetmap.org/note/new#map=19/${p.lat}/${p.lon}`;

/** "Cafe, 406 Walsh Street"; after Near me "0.4 mi away, Cafe, 406 Walsh Street". */
export const metaHTML = (p: Place, mi?: number) =>
  (mi === undefined ? '' : `<span class="num">${fmtMiles(mi)}</span> away, `) + esc(catLabel(p.category)) + (p.address ? `, ${esc(p.address)}` : '');

/** Badge (StatusBadge markup) plus the check date. */
export const statusHTML = (p: Place) => {
  const date = checkedText(p.lastEdited);
  return `<span class="badge badge--${TONE[p.fee]}">${statusShape(p.fee, 16)}${esc(badgeText(p.fee, p.category))}</span>`
    + (date ? `<span class="row__date">${date}</span>` : '');
};

/** The Directions link of a row and of the place card (secondary, small). */
export const directionsHTML = (p: Place, cls = '') =>
  `<a class="btn btn--secondary btn--sm${cls}" href="${esc(directionsUrl(p))}" target="_blank" rel="noopener">${icon('navigation')}<span>Directions</span><span class="sr-only"> to ${esc(p.name)}, opens Google Maps in a new tab</span></a>`;

/** PlaceCard actions: Directions (secondary, as in the rows), "Show in list" (phones), "Report a problem". */
export const cardActionsHTML = (p: Place) => directionsHTML(p)
  + '<button class="btn btn--quiet btn--sm placecard__tolist" type="button" data-to-list>Show in list</button>'
  + `<a class="btn btn--quiet btn--sm" href="${esc(reportUrl(p))}" target="_blank" rel="noopener">${icon('flag', 16)}<span>Report a problem</span><span class="sr-only"> with ${esc(p.name)}, opens OpenStreetMap in a new tab</span></a>`;

/** One row. `interactive` makes the title the "show on map" button; without JavaScript it is plain text. */
export function rowHTML(p: Place, o: { mi?: number; interactive?: boolean } = {}): string {
  const name = esc(p.name);
  const title = o.interactive
    ? `<button class="row__target" type="button">${name}<span class="sr-only">, show on map</span></button>`
    : `<span class="row__target">${name}</span>`;
  return `<li class="row venue" data-id="${esc(p.id)}"><h3 class="row__title">${title}</h3>${directionsHTML(p, ' row__action')}`
    + `<p class="row__meta">${metaHTML(p, o.mi)}</p><p class="row__status">${statusHTML(p)}</p></li>`;
}
