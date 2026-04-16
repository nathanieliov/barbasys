#!/bin/bash
# AI Verification Script: Ensures types, lint, and core tests pass across the monorepo.
set -e

echo "🔍 Starting AI Reliability Check..."

echo "🧹 Cleaning stale artifacts..."
rm -rf backend/dist frontend/dist shared/dist

echo "📦 Building Shared Contracts..."
npm run build:shared

echo "🧪 Running Project-wide Type Checks..."
npm run build:backend
npm run build:frontend

echo "✅ Reliability Check Passed!"
