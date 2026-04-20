#!/bin/sh
set -e

echo "=== START ==="
node --version
echo "PORT=$PORT"

echo "=== migrations ==="
node scripts/migrate.js

echo "=== seed ==="
npx tsx prisma/seed.ts

echo "=== sync laliga ==="
npx tsx scripts/sync-laliga.ts || echo "La Liga sync failed (non-fatal)"

echo "=== starting next ==="
exec node_modules/.bin/next start -p ${PORT:-3000}
