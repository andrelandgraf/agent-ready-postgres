# Contributing

## Setup

1. Install [Bun](https://bun.sh), [GitHub Copilot CLI](https://docs.github.com/copilot/how-tos/copilot-cli), [agent-browser](https://www.npmjs.com/package/agent-browser), the `gh` CLI (signed in as `andrelandgraf`), and `jq`.
2. Restore `.env.local` from env.particular.tech (organization Neon Demos, environment `github-universe-presentation-demo-local`); the brain skill `working-on-particular-tech` has the command. It holds:

   | Variable | What |
   |---|---|
   | `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH` | The dashboard's run log: Neon project `software-factory` (`dark-frost-78693138`), branch `main` |
   | `NEON_API_KEY` | Neon key `software-factory`, limited to vibecastly's project `summer-credit-62081215`; used by the dashboard and the Neon MCP server |
   | `VERCEL_TOKEN` | Vercel token limited to the vibecastly project; reset deletes preview deployments with it |
   | `FACTORY_PASSWORD` | The dashboard password; the browser keeps it in localStorage and sends it as a bearer token to the API |
   | `FACTORY_TOKEN` | Bearer token the E2E tester uploads its screenshot with |
   | `FACTORY_URL` | Where the E2E tester finds the dashboard |
   | `DEMO_EMAIL`, `DEMO_PASSWORD` | The vibecastly demo account the E2E tester signs in with |

   `GITHUB_TOKEN` comes from `gh auth token` locally; the deployed dashboard has its own.
3. `bun install`, `bun run db:migrate`, `bun run dev`.
4. Start Copilot CLI once with `./scripts/copilot` and confirm folder trust, so it loads `.github/mcp.json`.

A shell that exported another project's `DATABASE_URL` or `NEON_API_KEY` overrides `.env.local`; start the dev server from a clean shell.

## The vibecastly side

The demo never touches vibecastly's `main`. Its base branch `demo/main` adds Drizzle migrations and the preview workflow; `feat/addons` adds the feature on top; `demo/fallback` is the same commit behind the always-open fallback PR. After changing `demo/main`, rebase `feat/addons` onto it and push both `feat/addons` and `feat/addons:demo/fallback`.

## Changing the demo

- Copilot CLI is the presenter's tool. Build and change this repo with your editor, then rehearse.
- Scripted beats and their timing live in `lib/factory/sequence.ts`; the fallback deadline is in `lib/factory/config.ts`.
- `.agents/skills/e2e-preview-screenshot/SKILL.md` is what to tune after an e2e rehearsal.
- The `tools` list in `.github/mcp.json` decides which Neon tools the agent sees.
- `bun run typecheck && bun run lint` before a commit. `bun.lock` must reference `registry.npmjs.org`, not a proxy registry.
