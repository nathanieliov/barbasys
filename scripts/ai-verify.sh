#!/bin/bash
# AI Verification Script: build + type-check + unit + integration + E2E.
# Usage:
#   bash scripts/ai-verify.sh         # full
#   bash scripts/ai-verify.sh --quick # skip E2E (~30s)
set -e

QUICK=false
[[ "$1" == "--quick" ]] && QUICK=true

echo "🔍 Starting AI Reliability Check..."

echo "🧹 Cleaning stale artifacts..."
rm -rf backend/dist frontend/dist shared/dist

echo "📦 Building Shared Contracts..."
npm run build:shared

echo "🧪 Running Project-wide Type Checks..."
npm run build:backend
npm run build:frontend

echo "🔬 Running Unit Tests..."
npm test --prefix backend
npm test --prefix frontend

echo "🔌 Running Integration Tests..."
npm run test:integration --prefix backend

if [[ "$QUICK" == "true" ]]; then
  echo "⚡ --quick mode: skipping E2E"
  echo "✅ Quick verification passed!"
  exit 0
fi

echo "🌐 Running E2E Tests..."
npm run test:e2e

echo "✅ Reliability Check Passed!"
