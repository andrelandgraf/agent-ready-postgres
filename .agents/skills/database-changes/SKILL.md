---
name: database-changes
description: Make and verify a database change on a Neon branch, never on production. Use for any task that changes the schema or the data, such as a new table or column, a migration, a backfill, or a data fix.
---

# Database changes

Every attempt gets its own branch of production. Production is only ever read, never written.

## The loop

1. The project is vibecastly, `summer-credit-62081215`; the Neon key reaches only that project. Resolve its default branch once with `get_default_branch` and reuse the id.
2. Create a branch from the default branch with `create_branch`, named `agent/<short-feature-name>`.
3. Apply the change on that branch with `run_sql_transaction`, passing the branch id.
4. Verify on the branch:
   - `compare_database_schema` against the parent shows only the intended change.
   - Row counts of every table the change touches match before and after, unless the task is meant to change them.
5. If a check fails, stop working on that branch. Report the failure in one line, create a new branch, and try a different approach. Never patch a branch that failed a check.
6. When every check passes, report the schema diff and the check results, then stop. Do not apply the change to production.

## Speed

- Read only the files the change needs. Do not explore the repo.
- Batch SQL into one `run_sql_transaction` call per step.
- Pass branch ids (`br-...`), not branch names.
- Keep replies under ten lines.
