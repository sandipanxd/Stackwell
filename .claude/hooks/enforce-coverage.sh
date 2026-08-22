#!/bin/bash
# .claude/hooks/enforce-coverage.sh
# PreToolUse on Bash — blocks `git commit` if statement coverage is below threshold.
# Skips gracefully (exit 0) if the project has no "test:coverage" script configured.

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

if ! echo "$CMD" | grep -q "git commit"; then
  exit 0
fi

if [ ! -f "package.json" ] || ! grep -q '"test:coverage"' package.json; then
  exit 0
fi

THRESHOLD=80
COVERAGE=$(npm run test:coverage -- --reporter=json-summary 2>/dev/null)
STMT=$(echo "$COVERAGE" | jq -r '.total.statements.pct // empty' 2>/dev/null)

if [ -z "$STMT" ]; then
  exit 0
fi

BELOW=$(awk -v s="$STMT" -v t="$THRESHOLD" 'BEGIN { print (s < t) ? "1" : "0" }')
if [ "$BELOW" = "1" ]; then
  echo "BLOCKED: Statement coverage is ${STMT}%. Minimum is ${THRESHOLD}%." >&2
  echo "Add tests for the uncovered code before committing." >&2
  exit 2
fi

exit 0
