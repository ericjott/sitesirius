"""Extract translatable Portuguese segments from the site's HTML pages.
Usage: python i18n/extract.py  -> writes i18n/segments.json (unique segments in order)"""
import re, json, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = [p for p in sorted(glob.glob(os.path.join(ROOT, '*.html'))) if not p.endswith('projeto-mecanico-3d.html')]
ATTRS = ('alt', 'title', 'aria-label', 'placeholder')
META_KEYS = ('description', 'og:title', 'og:description', 'twitter:title', 'twitter:description')
LETTER = re.compile(r'[A-Za-zÀ-ÿ]')

def segments(html):
    out = []
    html = re.sub(r'<!-- i18n:(\w+) -->.*?<!-- /i18n:\1 -->', '', html, flags=re.S)
    body = re.sub(r'<(script|style|svg)\b.*?</\1>', lambda m: '\0' * len(m.group(0)), html, flags=re.S)
    for m in re.finditer(r'>([^<>]+)<', body):
        t = m.group(1).strip()
        if t and '\0' not in t and LETTER.search(t): out.append(t)
    for m in re.finditer(r'\s(?:%s)="([^"]+)"' % '|'.join(ATTRS), body):
        if LETTER.search(m.group(1)): out.append(m.group(1).strip())
    for m in re.finditer(r'<meta\s+(?:name|property)="([^"]+)"\s+content="([^"]+)"', html):
        if m.group(1) in META_KEYS: out.append(m.group(2).strip())
    for m in re.finditer(r'<meta\s+content="([^"]+)"\s+(?:name|property)="([^"]+)"', html):
        if m.group(2) in META_KEYS: out.append(m.group(1).strip())
    for m in re.finditer(r'<input type="(?:hidden|checkbox)" name="(?:_subject|consentimento)" value="([^"]+)"', html):
        out.append(m.group(1).strip())
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, flags=re.S):
        def walk(o, key=None):
            if isinstance(o, dict):
                for k, v in o.items(): walk(v, k)
            elif isinstance(o, list):
                for v in o: walk(v, key)
            elif isinstance(o, str) and key not in ('@context', '@type', '@id', 'url', 'logo', 'image', 'email', 'telephone', 'sameAs', 'inLanguage', 'legalName') and LETTER.search(o) and not o.startswith('http'):
                out.append(o)
        walk(json.loads(m.group(1)))
    return out

if __name__ == '__main__':
    # Prints segments that have no translation in i18n/en.json yet, grouped by page.
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    path = os.path.join(ROOT, 'i18n', 'en.json')
    done = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
    seen = set(done)
    for p in PAGES:
        new = []
        for s in segments(open(p, encoding='utf-8').read()):
            if s not in seen: seen.add(s); new.append(s)
        if new:
            print('##', os.path.basename(p))
            for s in new: print(json.dumps(s, ensure_ascii=False))
