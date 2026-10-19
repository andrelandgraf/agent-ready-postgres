# agent-ready-postgres

Demo for the GitHub Universe 2026 session "Make your Postgres agent-ready: Branching, isolation, and safer shipping" (Thursday, October 29, 12:45 PM PT).

Agents ship fast when they can check their work. For a database change, that check is a copy of production that is instant to create, isolated from the real thing, and easy to roll back. In this repo, GitHub Copilot CLI makes every database change on its own Neon branch, verifies it there, and throws the branch away when a check fails.

## What's in the repo

| Path | What it does |
|---|---|
| `.github/mcp.json` | The Neon MCP server, limited to the branch, SQL, schema, and snapshot tools the demo uses |
| `.agents/skills/database-changes/` | The branch-per-attempt workflow Copilot follows for any database change |
| `scripts/copilot` | Starts Copilot CLI with `NEON_API_KEY` loaded from `.env.local` and auto-update off |

## Run it

```bash
cp .env.example .env.local   # set NEON_API_KEY
./scripts/copilot
```

On first launch, confirm folder trust. Copilot CLI loads `.github/mcp.json` only in a trusted folder.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup.
