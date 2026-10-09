import { existsSync } from 'node:fs';

// Production includes a protected agenda whose files are retained privately.
// A checkout lacking its middleware must not become a hosted replacement.
if (process.env.VERCEL) {
  const required = [
    'middleware.js',
    'public/researchagendajune2026.html',
    'public/research-agenda-june-2026/index.html',
  ];
  const missing = required.filter((path) => !existsSync(path));
  if (missing.length) {
    console.error('Hosted build stopped: attach the retained protected production files before deploying.');
    console.error(missing.join('\n'));
    process.exit(1);
  }
}
