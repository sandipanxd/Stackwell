#!/bin/bash
# .claude/hooks/test-on-edit.sh
# PostToolUse on Edit|Write — runs the test suite after editing a source file.
# Non-blocking: reports failures as a warning, never exits 2 (PostToolUse can't block anyway).

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

if [[ "$FILE" == *.test.* || "$FILE" == *.spec.* ]]; then
  exit 0
fi

case "$FILE" in
  */src/*.ts|*/src/*.tsx|*/src/*.js|*/src/*.jsx)
    if [ -f "package.json" ] && grep -q '"test"' package.json && command -v npm >/dev/null 2>&1; then
      npm test >/dev/null 2>&1
      if [ $? -ne 0 ]; then
        echo "Tests failed after editing $FILE. Review and fix before continuing." >&2
      fi
    fi
    ;;
esac

exit 0
