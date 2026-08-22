#!/bin/bash
# .claude/hooks/format-on-edit.sh
# PostToolUse on Edit|Write — runs Prettier on edited TS/JS/JSON files, if configured.

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.json)
    if [ -f "package.json" ] && command -v npx >/dev/null 2>&1; then
      npx --no-install prettier --write "$FILE" >/dev/null 2>&1
    fi
    ;;
esac

exit 0
