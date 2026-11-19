---
name: jira-workflow
description: Use when the user mentions a Jira issue key (FM-123), asks to start, work on, finish or review a ticket, create a bug or task in Jira, report a failed test to Jira, or asks "what are my tasks". Also triggers on Russian phrases like "возьми задачу", "заведи баг", "мои задачи".
argument-hint: "[start|finish|bug|tasks|status] [FM-123]"
---

# Jira workflow (FoodMe)

Work with Jira through the **Atlassian MCP server** (in this setup: "claude.ai Atlassian MCP").
Arguments: `$ARGUMENTS` — e.g. `start FM-12`, `finish FM-12`, `bug <test name>`, `tasks`.
If the action is not given, infer it from the user's message.

## Defaults
- Jira project key: **FM**
- All Jira content (summaries, descriptions, comments) is written in **English**.
- Branch name: `FM-123-short-kebab-summary` (max ~50 chars)
- Commit message: `FM-123: <imperative summary>`

## Preflight (once per session)
1. Get `cloudId` with `getAccessibleAtlassianResources`; reuse it for every call.
2. Get the current user with `atlassianUserInfo` (needed for assigning).
3. If an MCP call fails with an auth error, STOP and tell the user to run `/mcp` and re-authenticate the Atlassian server. Do not retry in a loop.

## Confirmation gate — applies to EVERY write
Before creating an issue, adding a comment, editing fields or changing status:
1. Show a preview: action, issue key, exact text / field values.
2. Ask "Proceed? (yes/no)".
3. Execute only after an explicit "yes".
Reads (get issue, JQL search) need no confirmation.

---

## 1. Start a ticket — `start FM-123`
1. Fetch the issue: summary, description, type, status, priority, assignee, acceptance criteria, linked issues, last comments.
2. Show a short summary (5–10 lines). If acceptance criteria are missing or unclear, list questions and STOP.
3. Find the affected code area (backend `apps/backend`, storefront `apps/web`, admin `apps/admin`).
4. Propose a plan:
   - files to change
   - which tests to add, mapped to acceptance criteria (use the `write-unit-tests` / `write-integration-tests` / `write-e2e-tests` skills)
   Wait for approval.
5. Check `git status`. If there are uncommitted changes, ask what to do — never stash or discard on your own.
6. Create the branch from the up-to-date main branch.
7. After confirmation: assign the issue to the current user and transition it to **In Progress**.

## 2. Finish a ticket — `finish FM-123`
1. Verify the current branch name contains the issue key.
2. Run tests for the affected area (or `/run-regression <area>`). If NEW failures appear, STOP and report — do not move the ticket.
3. Commit with `FM-123: <summary>` (ask before committing).
4. Prepare a Jira comment:
   ```
   Implemented: <1–3 bullet points>
   Files: <main files>
   Tests: <added tests>; run result: <passed/failed counts>
   Branch: FM-123-...   Commit: <short hash>
   ```
5. List the available transitions for the issue and pick **In Review** (or the closest one: "Code Review", "Review"). Never guess a status name — if none fits, show the list and ask.
6. After confirmation: add the comment, then transition.

## 3. Create a bug — `bug <test or description>`
1. Collect facts: if the bug comes from a test, take them from the latest `reports/regression-*.md` or test output.
2. Check for duplicates first:
   `project = FM AND type = Bug AND statusCategory != Done AND text ~ "<key words>"`
   If a likely duplicate exists, show it and ask: comment on it instead, or create a new one?
3. If the failing test or code has an `FM-FLAKE-*` / `FM-BUG-*` marker, mention it — it is a known issue of this training project, so ask whether a ticket is really needed.
4. Draft the bug:
   - **Summary:** `[<area>] <what is broken>` — e.g. `[web] Cart allows dishes from two chefs`
   - **Description:**
     - Environment: branch, commit, OS, browser (for e2e)
     - Steps to reproduce (numbered)
     - Expected result
     - Actual result
     - Evidence: error message (max ~20 lines), test file and test name
     - How to run: exact command
   - **Labels:** `regression` if found by regression, plus area label (`backend` / `web` / `admin`)
   - **Priority:** suggest one and explain why in one line
5. Confirm, create, and return the new issue key and link.

## 4. My tasks — `tasks`
JQL: `assignee = currentUser() AND statusCategory != Done ORDER BY priority DESC, updated DESC`
Show a compact table: key | type | priority | status | summary. Suggest which one to start first and why.

## 5. Status of a ticket — `status FM-123`
Show status, assignee, last 3 comments, linked branches/PRs if visible, and what the next step should be.

---

## Never
- Delete issues, comments or attachments.
- Change issues assigned to other people without an explicit request.
- Bulk-edit or bulk-transition issues.
- Put secrets, tokens, passwords, `.env` contents or full stack traces with personal data into Jira.
- Close an issue (Done) — only the user or reviewer does that.

## When something goes wrong
- Issue not found → check the key and the project; maybe the user has no access.
- Transition not available → show available transitions; the workflow may need another step first.
- Required field error on create → show which field is required and ask for the value.