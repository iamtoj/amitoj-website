# Amitoj website

The source of [amitoj.co](https://www.amitoj.co), built with Astro 4 and
Tailwind CSS. Public pages are in `src/pages`, notes in `src/content/blog`,
and images in `public`.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

The development server runs at `http://localhost:4321`. Existing Markdown
reading copies can be refreshed after a build with
`python3 scripts/refresh-reading-copies.py`. Edit the published source files;
the copies identify their source path and SHA-256. See `content-source/README.md`.

Blog notes with `draft: true` appear neither in Writing nor as built routes.
Keep unpublished essays and historical versions outside the public source
collection.

The live Vercel project is **amitoj-website**, linked in `.vercel/project.json`.
It already serves `www.amitoj.co` and `amitoj.co`; no new project or DNS change
is needed. The live project also contains a password-protected June research
agenda. Its private source and middleware are retained by the deployment
service rather than published in this repository. Hosted builds stop if
those files are missing.

To prepare a release, retain the existing production files in the private
`.vercel/production-preserved-files.json` manifest, then run:

```sh
npm run build
python3 scripts/refresh-reading-copies.py
python3 scripts/deployment-files.py
```

Submit the generated request through the authenticated Vercel deployment
tool. It creates a preview using the existing production settings and
environment, exact dependency lock, images, and protected files. Check the
build and routes, then promote the reviewed deployment. A Git-only checkout
does not contain the private files needed for a hosted release.

The writing revision and source qualifications are recorded in
`docs/reviews/2026-10-09-writing-update.md`.
