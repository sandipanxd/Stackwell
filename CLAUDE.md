# Stackwell — Claude Code Setup

Inherited from Sandipan's global Claude Code setup (`sandy-claude-setup`). See `.claude/profile.json` for the full profile.

## Stack

Node.js, NestJS, TypeScript, MongoDB, AWS (basic).

## Behavioural rules

### Think before coding
- Before writing any code, state your interpretation of the requirement.
- If the requirement is ambiguous, present at least two interpretations and ask which is correct.
- Never make silent assumptions. State every assumption explicitly.
- If something is unclear, ask one specific question. Do not proceed with a guess.

### Minimal change
- Write the smallest change that solves the stated problem. Nothing more.
- Do not add abstractions, utilities, or helper functions that were not requested.
- Do not reformat, rename, or restructure code outside the explicit scope of the task.
- If you see something that looks wrong but is outside your task, flag it in a comment. Do NOT fix it.

### Surgical scope
- Never touch files that are not explicitly part of the current task.
- If implementing a feature requires modifying an unexpected file, stop and ask.
- Do not extend scope "while you're there." Complete the task. Stop.

### Verify before finishing
- Run tests if a test suite exists for what you changed.
- Run the linter/type-checker after every file write, if configured.
- If tests fail, fix the implementation — never the test.
- If you cannot verify (no test command, no linter), say so explicitly. Do not assume it works.

## Git workflow (GitHub, Conventional Commits)

- Create a feature branch before starting any task: `type/short-kebab-description` (types: `feat, fix, chore, docs, refactor`).
- Never work directly on `main`. Never force-push.
- Commit format: `type(scope): description` (types: `feat, fix, refactor, test, docs, chore, perf, style`), imperative mood, subject ≤72 chars.
- Commit after each logical step, not once at the end of a session.
- Never commit `.env` files, secrets, API keys, or `console.log` statements.
- PR description should cover: **Summary**, **What changed**, **How to test**, **Rollback**.

## Context management

- One task per session — start fresh (`/clear`) rather than pivoting mid-session.
- Use `/compact` proactively (every ~45 min of active work, or after a milestone) rather than waiting for auto-compaction. Add `Preserve: ...` with the specific decisions/constraints that must survive.
- Run `/checkpoint` before ending a long session or when context is about to be compacted — it writes a handoff note to `.claude/checkpoints/`.
- Keep this file under ~200 lines. Split into `@docs/*.md` imports if it grows.

## Testing (TDD)

- Always write failing tests BEFORE implementation. Confirm the test fails before writing any code.
- Write minimal code to make the test pass. Nothing extra.
- Refactor only after all tests are green. Run tests after every change.
- Never skip, delete, or modify a failing test to make it pass — fix the implementation.
- One assertion focus per `it()`/`test()` block. Arrange-Act-Assert.
- Test behaviour through public interfaces, not internal implementation details.
- External services must be mocked. No real API/DB calls in unit tests.
- Coverage: minimum 80% statement coverage on changed files (enforced automatically once the project defines an npm `test:coverage` script — see `.claude/hooks/enforce-coverage.sh`).
- Use `/tdd <feature description>` to run a task through strict Red-Green-Refactor.

## Plan Mode

Use Plan Mode (Shift+Tab twice, or `/plan`) for:
- Any change touching 3+ files
- Database/schema changes
- Refactoring a module used across the codebase
- Anything touching auth, payments, or security
- Unfamiliar parts of the codebase

Skip it for typos, single-line fixes, and simple renames. Say "don't implement yet" if you want a plan without immediate execution.

## Available tools

- `/review` — reviews staged changes for logic errors, security, performance, and style.
- `/checkpoint` — writes a session handoff note.
- `/tdd <feature description>` — implements a feature via strict Red-Green-Refactor.
- `/dep-audit` — audits npm dependencies for vulnerabilities and staleness.
- `security-reviewer` subagent — read-only security audit (auth, injection, secrets, NoSQL query safety).
- `performance-reviewer` subagent — read-only performance audit (N+1 queries, missing indexes, blocking calls).

## Guardrails enforced via hooks (`.claude/hooks/`)

- Secret scanning on every file write.
- Auto-formatting (Prettier) on TS/JS/JSON edits, if configured in the repo.
- Test suite runs automatically after editing a `src/*.ts` file (warning only, non-blocking).
- Commit is blocked if statement coverage drops below 80% (only once the project has a `test:coverage` npm script — no-ops otherwise).
- Blocks: `--no-verify`, quiet git flags, `git stash drop`, pipe-to-shell, force-push, direct push to `main`, non-Conventional-Commit messages.
- File writes are logged to `.claude/session-audit.log` (gitignored, local only).

## Project-specific notes

See [README.md](README.md) for Stackwell's architecture (multi-tenant SaaS boilerplate), the module build order, and local dev setup. See `.claude/plans/` (in the originating `sandy-claude-setup` session) for the original implementation plan this project was scoped from.
