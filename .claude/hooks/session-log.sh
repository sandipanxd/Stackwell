#!/bin/bash
# .claude/hooks/session-log.sh
# PostToolUse on Edit|Write — appends a lightweight audit trail of file writes.

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // ""')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
LOG=".claude/session-audit.log"

if [[ "$TOOL" == "Write" || "$TOOL" == "Edit" ]] && [ -n "$FILE" ]; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | $TOOL | $FILE" >> "$LOG"
fi

exit 0
