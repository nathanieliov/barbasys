#!/bin/bash
# Phase-based workflow script for Barbasys

PHASE=$1
TASK=$2

if [ -z "$PHASE" ] || [ -z "$TASK" ]; then
  echo "Usage: npm run phase <architect|engineer|qa|reviewer> \"<task description>\""
  exit 1
fi

CONFIG_FILE=".gemini/configs/${PHASE}.toml"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: Configuration file ${CONFIG_FILE} not found in root."
  exit 1
fi

echo "🚀 Starting $PHASE phase for: $TASK"
# This invokes a new Gemini session with the specific phase configuration
gemini "$TASK" --config "$CONFIG_FILE"
