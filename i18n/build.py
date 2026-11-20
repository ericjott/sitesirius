"""Build the English site (/en/) from the Portuguese pages.

    python i18n/build.py

- Reads i18n/routes.json (PT file -> EN URL), i18n/en.json ({pt segment: en segment})
  and i18n/en-extra.json (raw string replacements, e.g. text inside inline scripts).
- Writes en/*.html, i18n/routes.js (for middleware.js) and sitemap.xml.
- Adds hreflang alternates and the PT/EN language switch to every PT page (idempotent).
Edit the PT pages, re-run i18n/extract.py to see new segments, add their translations
to i18n/en.json, then run this script again.
"""
import json, os, re, sys, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extract

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://www.siriusdynamics.com.br'
I18N = os.path.join(ROOT, 'i18n')
ROUTES = json.load(open(os.path.join(I18N, 'routes.json'), encoding='utf-8'))
EN = json.load(open(os.path.join(I18N, 'en.json'), encoding='utf-8'))
EXTRA = json.load(open(os.path.join(I18N, 'en-extra.json'), encoding='utf-8'))
ASSET_DIRS = ('assets/', 'styles/', 'scripts/', 'vendor/', 'downloads/', 'uav-designer/', 'uav-app/')
NOINDEX = ('privacidade.html', 'termos-de-uso.html')

missing = {}


def pt_url(name):
    return SITE + '/' + ('' if name == 'index.html' else name)


def en_url(name):
    return SITE + ROUTES[name]


def tr(text, page):
    key = text.strip()
    if not key or not extract.LETTER.search(key):
        return text
    if key in EN:
        lead = text[:len(text) - len(text.lstrip())]
        trail = text[len(text.rstrip()):]
        return lead + EN[key] + trail
    missing.setdefault(page, []).append(key)
    return text


def mask_blocks(html):
    """Return list of (is_code, chunk) so code blocks are left untouched."""
    parts, pos = [], 0
    for m in re.finditer(r'<(script|style|svg)\b.*?</\1>', html, flags=re.S):
        parts.append((False, html[pos:m.start()]))
        parts.append((True, m.group(0)))
        pos = m.end()
    parts.append((False, html[pos:]))
    return parts


def translate_markup(chunk, page):
    chunk = re.sub(r'>([^<>]+)<', lambda m: '>' + tr(m.group(1), page) + '<', chunk)
    chunk = re.sub(r'(\s(?:%s)=")([^"]+)(")' % '|'.join(extract.ATTRS), lambda m: m.group(1) + tr(m.group(2), page) + m.group(3), chunk)
    chunk = re.sub(r'(<meta\s+(?:name|property)="(%s)"\s+content=")([^"]+)(")' % '|'.join(extract.META_KEYS), lambda m: m.group(1) + tr(m.group(3), page) + m.group(4), chunk)
    chunk = re.sub(r'(<meta\s+content=")([^"]+)("\s+(?:name|property)="(?:%s)")' % '|'.join(extract.META_KEYS), lambda m: m.group(1) + tr(m.group(2), page) + m.group(3), chunk)
    chunk = re.sub(r'(<input type="(?:hidden|checkbox)" name="(?:_subject|consentimento)" value=")([^"]+)(")', lambda m: m.group(1) + tr(m.group(2), page) + m.group(3), chunk)
    return chunk


def translate_jsonld(block, page, name):
    m = re.match(r'(<script type="application/ld\+json">)(.*?)(</script>)', block, re.S)
    data = json.loads(m.group(2))

    def walk(o, key=None):
        if isinstance(o, dict):
            return {k: walk(v, k) for k, v in o.items()}
        if isinstance(o, list):
            return [walk(v, key) for v in o]
        if isinstance(o, str):
            if key == 'inLanguage':
                return 'en'
            if key == 'url' and o.startswith(SITE):
                rel = o[len(SITE) + 1:].split('#')[0]
                for pt, en in ROUTES.items():
                    if rel == ('' if pt == 'index.html' else pt):
                        return SITE + en + (('#' + o.split('#', 1)[1]) if '#' in o else '')
                return o
            if key in ('@context', '@type', '@id', 'url', 'logo', 'image', 'email', 'telephone', 'sameAs', 'legalName') or o.startswith('http'):
                return o
            return tr(o, page)
        return o
    return m.group(1) + json.dumps(walk(data), ensure_ascii=False) + m.group(3)


def rewrite_links(html):
    def page_link(target):
        base, _, frag = target.partition('#')
        if base in ROUTES:
            return ROUTES[base] + ('#' + frag if frag else '')
        if base.endswith('.html') and '/' not in base:
            return '/' + target
        return target

    def attr(m):
        name, val = m.group(1), m.group(2)
        if val.startswith(ASSET_DIRS):
            val = '/' + val
        elif name == 'href':
            val = page_link(val)
        elif name == 'srcset':
            val = ', '.join(('/' + p if p.startswith(ASSET_DIRS) else p) for p in val.split(', '))
        return f'{name}="{val}"'
    html = re.sub(r'\b(src|href|poster|srcset|data-src)="([^"]*)"', attr, html)
    html = re.sub(r"url\((['\"]?)((?:%s)[^)'\"]*)\1\)" % '|'.join(re.escape(d) for d in ASSET_DIRS), lambda m: f"url({m.group(1)}/{m.group(2)}{m.group(1)})", html)
    return html


def alternates(name):
    return ('<!-- i18n:alternates -->'
            f'<link rel="alternate" hreflang="pt-BR" href="{pt_url(name)}" />'
            f'<link rel="alternate" hreflang="en" href="{en_url(name)}" />'
            f'<link rel="alternate" hreflang="x-default" href="{en_url(name)}" />'
            '<!-- /i18n:alternates -->')


