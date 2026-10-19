# agent-ready-postgres

Demo app for the GitHub Universe 2026 talk "Make your Postgres agent-ready". Copilot CLI makes database changes here on Neon branches.

- Database changes follow the `database-changes` skill in `.agents/skills/`. Never write to the production branch.
- The Neon MCP server is configured in `.github/mcp.json`. It is the only MCP server this repo uses.
- Start Copilot CLI with `./scripts/copilot`, not `copilot`.

Building this repo is done outside Copilot CLI; see `CONTRIBUTING.md`.
