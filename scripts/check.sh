#!/bin/sh
# Reject an inlined CARTO key and confirm v1 tiles are allowed by CSP.
set -eu
cd "$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"

if grep -RInE --exclude-dir=.git 'cb1_[A-Za-z0-9_]+' .; then
  echo "Inlined CARTO key."
  exit 1
fi

if grep -RIn --include='*.js' --include='*.html' --include='*.md' "CARTO_KEY = '" . | grep -v "CARTO_KEY = '';"; then
  echo "Non-empty single-quoted CARTO_KEY."
  exit 1
fi

if grep -RIn --include='*.js' --include='*.html' --include='*.md' 'CARTO_KEY = "' . | grep -v 'CARTO_KEY = ""'; then
  echo "Non-empty double-quoted CARTO_KEY."
  exit 1
fi

grep -q 'tile.openstreetmap.org' .htaccess
echo "ok"
