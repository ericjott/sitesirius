// Vercel Routing Middleware — language by visitor location.
// Visitors from outside Portuguese-speaking countries who open a Portuguese page are sent
// to its English version under /en/. Search engines and ad crawlers are never redirected
// (both languages stay indexable), and a manual choice (?lang=pt|en) is remembered in a cookie.
import ROUTES from './i18n/routes.js';

export const config = {
  matcher: ['/((?!assets/|styles/|scripts/|vendor/|downloads/|api/|uav-app/|uav-designer|_vercel/|i18n/|favicon).*)']
};

const PT_COUNTRIES = new Set(['BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL']);
const BOTS = /bot|crawl|spider|slurp|google|bing|yandex|baidu|duckduck|facebookexternalhit|linkedin|twitter|whatsapp|telegram|semrush|ahrefs|lighthouse|pagespeed|headless|preview/i;
const COOKIE = 'site_lang';
const PT_TO_EN = Object.fromEntries(Object.entries(ROUTES).map(([pt, en]) => ['/' + pt.replace(/^index\.html$/, ''), en]));
const EN_TO_PT = Object.fromEntries(Object.entries(PT_TO_EN).map(([pt, en]) => [en, pt]));

const normalize = (path) => (path === '/index.html' ? '/' : path === '/en' || path === '/en/index.html' ? '/en/' : path);

const redirect = (url, cookieLang) => {
  const headers = new Headers({ Location: url, 'Cache-Control': 'private, no-store', Vary: 'Cookie' });
  if (cookieLang) headers.append('Set-Cookie', `${COOKIE}=${cookieLang}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
  return new Response(null, { status: 307, headers });
};

export default function middleware(request) {
  const url = new URL(request.url);
  const path = normalize(url.pathname);

  // Manual language switch: /page?lang=en  -> remember and go to that language's page.
  const chosen = url.searchParams.get('lang');
  if (chosen === 'en' || chosen === 'pt') {
    url.searchParams.delete('lang');
    const target = chosen === 'en' ? (PT_TO_EN[path] || path) : (EN_TO_PT[path] || path);
    return redirect(target + url.search + url.hash, chosen);
  }

  const cookie = request.headers.get('cookie') || '';
  if (new RegExp(`(?:^|;\\s*)${COOKIE}=`).test(cookie)) return;
  if (BOTS.test(request.headers.get('user-agent') || '')) return;

  const country = (request.headers.get('x-vercel-ip-country') || '').toUpperCase();
  if (!country || PT_COUNTRIES.has(country)) return;

  const en = PT_TO_EN[path];
  if (en) return redirect(en + url.search);
}