SWITCH_CSS = ('.lang-switch{background:rgba(10,12,16,.86);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.22);border-left:0;border-radius:0 10px 10px 0;display:flex;flex-direction:column;font:600 11px/1 system-ui,-apple-system,Segoe UI,sans-serif;gap:2px;left:0;letter-spacing:.08em;padding:4px;position:fixed;top:50%;transform:translateY(-50%);z-index:10001}'
              '.lang-switch a,.lang-switch span{border-radius:7px;color:#fff;padding:8px 7px;text-align:center;text-decoration:none}'
              '.lang-switch span{background:#fff;color:#0a0c10}.lang-switch a:hover,.lang-switch a:focus-visible{background:rgba(255,255,255,.18)}'
              '@media(max-width:760px){.lang-switch{border-left:1px solid rgba(255,255,255,.22);border-radius:999px;bottom:16px;flex-direction:row;left:16px;top:auto;transform:none}.lang-switch a,.lang-switch span{border-radius:999px;padding:8px 10px}}')


def switch(name, lang):
    pt_href = ('/' if name == 'index.html' else name) + '?lang=pt'
    en_href = ROUTES[name] + '?lang=en'
    if lang == 'en':
        pt_href = '/' + ('' if name == 'index.html' else name) + '?lang=pt'
        inner = f'<a href="{pt_href}" hreflang="pt-BR" lang="pt-BR" title="Ver em português">PT</a><span aria-current="true">EN</span>'
        label = 'Language'
    else:
        inner = f'<span aria-current="true">PT</span><a href="{en_href}" hreflang="en" lang="en" title="View in English">EN</a>'
        label = 'Idioma'
    return f'<!-- i18n:switch --><style>{SWITCH_CSS}</style><nav class="lang-switch" aria-label="{label}">{inner}</nav><!-- /i18n:switch -->'


def strip_i18n(html):
    return re.sub(r'<!-- i18n:(\w+) -->.*?<!-- /i18n:\1 -->\n?', '', html, flags=re.S)


def inject(html, name, lang):
    html = strip_i18n(html)
    html = html.replace('</head>', '  ' + alternates(name) + '\n  </head>', 1) if '</head>' in html else html
    html = re.sub(r'(</body>)', switch(name, lang) + '\n' + r'\1', html, count=1)
    return html


def build_en(name):
    src = open(os.path.join(ROOT, name), encoding='utf-8').read()
    html = strip_i18n(src)
    out = []
    for is_code, chunk in mask_blocks(html):
        if is_code and chunk.startswith('<script type="application/ld+json">'):
            chunk = translate_jsonld(chunk, name, name)
        elif not is_code:
            chunk = translate_markup(chunk, name)
        out.append(chunk)
    html = ''.join(out)
    for pt, en in EXTRA.items():
        html = html.replace(pt, en)
    html = html.replace('lang="pt-BR"', 'lang="en"', 1)
    html = html.replace('content="pt_BR"', 'content="en_US"')
    html = re.sub(r'(<link rel="canonical" href=")[^"]*(")', lambda m: m.group(1) + en_url(name) + m.group(2), html)
    html = re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + en_url(name) + m.group(2), html)
    html = re.sub(r'(<meta content=")[^"]*(" property="og:url")', lambda m: m.group(1) + en_url(name) + m.group(2), html)
    html = re.sub(r'(name="_url" value=")' + re.escape(pt_url(name)), lambda m: m.group(1) + en_url(name), html)
    html = rewrite_links(html)
    return inject(html, name, 'en')


def main():
    os.makedirs(os.path.join(ROOT, 'en'), exist_ok=True)
    for name, en_path in ROUTES.items():
        path = os.path.join(ROOT, name)
        src = open(path, encoding='utf-8').read()
        pt = inject(src, name, 'pt')
        if pt != src:
            open(path, 'w', encoding='utf-8', newline='').write(pt)
        target = os.path.join(ROOT, en_path.lstrip('/'), 'index.html') if en_path.endswith('/') else os.path.join(ROOT, en_path.lstrip('/'))
        open(target, 'w', encoding='utf-8', newline='').write(build_en(name))
    with open(os.path.join(I18N, 'routes.js'), 'w', encoding='utf-8', newline='') as f:
        f.write('// Generated by i18n/build.py from routes.json — do not edit.\nexport default ' + json.dumps(ROUTES, indent=2) + ';\n')
    today = datetime.date.today().isoformat()
    urls = []
    for name in ROUTES:
        if name in NOINDEX:
            continue
        for loc in (pt_url(name), en_url(name)):
            urls.append(f'  <url><loc>{loc}</loc><lastmod>{today}</lastmod>'
                        f'<xhtml:link rel="alternate" hreflang="pt-BR" href="{pt_url(name)}"/>'
                        f'<xhtml:link rel="alternate" hreflang="en" href="{en_url(name)}"/>'
                        f'<xhtml:link rel="alternate" hreflang="x-default" href="{en_url(name)}"/></url>')
    urls.append(f'  <url><loc>{SITE}/uav-designer/</loc><lastmod>{today}</lastmod></url>')
    with open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8', newline='') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + '\n'.join(urls) + '\n</urlset>\n')
    if missing:
        total = sum(len(v) for v in missing.values())
        print(f'MISSING {total} translations:')
        for page, items in missing.items():
            for i in dict.fromkeys(items):
                print(f'  [{page}] {i}')
    else:
        print('All segments translated.')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
