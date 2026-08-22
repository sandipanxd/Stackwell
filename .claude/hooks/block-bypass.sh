#!/bin/bash
# .claude/hooks/block-bypass.sh
# PreToolUse on Bash — blocks common enforcement-bypass patterns.

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

if echo "$CMD" | grep -qE "git (commit|push).*--no-verify"; then
  echo "BLOCKED: --no-verify is not permitted. Fix the underlying issue instead." >&2
  exit 2
fi

if echo "$CMD" | grep -qE "git (commit|push).*(--quiet|-q)"; then
  echo "BLOCKED: Quiet flags on git commands hide actions from review." >&2
  exit 2
fi

if echo "$CMD" | grep -qE "git stash drop"; then
  echo "BLOCKED: git stash drop can destroy staged work. Use explicit git operations." >&2
  exit 2
fi

if echo "$CMD" | grep -qE "(curl|wget).*(\|).*(bash|sh|python)"; then
  echo "BLOCKED: Pipe-to-shell patterns are not permitted. Download and inspect first." >&2
  exit 2
fi

exit 0
