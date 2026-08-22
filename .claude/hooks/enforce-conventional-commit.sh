#!/bin/bash
# .claude/hooks/enforce-conventional-commit.sh
# PreToolUse on Bash — enforces Conventional Commits format on `git commit -m`.

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

if ! echo "$CMD" | grep -q "git commit"; then
  exit 0
fi

MSG=$(echo "$CMD" | grep -oE -- '-m "[^"]+"' | sed -E 's/^-m "//; s/"$//')

PATTERN='^(feat|fix|refactor|test|docs|chore|perf|style)(\([a-z0-9-]+\))?: .+'
if ! echo "$MSG" | grep -qE "$PATTERN"; then
  echo "BLOCKED: Commit must follow Conventional Commits format." >&2
  echo "Expected: type(scope): description" >&2
  echo "Valid types: feat fix refactor test docs chore perf style" >&2
  echo "Current: $MSG" >&2
  exit 2
fi

exit 0
