#!/bin/bash
# Root-level doctor script for Barbasys

echo "🩺 Running Barbasys Project Doctor..."

echo "--- Backend: Linting & Type-checking ---"
(cd backend && npm run lint && npx tsc --noEmit)
BACKEND_STATUS=$?

echo "--- Frontend: Linting & Type-checking ---"
(cd frontend && npx tsc --noEmit)
FRONTEND_STATUS=$?

echo "--- Running Tests ---"
npm test
TEST_STATUS=$?

if [ $BACKEND_STATUS -eq 0 ] && [ $FRONTEND_STATUS -eq 0 ] && [ $TEST_STATUS -eq 0 ]; then
  echo "✅ Everything looks good!"
  exit 0
else
  echo "❌ Some checks failed. Please review the output above."
  exit 1
fi
