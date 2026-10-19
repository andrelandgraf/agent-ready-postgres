# Software Factory demo

## Problem statement

The GitHub Universe talk (Thursday, Oct 29, 12:45 PM PT, 15 minutes) argues that agents ship fast when they can check their work, and that for operational systems the check is a copy of production. The demo has 400 seconds to make that visible. Watching an agent create branches in a terminal is slow and hard to follow from the audience. The demo needs one screen that shows the whole flow, links to the real artifacts (PR, Actions run, Neon branches, preview deployment), and stays deterministic so it fits the slot.

## Solution pitch

A local web dashboard, the **Software Factory**, shows a Kanban board, a team of agents, and a live list of Neon branches for vibecastly (the AI image studio at vibecastly.vercel.app). Dragging the "Addons" card into To do starts a sequence of agents working the card. The agents are animation; every success state they show waits on a real event. The artifacts are real: a Neon dev branch, a GitHub PR opened from a pre-pushed branch, and a GitHub Actions run that creates a Neon preview branch, runs the Drizzle migration on it, posts the schema diff, deploys the branch's Functions, and deploys a Vercel preview. One step is a real agent: Copilot CLI runs as the e2e testing agent, uses agent-browser against the preview, and captures the one screenshot that shows the audience the new feature.

## Solution spec

### Repos

| Repo | Role |
|---|---|
| `andrelandgraf/agent-ready-postgres` | The Software Factory dashboard, the agent sequence, the reset script, and the Copilot CLI e2e skill |
| `andrelandgraf/vibecastly` | The app being built. Gets migration files, the preview workflow, and the addons feature on a pre-pushed branch |

### Accounts

| Service | Account | Resource |
|---|---|---|
| Neon | personal (`andre.timo.landgraf@gmail.com`), org `org-summer-dust-66593634` | project `odd-block-46739925` (Postgres 18, for Neon Realtime), default branch `main` |
| Vercel | personal (`andre-landgraf`), team `team_3lnclzRbyCETAcu719mQjKVP` | project `vibecastly` (`prj_GbWkW4Y9DLl7WEXeXcjQYorFHUZn`) |
| GitHub | `andrelandgraf` | both repos |
| Copilot CLI | `andrelandgraf` | 1.0.89-4, started with `./scripts/copilot` |

### Phase 0: preview proof (before any dashboard work)

The preview environment is the riskiest part, so it is proven first on a throwaway PR in vibecastly with no feature code. The proof passes when, on a preview deployment built by the workflow below:

- Sign-in works with the demo account on the preview URL.
- The demo account's workspace membership exists on the preview branch, and the person `Andre` and their stored photo load.
- The browser's JWT is minted by the preview branch's Neon Auth and accepted by the preview branch's Function.
- An upload lands in the preview branch's Object Storage, and the same object key does not exist in production storage.
- Image generation and the gallery work on the preview.
- Exactly one Vercel deployment exists for the PR, and `main` still deploys production.

Settled on Oct 19 with a throwaway branch `preview/proof` (created, inspected, deleted):

