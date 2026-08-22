---
description: Write a session checkpoint note before compacting or ending a session. Use when the user says 'save context', 'write a handoff', or 'I need to start a new session'.
disable-model-invocation: true
allowed-tools: Write, Read, Bash
---

Write a checkpoint note capturing:

1. Current task / what was being worked on
2. Status (done / in-progress / not-started)
3. Files modified
4. Decisions made and reasoning
5. Constraints (libraries to avoid, rejected approaches)
6. Open questions
7. Exact next step

## Recent git activity

!`git status --short`

!`git log --oneline -10`

Save the note to `.claude/checkpoints/checkpoint-$(date +%Y%m%d-%H%M).md` and confirm the path once written.
