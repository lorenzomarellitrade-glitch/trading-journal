#!/bin/sh
# Pubblica il journal su GitHub Pages (ramo gh-pages) allo stesso indirizzo di sempre.
# Legge URL e chiave anon da .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) e genera config.js solo dentro dist/.
set -e
cd "$(dirname "$0")"
./test/esegui.sh | grep -q FAIL && { echo "Test falliti: non pubblico."; exit 1; }
U=$(grep '^VITE_SUPABASE_URL=' .env | cut -d= -f2- | tr -d '\r" '); K=$(grep '^VITE_SUPABASE_ANON_KEY=' .env | cut -d= -f2- | tr -d '\r" ')
[ -n "$U" ] && [ -n "$K" ] || { echo "Mancano VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY in .env"; exit 1; }
rm -rf dist; mkdir dist
cp index.html app.js logica.js dist/
printf 'window.JOURNAL_CONFIG={url:"%s",anonKey:"%s"};\n' "$U" "$K" > dist/config.js
touch dist/.nojekyll
cd dist && git init -q && git checkout -q -b gh-pages && git add -A && git -c user.name=deploy -c user.email=deploy@local commit -qm "Journal $(date +%F)" && git push -q -f "$(git -C .. remote get-url origin)" gh-pages:gh-pages
echo "Pubblicato."
