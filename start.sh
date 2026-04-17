#!/bin/sh
set -e

echo "=== START ==="
node --version
echo "PORT=$PORT"

echo "=== setup-db ==="
node scripts/setup-db.js || echo "setup-db exited with $?"

echo "=== starting next ==="
exec node_modules/.bin/next start -p 3000