- `neon checkout preview/proof --create --project-id odd-block-46739925` took 7.8 s with neon 8.4.3 (CI now pins 8.8.0, which can enable Realtime). It applied `neon.ts` on creation, deploying both Functions (`imagegen`, `report`) to the branch, and wrote 13 variables to `.env.local`: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`, `NEON_FUNCTION_IMAGEGEN_BASE_URL`, `NEON_FUNCTION_REPORT_BASE_URL`, four `AWS_*` storage keys, `NEON_AI_GATEWAY_TOKEN`, `NEON_AI_GATEWAY_BASE_URL`.
- The branch has its own Neon Auth (JWKS served from the branch endpoint) with production's users, organizations, memberships, and people. The branch Function answers `401` without a JWT.
- `NEXT_PUBLIC_AGENT_URL` for the preview is the branch's `NEON_FUNCTION_IMAGEGEN_BASE_URL`.
- Neon does not provide `NEON_AUTH_COOKIE_SECRET`. The workflow generates a random one per preview and masks it.
- Functions are deployed at branch creation, before the migration. The preview URL is only commented after the migration finishes, so nothing calls the addons routes early. On `synchronize`, checkout of an existing branch does not reapply `neon.ts`, so that path runs `neon deploy` against the branch.
- The Vercel project has no deployment protection, so the browser agent needs no bypass secret. Its Git integration is linked with production branch `main`. Preview-target env has only `NEXT_PUBLIC_SENTRY_DSN`.
- Production has no `drizzle` schema, so the migration baseline is required.

Settled by the proof deployment on PR #2:

- Sign-in on a preview returns 403 until the preview URL is a trusted domain of the preview branch's Neon Auth. The branch inherits production's three trusted domains; the workflow adds the preview URL with `neon api /projects/<project>/branches/<branch>/auth/domains -X POST`, on the preview branch only.
- The project-scoped Vercel token cannot run `vercel pull`: the CLI first calls `GET /teams/<id>`, which returns 403 for that token. The workflow uploads `web/` through the REST API instead (`scripts/vercel-deploy.mjs`, `POST /v2/files` and `POST /v13/deployments` with build and runtime env) and lets Vercel build it, in about 45 seconds.

### Migrations (vibecastly)

vibecastly applies schema with `drizzle-kit push` and has no migration files. `.gitignore` excludes `drizzle/`; that line goes.

The baseline is generated from `src/db/schema.ts` into `drizzle/0000_baseline.sql` with every `CREATE TABLE` and `CREATE INDEX` made `IF NOT EXISTS`. On any branch created from production it is a no-op that records itself, so production needs no bookkeeping write. Rehearsed on a disposable branch: the first `drizzle-kit migrate` recorded the baseline once with the journal's `when`, a second run changed nothing, and the addons migration applies once on top. A drift check (`drizzle-kit push`) found one pre-existing difference that the baseline never touches: production's `creator_profiles.updated_at` is `timestamptz` while the schema says `timestamp`.

### Preview workflow (vibecastly, `.github/workflows/preview.yml`)

Explicit steps rather than `neon-solutions/neon-vercel-preview-action`: the action uses one working directory for Neon and Vercel, while vibecastly has `neon.ts` at the root and the Next.js app in `web/`, it installs unpinned `neon@latest` and `vercel@latest`, and it passes `neon checkout --update-existing`, which neon 8.4.3 does not have. Each step is named so the Actions page reads as the story.

Runs on `pull_request` (opened, synchronize, reopened) from branches in the same repo only, so secrets never reach fork PRs. `permissions: contents: read, pull-requests: write`. The Neon and Vercel CLIs are installed at pinned versions. Every third-party action is pinned to a commit SHA. Values fetched at runtime (connection strings, Auth secrets) are masked with `::add-mask::` before any step can print them.

1. **Create Neon preview branch** `preview/pr-<number>` from production with `neon checkout`, explicitly linked to project `odd-block-46739925`. The step asserts the resulting branch id is not production's branch id.
2. **Run Drizzle migration on the preview branch** with `drizzle-kit migrate` against that branch's `DATABASE_URL`.
3. **Schema diff:** `neondatabase/schema-diff-action` comments the diff between production and `preview/pr-<number>` on the PR.
4. **Deploy Functions to the preview branch** if the proof shows checkout did not already, then read the branch's Function URL.
5. **Give the Function the branch's Realtime secret:** `neon functions deploy imagegen --env REALTIME_SECRET=…` with the branch's `NEON_REALTIME_SECRET`. Functions don't receive it automatically, and they drop user-set `NEON_*` variables.
6. **Deploy web preview to Vercel** from `web/` through the REST API (`scripts/vercel-deploy.mjs`) with only the keys the web app reads: `NEXT_PUBLIC_AGENT_URL` (the branch Function URL), `NEXT_PUBLIC_NEON_REALTIME_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`.
7. **Trust the preview domain in Neon Auth and Realtime** for the preview branch.
8. **Comment** the preview URL, the Neon branch name, and the workflow run id on the PR.

`.github/workflows/cleanup.yml` runs on `pull_request` closed and deletes `preview/pr-<number>` with `neondatabase/delete-branch-action`, by that exact name.

Vercel's Git integration keeps deploying production from `main`. It is turned off only for the demo branches: `web/vercel.json` gets `"git": { "deploymentEnabled": { "feat/addons": false, "demo/*": false } }`, committed on `main` before any demo branch is pushed.

Secrets and variables on `andrelandgraf/vibecastly`: `NEON_API_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and the variable `NEON_PROJECT_ID`.

