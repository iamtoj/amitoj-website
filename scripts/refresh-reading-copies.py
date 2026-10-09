"""Refresh existing Markdown reading copies from the built public pages."""
from html.parser import HTMLParser
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
COPIES = {
    'pages/home.md': '',
    'pages/about.md': 'about',
    'pages/third-enlightenment.md': 'third-enlightenment',
    'work-projects.md': 'work',
    'yoga-offerings.md': 'yoga',
    **{f'essays/{slug}.md': f'essays/{slug}' for slug in (
        'architecture-of-commitment', 'strategic-time',
        'the-right-direction', 'what-rules-cant-capture')},
    **{f'library/{slug}-content.md': f'library/{slug}' for slug in (
        'parallels-and-paradoxes', 'rules', 'breath',
        'what-tech-calls-thinking', 'sovereignty-of-good')},
}

class ReadingCopy(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_main = False
        self.skip = 0
        self.parts = []
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'main':
            self.in_main = True
        if not self.in_main:
            return
        if tag in ('script', 'style'):
            self.skip += 1
        if self.skip:
            return
        if tag in ('p', 'section', 'article', 'div', 'ul', 'ol', 'blockquote'):
            self.parts.append('\n\n')
        if re.fullmatch('h[1-6]', tag):
            self.parts.append('\n\n' + '#' * int(tag[1]) + ' ')
        elif tag == 'li':
            self.parts.append('\n- ')
        elif tag in ('em', 'i'):
            self.parts.append('*')
        elif tag in ('strong', 'b'):
            self.parts.append('**')
        elif tag == 'br':
            self.parts.append('\n')
        elif tag == 'a':
            self.links.append(attrs.get('href', ''))
            self.parts.append('[')

    def handle_endtag(self, tag):
        if not self.in_main:
            return
        if tag in ('script', 'style'):
            self.skip = max(0, self.skip - 1)
            return
        if self.skip:
            return
        if tag == 'a':
            self.parts.append('](' + self.links.pop() + ')')
        elif tag in ('em', 'i'):
            self.parts.append('*')
        elif tag in ('strong', 'b'):
            self.parts.append('**')
        elif tag in ('p', 'section', 'article', 'div', 'ul', 'ol', 'blockquote') or re.fullmatch('h[1-6]', tag):
            self.parts.append('\n\n')
        if tag == 'main':
            self.in_main = False

    def handle_data(self, data):
        if self.in_main and not self.skip:
            self.parts.append(re.sub(r'\s+', ' ', data))

    def text(self):
        text = ''.join(self.parts)
        text = re.sub(r' *\n *', '\n', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip() + '\n'

for destination, route in COPIES.items():
    html = ROOT / 'dist' / route / 'index.html'
    parser = ReadingCopy()
    parser.feed(html.read_text())
    source = ROOT / 'src/pages' / (route + '.astro' if route else 'index.astro')
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    out = ROOT / 'content-source' / destination
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(f'---\nsource: {source.relative_to(ROOT)}\nsource-sha256: {digest}\nurl: /{route}\nstatus: derived reading copy; edit the source file\n---\n\n' + parser.text())
print(f'Refreshed {len(COPIES)} reading copies from dist/.')
