#!/bin/bash
# ADR Scaffolder for Barbasys

TITLE=$1
if [ -z "$TITLE" ]; then
  echo "Usage: ./scripts/new-adr.sh \"Your ADR Title\""
  exit 1
fi

ADR_DIR="docs/adr"
TEMPLATE=".gemini/skills/software-architect/references/adr-template.md"

# Generate filename: 005-title-in-kebab-case.md
NEXT_NUM=$(ls $ADR_DIR | grep -E '^[0-9]+' | tail -n 1 | cut -d '-' -f 1)
NEXT_NUM=$((10#$NEXT_NUM + 1))
NEXT_NUM=$(printf "%03d" $NEXT_NUM)
SAFE_TITLE=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
FILENAME="${ADR_DIR}/${NEXT_NUM}-${SAFE_TITLE}.md"

cp "$TEMPLATE" "$FILENAME"
sed -i '' "s/{title}/$TITLE/g" "$FILENAME" 2>/dev/null || sed -i "s/{title}/$TITLE/g" "$FILENAME"
sed -i '' "s/{date}/$(date +%Y-%m-%d)/g" "$FILENAME" 2>/dev/null || sed -i "s/{date}/$(date +%Y-%m-%d)/g" "$FILENAME"

echo "📝 Created new ADR: $FILENAME"
