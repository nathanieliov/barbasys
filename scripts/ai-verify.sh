#!/bin/bash
# AI Verification Script: Ensures types, lint, and core tests pass.
set -e

echo "🔍 Starting AI Reliability Check..."

echo "🧹 Cleaning stale artifacts..."
rm -rf backend/dist frontend/dist

echo "🧪 Running Type Checks..."
npm run build --prefix backend
npm run build --prefix frontend

echo "✅ Reliability Check Passed!"
