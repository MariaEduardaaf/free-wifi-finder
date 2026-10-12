// site-pages 11: every indexable route, no 404. Static endpoint, no dependency.
import type { APIRoute } from 'astro';
import cities from '../data/wifi/cities.json';
import { WIFI_DATA_DATE } from '../data/shared';
import { SITE } from '../site';

// ponytail: one "Last updated" date for every page, because every page shows October 12, 2026 today. When a page's
// date changes on its own, give that route its own date here.
const UPDATED = '2026-10-12';
const WIFI = WIFI_DATA_DATE > UPDATED ? WIFI_DATA_DATE : UPDATED;

const routes: [path: string, lastmod: string][] = [
  ...['/about/', '/contact/', '/privacy/', '/terms/', '/method/', '/accessibility/'].map((p): [string, string] => [p, UPDATED]),
  ['/', WIFI],
  ...cities.map((c): [string, string] => [`/${c.slug}/`, WIFI]),
];

export const GET: APIRoute = () => new Response(
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    .map(([p, d]) => `  <url><loc>${new URL(p, SITE.url).href}</loc><lastmod>${d}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
  { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
);
