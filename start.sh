#!/bin/sh
set -e

echo "=== START ==="
node --version
echo "PORT=$PORT"

mkdir -p /app/data

echo "=== setup-db ==="
node scripts/setup-db.js || echo "setup-db exited with $?"

node scripts/add-test-match.js || true

echo "=== check seed ==="
node -e "
const Database = require('better-sqlite3');
const db = new Database(process.env.DATABASE_PATH || '/app/data/dev.db');
const count = db.prepare('SELECT COUNT(*) as c FROM Tournament').get().c;
db.close();
process.exit(count === 0 ? 1 : 0);
" || (echo '=== seeding ===' && npx tsx prisma/seed.ts && echo '=== seed done ===')

echo "=== starting next ==="
exec node_modules/.bin/next start -p ${PORT:-3000}
