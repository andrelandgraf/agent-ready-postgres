# Contributing

## Setup

1. Install [GitHub Copilot CLI](https://docs.github.com/copilot/how-tos/copilot-cli) and sign in with `copilot login`.
2. Copy `.env.example` to `.env.local` and set `NEON_API_KEY`.
3. Start the CLI with `./scripts/copilot` and confirm folder trust.

Check that the Neon server is the only MCP server loaded:

```bash
copilot mcp list
```

## Changing the demo

- Copilot CLI is the presenter's tool. Build and change the repo with your editor, then rehearse with `./scripts/copilot`.
- The skill in `.agents/skills/database-changes/SKILL.md` is the main thing to tune after a rehearsal.
- The `tools` list in `.github/mcp.json` decides which Neon tools the agent sees. Add a tool there before the skill relies on it.
