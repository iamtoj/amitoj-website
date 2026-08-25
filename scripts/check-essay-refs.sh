#!/bin/bash
# Compatibility entry point for the canonical content reference checker.

set -euo pipefail

WEBSITE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WEBSITE_DIR"

echo "Essay references are validated with all three canonical content collections."
exec npm run verify:content