### The addons feature (vibecastly)

Today a prompt can `@`-tag people, and their photos become reference images. Addons extend tagging to things: items (a party hat, a rubber duck) and background images (a stage, a beach). An addon has a name, a kind (`item` or `background`), and an uploaded image, scoped to the workspace like people.

- Schema: a new `addons` table (`id`, `organization_id`, `created_by`, `created_by_name`, `name`, `kind`, `bucket_key`, `content_type`, `created_at`, index on `organization_id`). Additive only; no existing table changes.
- Storage: a new `addons` bucket declared in `neon.ts`.
- Function (`src/index.ts`): addons CRUD next to the people routes, with the same workspace authorization, and addon images passed as reference images in generation the way people photos are.
- Web: an Addons panel next to People, and the `@` dropdown lists people and addons with a kind badge.
- Branch: `feat/addons`, pushed before the talk, never merged during rehearsals.

### Software Factory dashboard (agent-ready-postgres)

Next.js, Tailwind, shadcn/ui, Bun. Runs locally, bound to `127.0.0.1`. Neon and GitHub credentials stay server-side in `.env.local`. Mutation routes reject requests whose `Origin` is not the dashboard's own.

Credentials:

- `NEON_API_KEY`: already present, personal Neon account.
- `GITHUB_TOKEN`: a fine-grained personal access token for `andrelandgraf`, scoped to `andrelandgraf/vibecastly`, with Pull requests read/write and Actions read/write. A user token is required: PRs opened with an Actions `GITHUB_TOKEN` do not trigger `pull_request` workflows.

Layout, one screen at 1920×1080:

- **Header:** "Software Factory", project name vibecastly, quick links to the GitHub repo, the Neon project, the Vercel project, and production.
- **Board:** Draft, To do, In progress, In review, Done. "Addons" starts in Draft; the other cards are static set dressing.
- **Agents:** avatars that move onto a card when assigned, each with a role (Builder, Security reviewer, E2E tester) and a status line with a spinner.
- **Neon branches:** live list from the Neon API, polled every 2 seconds. New branches animate in, deleted branches animate out. Each row shows name, parent, and age, and links to the branch in the Neon console.
- **PR panel:** the PR title and link, each check with its live status, the schema diff comment, and the preview URL once commented.
- **Screenshot panel:** the e2e agent's screenshot for the current run.

Sequence after the drag into To do. Scripted steps are timed animation; real steps advance only when the real event is observed, and a real failure stops the sequence with the error on screen.

| Step | Real or scripted | What the audience sees |
|---|---|---|
| Builder agent assigned, "Booting sandbox" | scripted | Avatar moves onto the card, spinner |
| "Creating dev branch" | real: Neon API creates `dev/addons` from production | Branch appears in the branches panel |
| "Writing migration", "Running migration on dev branch", "Tests passing" | scripted | Card moves to In progress, status lines tick |
| Security reviewer assigned, "Reviewing diff" | scripted | Second avatar joins, card moves to In review |
| "Opening PR" | real: GitHub API opens a PR from `feat/addons` to `demo/main` | PR panel appears with a live link |
| Preview workflow | real: GitHub Actions | Checks go from queued to green, `preview/pr-<n>` appears, schema diff and preview URL land |
| E2E tester assigned | real: Andre runs Copilot CLI in a terminal | Screenshot appears in the panel |

