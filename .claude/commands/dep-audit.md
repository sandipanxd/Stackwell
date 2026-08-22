---
description: Audit npm dependencies for known vulnerabilities and outdated packages. Use when the user says 'audit dependencies', 'check for vulnerabilities', or 'are we outdated'.
disable-model-invocation: true
allowed-tools: Bash, Read
---

## Manifest

!`cat package.json 2>/dev/null || echo 'no package.json found'`

## Audit

!`npm audit --json 2>/dev/null | head -200`

## Outdated

!`npm outdated 2>/dev/null | head -30`

---

Using the data above, produce a report with three sections:

1. **Critical** — vulnerabilities that need fixing immediately. For each: package name, CVE/advisory, severity, fix command.
2. **High** — fix this sprint. Same format.
3. **Maintenance** — packages 2+ major versions behind (not necessarily vulnerable, just stale).

End with the exact `npm` commands to run to resolve everything listed (e.g. `npm audit fix`, or specific `npm install pkg@version` for breaking-change upgrades that need manual review).

If the audit is clean and nothing is significantly outdated, say so explicitly. Do not invent findings.
