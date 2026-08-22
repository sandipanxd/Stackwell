#!/bin/bash
# .claude/hooks/block-secrets.sh
# PreToolUse on Edit|Write — blocks writes containing likely secrets.

INPUT=$(cat)
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // ""')

if echo "$CONTENT" | grep -qE '(sk-[a-zA-Z0-9]{32,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA|EC) PRIVATE KEY)'; then
  echo "BLOCKED: Potential secret detected in file content." >&2
  echo "Use environment variables or a secrets manager instead." >&2
  exit 2
fi

exit 0
