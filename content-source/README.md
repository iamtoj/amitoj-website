# Website reading copies

The published pages are written in `src/pages/*.astro` and
`src/pages/essays/*.astro`; notes are written in `src/content/blog/*.md`.
Library reviews are written in `src/pages/library/*.astro`.

The Markdown copies listed in `scripts/refresh-reading-copies.py` are for
reading and export. Edit the published source, then refresh these copies:

```sh
npm run build
python3 scripts/refresh-reading-copies.py
```

Each copy records its source path and SHA-256. Archive files, unpublished
drafts, and `photography-captions.md` retain their existing status; the
refresh script does not turn them into published pages.
