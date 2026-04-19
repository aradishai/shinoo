#!/bin/sh
set -e

echo "=== START ==="
node --version
echo "PORT=$PORT"

echo "=== migrations ==="
npx prisma migrate deploy

echo "=== seed ==="
npx tsx prisma/seed.ts

echo "=== starting next ==="
exec node_modules/.bin/next start -p ${PORT:-3000}
