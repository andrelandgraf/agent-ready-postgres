# agent-ready-postgres

The Software Factory: the demo dashboard for the GitHub Universe 2026 talk "Make your Postgres agent-ready". It builds the addons feature of vibecastly (`andrelandgraf/vibecastly`) on Neon branches.

- The E2E tester step follows the `e2e-preview-screenshot` skill; database changes follow `database-changes`. Never write to vibecastly's production branch.
- The Neon MCP server in `.github/mcp.json` is the only MCP server this repo uses. Its key reaches only the vibecastly project, `odd-block-46739925`.
- Start Copilot CLI with `./scripts/copilot` or `./scripts/e2e`, not `copilot`.

Building and changing this repo happens outside Copilot CLI; see `CONTRIBUTING.md`.
