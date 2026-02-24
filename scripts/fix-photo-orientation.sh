#!/bin/bash
# fix-photo-orientation.sh
# Fixes photo orientation by baking EXIF rotation into pixels
#
# HISTORY:
# - v1: Compared source vs webp dimensions (failed when both wrong)
# - v2: Manifest approach with sips -r 0 (WRONG - doesn't auto-orient)
# - v3 (current): Uses exiftool -auto-rotate OR sips with EXIF reading
#
# ROOT CAUSE:
# Cameras store rotation in EXIF metadata, not pixels. Some viewers
# apply EXIF, others don't. Solution: bake rotation INTO pixels so
# all viewers see the same thing.
#
# APPROACH:
# 1. If exiftool available: auto-rotate source files (best)
# 2. Else: read EXIF orientation, apply explicit rotation with sips
# 3. Manifest records known issues for manual override
#
# Usage:
#   ./scripts/fix-photo-orientation.sh          # Fix all photos
#   ./scripts/fix-photo-orientation.sh check    # Just check, don't fix
#   ./scripts/fix-photo-orientation.sh source   # Fix sources (one-time)
#
# RECOMMENDED ONE-TIME FIX:
#   exiftool -auto-rotate -overwrite_original public/images/photography/*.JPG
#   Then re-convert all to webp.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MANIFEST="$SCRIPT_DIR/photo-orientation-manifest.json"
WEBP_DIR="$SCRIPT_DIR/../public/images/photography-optimized"
SOURCE_DIR="$SCRIPT_DIR/../public/images/photography"

MODE="fix"
if [ "$1" = "check" ]; then
    MODE="check"
elif [ "$1" = "source" ]; then
    MODE="source"
fi

echo "=== Photo Orientation Fixer v3 ==="
echo "Mode: $MODE"
echo ""

# Function to get EXIF orientation value (1-8)
get_exif_orientation() {
    local file="$1"
    # Try exiftool first (most reliable)
    if command -v exiftool &> /dev/null; then
        exiftool -Orientation -n "$file" 2>/dev/null | awk '{print $NF}'
    else
        # Fallback: sips (less reliable for EXIF)
        sips -g orientation "$file" 2>/dev/null | grep orientation | awk '{print $2}'
    fi
}

# Function to get pixel dimensions
get_orientation() {
    local file="$1"
    local w=$(sips -g pixelWidth "$file" 2>/dev/null | grep pixelWidth | awk '{print $2}')
    local h=$(sips -g pixelHeight "$file" 2>/dev/null | grep pixelHeight | awk '{print $2}')

    if [ -z "$w" ] || [ -z "$h" ]; then
        echo "unknown"
        return
    fi

    if [ "$h" -gt "$w" ]; then
        echo "P"
    else
        echo "L"
    fi
}

# MODE: Fix source files with exiftool (one-time operation)
if [ "$MODE" = "source" ]; then
    if ! command -v exiftool &> /dev/null; then
        echo "ERROR: exiftool required. Install with: brew install exiftool"
        echo ""
        echo "This is the RECOMMENDED approach - fixes EXIF at the source."
        exit 1
    fi

    echo "Applying EXIF rotation to source files..."
    echo "This bakes rotation into pixels permanently."
    echo ""

    count=0
    for src in "$SOURCE_DIR"/*.{JPG,jpg,JPEG,jpeg} 2>/dev/null; do
        [ -f "$src" ] || continue

        # Check if has non-normal orientation
        orient=$(get_exif_orientation "$src")
        if [ -n "$orient" ] && [ "$orient" != "1" ] && [ "$orient" != "" ]; then
            echo "  $(basename "$src"): EXIF orientation=$orient, auto-rotating..."
            exiftool -auto-rotate -overwrite_original "$src" 2>/dev/null
            count=$((count + 1))
        fi
    done

    echo ""
    echo "Fixed $count source files."
    echo ""
    echo "NEXT STEPS:"
    echo "1. Re-convert all sources to webp"
    echo "2. Deploy"
    exit 0
fi

# MODE: Check or Fix webp files
echo "Checking webp files..."

ISSUES=0
FIXED=0

# Check manifest for known corrections
if [ -f "$MANIFEST" ] && command -v jq &> /dev/null; then
    echo ""
    echo "--- Manifest entries ---"

    PHOTOS=$(jq -r '.photos | keys[]' "$MANIFEST" 2>/dev/null || echo "")

    while IFS= read -r filename; do
        [ -z "$filename" ] && continue
        TARGET=$(jq -r ".photos[\"$filename\"]" "$MANIFEST")

        webp_file="$WEBP_DIR/$filename.webp"
        if [ ! -f "$webp_file" ]; then
            echo "  $filename: WebP not found"
            continue
        fi

        current=$(get_orientation "$webp_file")

        if [ "$current" != "$TARGET" ]; then
            ISSUES=$((ISSUES + 1))
            echo "  $filename: NEEDS FIX ($current should be $TARGET)"

            if [ "$MODE" = "fix" ]; then
                # Rotate the webp directly
                if [ "$TARGET" = "L" ] && [ "$current" = "P" ]; then
                    sips --rotate 90 "$webp_file" 2>/dev/null
                    FIXED=$((FIXED + 1))
                    echo "    Rotated 90° CW"
                elif [ "$TARGET" = "P" ] && [ "$current" = "L" ]; then
                    sips --rotate 270 "$webp_file" 2>/dev/null
                    FIXED=$((FIXED + 1))
                    echo "    Rotated 90° CCW"
                fi
            fi
        else
            echo "  $filename: OK"
        fi
    done <<< "$PHOTOS"
fi

# Scan for unusual aspect ratios (potential issues not in manifest)
echo ""
echo "--- Scanning for potential issues ---"

for webp in "$WEBP_DIR"/*.webp; do
    [ -f "$webp" ] || continue
    filename=$(basename "$webp" .webp)

    # Skip if in manifest
    if [ -f "$MANIFEST" ] && command -v jq &> /dev/null; then
        if jq -e ".photos[\"$filename\"]" "$MANIFEST" > /dev/null 2>&1; then
            continue
        fi
    fi

    # Check for extreme ratios
    w=$(sips -g pixelWidth "$webp" 2>/dev/null | grep pixelWidth | awk '{print $2}')
    h=$(sips -g pixelHeight "$webp" 2>/dev/null | grep pixelHeight | awk '{print $2}')

    if [ -n "$w" ] && [ -n "$h" ] && [ "$w" -gt 0 ]; then
        ratio=$((h * 100 / w))
        if [ "$ratio" -gt 250 ] || [ "$ratio" -lt 40 ]; then
            echo "  $filename: UNUSUAL ratio ($w x $h) - manual check recommended"
        fi
    fi
done

echo ""
echo "=== Summary ==="
echo "Issues found: $ISSUES"
if [ "$MODE" = "fix" ]; then
    echo "Fixed: $FIXED"
else
    echo "(Check mode - no fixes applied)"
fi

echo ""
echo "RECOMMENDED: Run './scripts/fix-photo-orientation.sh source' to fix at source level."
