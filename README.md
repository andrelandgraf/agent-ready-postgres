# Software Factory

Demo for the GitHub Universe 2026 session "Make your Postgres agent-ready: Branching, isolation, and safer shipping" (Thursday, October 29, 12:45 PM PT).

Agents ship fast when they can check their work. For operational systems, that check is production: a copy that is instant to create, isolated from the real thing, and easy to roll back. The Software Factory shows that loop on one screen for [vibecastly](https://vibecastly.vercel.app), an AI image studio on Neon.

## What happens

1. Drag the **Addons** card from Draft into To do.
2. The Builder agent picks it up. A real Neon branch, `dev/addons`, appears in the branches panel.
3. A Security reviewer joins, and the dashboard opens a real pull request from `feat/addons` into `demo/main` on vibecastly.
4. The PR's [preview workflow](https://github.com/andrelandgraf/vibecastly/blob/demo/main/.github/workflows/preview.yml) creates `preview/pr-<n>` from production, runs the Drizzle migration on it, posts the schema diff, and deploys a Vercel preview wired to that branch. Each step shows live on the dashboard.
5. Run `./scripts/e2e`. Copilot CLI signs in to the preview with agent-browser, adds a `PartyHat` addon, types `@Andre wearing @PartyHat on stage at GitHub Universe`, and uploads one screenshot to the dashboard. It checks the row on the preview branch with the Neon MCP server.

The agents on the board are animation; every branch, PR, check, preview, and screenshot is real. Nothing merges, so vibecastly production is never migrated. If the live preview is not green three minutes after the PR opens, or it fails, the dashboard switches to a prepared PR labeled `demo-fallback` and says so.

## Commands

```bash
bun run dev               # dashboard on http://127.0.0.1:3100; sign in with FACTORY_PASSWORD
./scripts/e2e             # the E2E tester, interactive, for the stage
bun run reset             # close the demo PR, delete dev/preview branches and preview deployments
bun run rehearse          # run the real steps from the terminal, timed, then reset
bun run rehearse --e2e    # same, including the Copilot CLI e2e agent
```

The dashboard's Reset button does what `bun run reset` does. Reset only touches what the demo creates: PRs from `feat/addons`, the `dev/addons` branch, and `preview/pr-<n>` branches and deployments of those PRs.

## What's in the repo

| Path | What it does |
|---|---|
| `app/`, `components/factory/` | The dashboard UI and its API routes |
| `lib/factory/` | Neon, GitHub, and Vercel clients, the run log, the scripted sequence, and reset |
| `db/schema.sql` | The run log table on the dashboard's own Neon project |
| `.agents/skills/e2e-preview-screenshot/` | The steps the E2E tester follows |
| `.github/mcp.json` | The Neon MCP server, limited to branch, SQL, schema, and snapshot tools |
| `scripts/copilot`, `scripts/e2e` | Start Copilot CLI with this repo's env and auto-update off |

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup.
