"""Assemble a complete preview request, retaining private production files."""
from pathlib import Path
import hashlib
import json
import sys

root = Path(__file__).resolve().parents[1]
manifest = root / '.vercel/production-preserved-files.json'
if not manifest.exists():
    sys.exit('Missing private production-file references; no deployment request written.')
preserved = json.loads(manifest.read_text())
required = {'middleware.js', 'public/researchagendajune2026.html',
            'public/research-agenda-june-2026/index.html', 'package-lock.json'}
assert {x['file'] for x in preserved['files']} == required
files = list(preserved['files'])
for folder in ['src', 'scripts', 'public']:
    for path in sorted((root / folder).rglob('*')):
        if not path.is_file() or path.name.startswith('.'):
            continue
        name = path.relative_to(root).as_posix()
        if name in required:
            continue
        content = path.read_bytes()
        if folder == 'public':
            files.append({'file': name, 'sha': hashlib.sha1(content).hexdigest(), 'size': len(content)})
        else:
            files.append({'file': name, 'data': content.decode(), 'encoding': 'utf-8'})
for name in ['package.json', 'astro.config.mjs', 'tailwind.config.mjs', 'tsconfig.json', 'vercel.json']:
    files.append({'file': name, 'data': (root / name).read_text(), 'encoding': 'utf-8'})
assert len({x['file'] for x in files}) == len(files)
request = {'teamId': preserved['teamId'], 'requestBody': {
    'name': 'amitoj-website', 'project': preserved['projectId'],
    'deploymentId': preserved['sourceDeploymentId'], 'files': files,
    'meta': {'purpose': 'writing update', 'reviewDate': '2026-10-09'},
}}
# No production target: the authenticated API creates a preview first.
output = Path(sys.argv[1]) if len(sys.argv) > 1 else root / '.vercel/preview-request.json'
output.write_text(json.dumps(request, ensure_ascii=False) + '\n')
print(f'Prepared {len(files)} files for preview in {output}.')
