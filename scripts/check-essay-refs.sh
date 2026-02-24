#!/bin/bash
# Check for stale essay references across the website
# Run this before deploying or after removing essays

WEBSITE_DIR="$(dirname "$0")/.."
ESSAYS_PAGE="$WEBSITE_DIR/src/pages/essays.astro"
ESSAY_FILES="$WEBSITE_DIR/src/pages/essays"

echo "=== Essay Reference Checker ==="
echo ""

# Extract essay slugs from essays.astro (the source of truth)
VALID_SLUGS=$(grep -oE "slug: '[^']+'" "$ESSAYS_PAGE" | sed "s/slug: '//g" | sed "s/'//g")

echo "Valid essays (from essays.astro):"
for slug in $VALID_SLUGS; do
  echo "  - $slug"
done
echo ""

# Check which essay files exist
echo "Essay files that exist:"
for file in "$ESSAY_FILES"/*.astro; do
  if [ -f "$file" ]; then
    basename=$(basename "$file" .astro)
    echo "  - $basename"

    # Check if this file is referenced in essays.astro
    if ! echo "$VALID_SLUGS" | grep -q "^$basename$"; then
      echo "    WARNING: $basename exists as a file but is NOT in essays.astro"
    fi
  fi
done
echo ""

# Check for stale references in other pages
echo "Checking for stale references in other pages..."
STALE_FOUND=0

for page in "$WEBSITE_DIR/src/pages"/*.astro; do
  if [ "$(basename "$page")" != "essays.astro" ]; then
    # Look for /essays/ links
    REFS=$(grep -oE "/essays/[a-z0-9-]+" "$page" 2>/dev/null | sed 's|/essays/||g' | sort -u)

    for ref in $REFS; do
      if ! echo "$VALID_SLUGS" | grep -q "^$ref$"; then
        echo "  STALE: $(basename "$page") references /essays/$ref (not in essays.astro)"
        STALE_FOUND=1
      fi
    done
  fi
done

if [ $STALE_FOUND -eq 0 ]; then
  echo "  No stale references found."
fi

echo ""
echo "=== Done ==="
