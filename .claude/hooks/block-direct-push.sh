#!/bin/bash
# .claude/hooks/block-direct-push.sh
# PreToolUse on Bash — blocks force-push and direct push to main.

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

if ! echo "$CMD" | grep -q "git push"; then
  exit 0
fi

if echo "$CMD" | grep -qE -- '--force|-f '; then
  echo "BLOCKED: Force-pushing is not permitted. Rewrite history locally and open a PR." >&2
  exit 2
fi

if echo "$CMD" | grep -qE 'origin main($|[^a-zA-Z0-9_-])'; then
  echo "BLOCKED: Direct push to main is not permitted." >&2
  echo "Create a feature branch and open a pull request instead." >&2
  exit 2
fi

exit 0
