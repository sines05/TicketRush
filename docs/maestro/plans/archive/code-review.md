# Code Review Plan

## Objective
Perform a Maestro-style code review on the latest code changes to identify any bugs, UI/UX issues, business logic errors, and security vulnerabilities.

## Key Files & Context
- Target scope: Staged changes or the last commit diff (to be determined dynamically).

## Implementation Steps
1. **Determine Scope**: Run `git diff --staged` or `git diff HEAD~1` to capture the diff. If no changes exist, request a specific scope from the user.
2. **Delegation**: Send the exact diff content and related file paths to the `code_reviewer` subagent.
3. **Execution**: The `code_reviewer` will analyze the changes focusing on correctness, regressions, security, UI/UX, and maintainability.
4. **Synthesis**: Aggregate the findings from the subagent.

## Verification & Testing
- Classify findings into Critical, Major, Minor, and Suggestion.
- Present findings ordered by severity with concrete file and line references.
- Provide a brief summary after the findings.