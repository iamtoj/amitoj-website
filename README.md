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
tool. It creates a preview using the existing project settings, exact
dependency lock, images, and protected files. After the preview passes, submit
the same complete file set with `target: production`. Check the production
build and live routes, then retain its file references in the private manifest
for the next release. A Git-only checkout
does not contain the private files needed for a hosted release.

Automatic Git deployments from `main` are disabled in `vercel.json`. Pushes
save the public source; releases use the complete file request above. This
prevents duplicate Git builds from failing because the private agenda and its
access controls are absent from the public checkout. Other branches keep their
existing deployment settings. The hosted-build guard still rejects an
incomplete release.

The writing revision and source qualifications are recorded in
`docs/reviews/2026-10-09-writing-update.md`.
