#!/bin/bash
# Root-level doctor script for Barbasys

echo "🩺 Running Barbasys Project Doctor..."

echo "--- Shared: Building Contracts ---"
npm run build:shared
SHARED_STATUS=$?

echo "--- Backend: Linting & Type-checking ---"
(cd backend && npm run lint && npx tsc --noEmit)
BACKEND_STATUS=$?

echo "--- Frontend: Linting & Type-checking ---"
(cd frontend && npx tsc --noEmit)
FRONTEND_STATUS=$?

echo "--- Running Tests ---"
npm test
TEST_STATUS=$?

echo "--- jCodeMunch Status ---"
if command -v jcodemunch &> /dev/null; then
  jcodemunch list-repos | grep "barbasys" > /dev/null
  JCODEMUNCH_STATUS=$?
else
  echo "⚠️  Note: jcodemunch command not found in this environment."
  JCODEMUNCH_STATUS=0 # Don't fail the doctor if jcodemunch is missing
fi

if [ $SHARED_STATUS -eq 0 ] && [ $BACKEND_STATUS -eq 0 ] && [ $FRONTEND_STATUS -eq 0 ] && [ $TEST_STATUS -eq 0 ]; then
  echo "✅ Everything looks good!"
  if [ $JCODEMUNCH_STATUS -ne 0 ]; then
    echo "⚠️  Note: jCodeMunch index not found. Run 'npm run re-index' to sync."
  fi
  exit 0
else
  echo "❌ Some checks failed. Please review the output above."
  exit 1
fi
