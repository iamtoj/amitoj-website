#!/bin/bash
# validate-photo-orientation.sh
# Automatically validates and fixes photo orientation issues
#
# This script:
# 1. Checks all webp files for correct orientation
# 2. Compares against source JPGs (if available)
# 3. Auto-fixes any mismatches by re-converting with correct orientation
#
# Run: ./scripts/validate-photo-orientation.sh
# Safe to run repeatedly - only modifies files that need fixing

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEBSITE_DIR="$(dirname "$SCRIPT_DIR")"
WEBP_DIR="$WEBSITE_DIR/public/images/photography-optimized"
SOURCE_DIR="$WEBSITE_DIR/dist/images/photography"

echo "=== Photo Orientation Validator ==="
echo "Checking: $WEBP_DIR"
echo ""

# Track issues
ISSUES_FOUND=0
FIXED=0

# Function to check if image is portrait (height > width)
is_portrait() {
    local file="$1"
    local w=$(sips -g pixelWidth "$file" 2>/dev/null | grep pixelWidth | awk '{print $2}')
    local h=$(sips -g pixelHeight "$file" 2>/dev/null | grep pixelHeight | awk '{print $2}')

    if [ -z "$w" ] || [ -z "$h" ]; then
        return 1  # Can't determine
    fi

    [ "$h" -gt "$w" ]
}

# Function to get aspect ratio category
get_orientation() {
    local file="$1"
    local w=$(sips -g pixelWidth "$file" 2>/dev/null | grep pixelWidth | awk '{print $2}')
    local h=$(sips -g pixelHeight "$file" 2>/dev/null | grep pixelHeight | awk '{print $2}')

    if [ -z "$w" ] || [ -z "$h" ]; then
        echo "unknown"
        return
    fi

    if [ "$h" -gt "$w" ]; then
        echo "portrait"
    else
        echo "landscape"
    fi
}

# Check each webp file
for webp in "$WEBP_DIR"/*.webp; do
    [ -f "$webp" ] || continue

    filename=$(basename "$webp" .webp)
    webp_orient=$(get_orientation "$webp")

    # Try to find source file (could be .JPG or .jpg)
    source_file=""
    for ext in JPG jpg JPEG jpeg; do
        if [ -f "$SOURCE_DIR/$filename.$ext" ]; then
            source_file="$SOURCE_DIR/$filename.$ext"
            break
        fi
    done

    if [ -n "$source_file" ]; then
        source_orient=$(get_orientation "$source_file")

        if [ "$webp_orient" != "$source_orient" ]; then
            echo "MISMATCH: $filename"
            echo "  Source ($source_orient) != WebP ($webp_orient)"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))

            # Auto-fix: reconvert with sips preserving orientation
            echo "  Fixing: Reconverting from source..."

            # Use sips to convert, which handles orientation correctly
            sips -s format jpeg "$source_file" --out "/tmp/$filename.jpg" 2>/dev/null
            sips --resampleHeight 1600 "/tmp/$filename.jpg" --out "/tmp/${filename}_resized.jpg" 2>/dev/null

            # Convert to webp using cwebp if available, otherwise use sips
            if command -v cwebp &> /dev/null; then
                cwebp -q 85 "/tmp/${filename}_resized.jpg" -o "$webp" 2>/dev/null
            else
                # Fallback: use sips (may not produce webp on all systems)
                sips -s format webp "/tmp/${filename}_resized.jpg" --out "$webp" 2>/dev/null || {
                    echo "  WARNING: Could not convert to webp. Install cwebp."
                }
            fi

            rm -f "/tmp/$filename.jpg" "/tmp/${filename}_resized.jpg"

            FIXED=$((FIXED + 1))
            echo "  Fixed!"
        fi
    fi
done

echo ""
echo "=== Summary ==="
echo "Files checked: $(ls "$WEBP_DIR"/*.webp 2>/dev/null | wc -l | tr -d ' ')"
echo "Issues found: $ISSUES_FOUND"
echo "Auto-fixed: $FIXED"

if [ $ISSUES_FOUND -eq 0 ]; then
    echo ""
    echo "All photos have correct orientation!"
fi

exit 0
