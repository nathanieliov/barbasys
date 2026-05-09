#!/bin/bash
# E2E runner: starts the backend out-of-band (Playwright's webServer-spawned
# backend hits a SQLite "readonly database" bug we couldn't crack), then
# runs Playwright. Always cleans up on exit.
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

LOG_DIR="$REPO_ROOT/.e2e-run"
mkdir -p "$LOG_DIR"
BACKEND_LOG="$LOG_DIR/backend.log"
BACKEND_PID_FILE="$LOG_DIR/backend.pid"

cleanup() {
  if [[ -f "$BACKEND_PID_FILE" ]]; then
    BPID=$(cat "$BACKEND_PID_FILE")
    if kill -0 "$BPID" 2>/dev/null; then
      kill "$BPID" 2>/dev/null || true
      # Give it 2 seconds to terminate gracefully, then force
      for _ in 1 2 3 4; do
        kill -0 "$BPID" 2>/dev/null || break
        sleep 0.5
      done
      kill -9 "$BPID" 2>/dev/null || true
    fi
    rm -f "$BACKEND_PID_FILE"
  fi
}
trap cleanup EXIT INT TERM

echo "🧹 Cleaning previous test DB..."
rm -f "$REPO_ROOT/data/test.db"

echo "🏗  Building backend..."
npm run build:backend > /dev/null

echo "🏗  Building frontend..."
npm run build:frontend > /dev/null

# Seed the test DB BEFORE the backend starts. seed-test.ts unlinks/recreates
# the DB file; if the backend is already running, its open file handle would
# point to the unlinked inode and serve stale data. Running the seed first
# guarantees the file exists with test data, and the backend's own seeding
# is a no-op (count > 0 guards in db.ts) once data is present.
echo "🌱 Seeding test DB (pre-backend)..."
cd "$REPO_ROOT"
npx tsx -e "import('./e2e/fixtures/seed-test.ts').then(async m => { const fn = (m.default && (m.default.default || m.default)); if (typeof fn !== 'function') { console.error('seed-test.ts: default export is not a function'); process.exit(1); } await fn(); }).catch(e => { console.error(e); process.exit(1); })"

echo "🚀 Starting backend out-of-band on :3000..."
DB_PATH="$REPO_ROOT/data/test.db" \
FAKE_TWILIO=1 \
FAKE_LLM=1 \
JWT_SECRET="e2e-secret-do-not-use-in-prod-this-is-32-chars" \
PORT=3000 \
EMAIL_USER="" \
NODE_ENV=development \
node "$REPO_ROOT/backend/dist/index.js" > "$BACKEND_LOG" 2>&1 &

echo $! > "$BACKEND_PID_FILE"

echo "⏳ Waiting for backend on :3000..."
for i in {1..30}; do
  if curl -sf http://localhost:3000/api/public/shops > /dev/null 2>&1; then
    echo "✅ Backend ready"
    break
  fi
  if ! kill -0 "$(cat "$BACKEND_PID_FILE")" 2>/dev/null; then
    echo "❌ Backend exited unexpectedly. Logs:"
    cat "$BACKEND_LOG" | tail -50
    exit 1
  fi
  sleep 1
done

if ! curl -sf http://localhost:3000/api/public/shops > /dev/null 2>&1; then
  echo "❌ Backend did not become ready within 30s. Logs:"
  cat "$BACKEND_LOG" | tail -50
  exit 1
fi

echo "🎬 Running Playwright..."
npx playwright test --config=e2e/playwright.config.ts "$@"