The demo ends at a green PR with a preview deployment and the e2e screenshot. Nothing is merged on stage, so production is never migrated during a rehearsal.

Each run is a row in the dashboard's own Postgres (`runs` in Neon project `software-factory`): the dev branch id, the PR number, when it opened, whether it switched to the fallback, an event log, and the screenshot. One run can be in progress at a time.

Reset (the dashboard button or `bun run reset`) cleans up the demo's whole footprint, not only the current run's: it cancels the workflows of every open PR from `feat/addons` and closes it, deletes `dev/addons`, and deletes the `preview/pr-<n>` branches and the Vercel deployments tagged `meta.factoryPr=<n>` of those PRs and the five most recently closed ones. Overlapping rehearsals therefore reset each other. The fallback PR comes from `demo/fallback` and is never touched. "Nothing left behind" means no live branch, deployment, or open PR from the demo flow; closed PRs and workflow history remain.

### Fallback

A second PR, `demo/fallback`, labeled `demo-fallback`, has a finished green run, a live preview, and a stored screenshot. The dashboard switches to it when the live preview workflow is not green three minutes after the demo PR opens (`fallbackAfterMs`), or immediately on a failed workflow, and says so on screen.

### E2E testing agent (Copilot CLI)

The skill `e2e-preview-screenshot` in `.agents/skills/`, started with `./scripts/e2e` (interactive) or `./scripts/e2e --headless`. The prompt says this is a live demo, to be fast and not thorough, and the skill gives exact commands:

1. `./scripts/factory-preview` prints the PR number, the preview URL (from the Vercel deployment tagged with that PR), and the preview branch id.
2. One agent-browser block signs in with the demo account from the environment, adds `PartyHat` from `fixtures/party-hat.png` unless it exists, types `@Andre wearing @PartyHat on stage at GitHub Universe`, and takes one screenshot.
3. The Neon MCP `run_sql` tool, with exact arguments, confirms the `PartyHat` row on the preview branch.
4. Only then `./scripts/upload-screenshot` hands the PNG to the dashboard with `FACTORY_TOKEN`.

The dashboard shows only the screenshot named for the current run.

## Verification

- **Phase 0 proof:** every item in the Phase 0 list, on a throwaway PR, recorded with evidence.
- **Baseline:** the disposable-branch rehearsal of the four baseline steps, then the same checks on production after approval.
- **Production keeps working:** sign in, people CRUD, image generation, uploads, the gallery, and workspace switching on vibecastly.vercel.app, after the baseline and after each rehearsal. Production's schema is identical before and after a rehearsal (`neon branches schema-diff`).
- **The feature branch keeps existing behavior:** on the addons preview, people-only generation, uploads, gallery operations, and workspace authorization work, in addition to addon upload, tagging, and generation with an addon.
- **Isolation:** the preview's Function, database, Auth, and storage are the preview branch's (branch id in the Function's response metadata, storage key absent from production).
- **Full rehearsal:** from a clean reset, the sequence runs end to end within 400 seconds, with every step's wall-clock time recorded, including runner queueing, installs, provisioning, and deployment readiness. Three rehearsals.
- **Reset:** run twice in a row, midway through a deployment, and after a forced failure. Each leaves no live resources from that run and keeps the fallback intact.
- **Fallback:** switching three minutes after the PR opens and on a forced failure, both shown on screen.
- **Copilot:** credits and duration per e2e run recorded, and the screenshot contains no credentials.
- **Dashboard:** screenshots at 1920×1080 and 1280×720 reviewed for every board state.

## Known risks and open items

- Phase 0 may show that preview Auth or storage cannot be isolated per branch. The spec is rewritten from its result before building further.
- The 400-second budget is unmeasured until the first rehearsal.
- The restore beat on slide 14 and the slide 15 demo beats no longer match this demo and need rewriting.
- `neon-solutions/neon-vercel-preview-action` has no `v1` tag although its README references `@v1`.
