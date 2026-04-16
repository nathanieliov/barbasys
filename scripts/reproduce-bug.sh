#!/bin/bash
# TDD Enforcer: Scaffold a failing test for a bug reproduction.

FILE=$1
DESC=$2

if [ -z "$FILE" ] || [ -z "$DESC" ]; then
  echo "Usage: ./scripts/reproduce-bug.sh <target_test_file> \"Bug Description\""
  exit 1
fi

echo "🧪 Scaffolding bug reproduction in $FILE..."

# Append failing test boilerplate to the end of the file
cat <<EOF >> "$FILE"

describe('Bug Reproduction: $DESC', () => {
  it('should reproduce the issue', () => {
    // TODO: Implement reproduction steps for: $DESC
    expect(true).toBe(false); // Fail by default to enforce implementation
  });
});
EOF

echo "✅ Test scaffolded. Now implement the failing logic and run tests."
