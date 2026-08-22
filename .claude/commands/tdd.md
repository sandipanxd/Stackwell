---
description: Implement a feature using strict test-driven development (Red-Green-Refactor). Use when the user asks to 'build with TDD', 'write tests first', or 'use red-green-refactor'.
argument-hint: '[feature description]'
allowed-tools: Bash, Read, Write, Edit
---

Implement the described feature using strict TDD: Red → Green → Refactor.

Feature: $ARGUMENTS

## Phase 1: RED
1. Read the feature requirement carefully.
2. Identify all observable behaviours (happy path + edge cases + error cases).
3. Write FAILING tests for each behaviour. Do NOT write implementation.
4. Run the test suite and confirm every new test fails, and fails for the right reason (missing implementation, not a syntax error).
5. Report: number of failing tests and what each one tests.

## Phase 2: GREEN
6. Write the minimum implementation to make the failing tests pass. Nothing speculative.
7. Run the test suite. If tests still fail, read the error and fix.
8. Keep going until all tests pass.
9. Report: what you implemented and which tests now pass.

## Phase 3: REFACTOR
10. Review the implementation for clarity, duplication, naming.
11. Make one improvement at a time. Run tests after each change.
12. If a test fails during refactoring, undo the last change rather than edit the test.
13. Report: what you refactored and the final test count.

## Rules
- Never change a test to make it pass. Fix the implementation, or raise the mismatch with the user if the test itself looks wrong.
- Never add untested code during the Green phase.
- Tests must describe behaviour, not implementation.
