Review all staged changes for:
1. Logic errors and unhandled edge cases
2. Security vulnerabilities: injection, XSS, missing auth checks
3. Performance issues: N+1 queries, synchronous blocking, missing indexes
4. Test coverage: are the new paths testable and tested?
5. Style: naming, structure, CLAUDE.md conventions

For each issue found, output:
- File and line number
- Severity: Critical / High / Medium / Low
- Description of the issue
- Suggested fix

If no issues are found, say so explicitly. Do not invent issues.
