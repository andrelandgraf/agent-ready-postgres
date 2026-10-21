# Make your Postgres agent-ready

Talk notes for GitHub Universe 2026, all versions in one place. The script I'm practicing comes first; the versions below keep everything else, current version on top, past versions unchanged so we can swap parts back in.

## Script

What I say, slide by slide, for the current deck ([talk-deck-v3](talk-deck-v3/index.html)). Practice with `bun run talk`: the slides and this script side by side. Planned time is 13:10 of the 15-minute slot.

### 1. Title

Hi, I'm Andre. I'm a developer advocate at Databricks and I work on Neon. Today I want to talk about making your Postgres agent-ready.

### 2. Agent speed

What a time to be alive. Heading into 2027, programming runs at agent speed. Two examples.

### 3. Bun: Zig → Rust

Bun was just rewritten from Zig to Rust. That's 535,496 lines of Zig, rewritten in 11 days. Jarred Sumner's own estimate for doing it by hand: three engineers with full context on the codebase, about a year. Funny enough, the rewrite merged on May 14 and the blog post about it came out almost two months later.

### 4. Math

And math is apparently getting solved. I'm not smart enough to explain the proofs, but here's what happened this summer. OpenAI published ten results on long-standing open problems, including three Erdős problems, all ten formalized in Lean, for about 2,000 dollars in tokens. And Anthropic raised the share of Riemann zeta zeros proven to lie on the critical line from 41.6 to 67.2 percent. Fun detail: the person prompting that one was Jarred Sumner, from the Bun slide.

### 5. The oracle loop

How does that work? Of course, the models are really smart. But nobody typed "rewrite Bun in Rust" and walked away. Both had an oracle: a way to check the answer.

Bun's test suite is written in TypeScript, so the Zig and the Rust versions can both run it. In Jarred's words: "Bun's own test suite is written in TypeScript which means it doesn't depend on the runtime's programming language." Math has Lean, which checks every proof step.

So the agent makes an attempt, the oracle runs every check, and if anything fails, the agent fixes it and tries again. Until everything passes. And once you have an oracle, you can run that loop a thousand times in parallel.

### 6. Agents get it wrong

That loop matters because agents get things wrong. A lot. Claude's first pass at the zeta problem: 650 ideas, none of them worked. And Donald Knuth wrote about Claude solving one of his open problems: he had to restart it when it stopped on random errors, and earlier search results were lost. Agents need room to fail and a way to recover.

### 7. Bobby Tables

In a database, "wrong" looks like this. We all know little Bobby Tables. Now cross out his name: it's your coding agent that dropped the table. What now?

### 8. Agent factories need infra

So what's the oracle for the apps you build? I would argue it's production. If it runs and works in production, it's safe to merge.

That's always been the goal for developers. With agents it matters more, because we want to be out of the loop as much as possible. So preview, staging and dev need to be as close to production as possible, and reproducible.

The closest thing to production is production. But you can't let an agent loose on your production database. So we need copies: instant, one per attempt; isolated, so nothing an agent does touches the real thing; and recoverable, so every mistake has an undo. Infra has to run at agent speed. Today, I want to talk about the database.

### 9. Lakebase Postgres

I work at Neon. Neon was a serverless Postgres startup; Databricks acquired it and we combined our work with what Databricks was already building. The database is called Lakebase Postgres and it runs on the lakebase architecture.

Compute is ephemeral: Postgres with RAM and an NVMe cache. Storage is durable: safekeepers commit the WAL by quorum, the pageserver turns WAL into pages and object storage keeps the full history.

There are two ways in. Lakebase on databricks.com if you're a Databricks customer, and neon.com for startups, hobbyists and everyone else, with a free plan. Same database on both.

### 10. Copy-on-write branches

Because storage keeps the history, a branch is just a new compute on that same history. Copy-on-write: no data is copied, writes are isolated and creating one takes seconds, whatever the size. So every agent loop gets its own copy of production. That's the oracle for database changes.

### 11. Restore points

And any point in that history is a restore point. Take a backup branch before a risky change. If an agent drops a table, restore production to the backup and the rows are back.

### 12. The dev loop

So what does this look like for your Copilot? One section in AGENTS.md. Every feature that touches the database: create a Neon branch, pull its environment variables, run the app against it, make and run the migration, verify everything end to end, then diff the schema against production. Only then report the implementation as done.

### 13. The CI loop

Then CI does the same for every pull request. Create a branch, run the migration, post the schema diff on the PR and boot up a preview of the whole stack: Vercel for the UI and a Neon branch for the backend, with Lakebase Postgres, Auth and Functions. Let me show you.

### 14. Demo

Switch to the Software Factory dashboard. Times are from dragging the card (5-run average). The board's migration, test and review beats are scripted; the branches, PR, workflow, preview and Copilot run are real.

| Time | Do | Say |
|---|---|---|
| 0:00 | Dashboard | This is the Software Factory. It builds features for vibecastly, an AI image studio running on Neon. Neon shows one branch: production. |
| 0:00 | Click + on Draft, then close | Work starts as a card: someone writes down a feature. |
| 0:04 | Drag Addons into To do | Addons lets you tag items and backgrounds in prompts, next to people. I drag it into To do and the agents pick it up. |
| 0:07 | Point at Neon branches | The Builder branches production. There's `dev/addons`, a full copy of production, in about a second. |
| 0:27 | Card | It runs the migration and tests on that branch, and a security reviewer checks the diff. |
| 0:37 | Open the PR, then the Actions run | Here's a real pull request. The workflow branches production again for the preview, runs the Drizzle migration and posts the schema diff. |
| 1:15 | PR comment | The database change is part of the review. |
| 1:30 | Back to the dashboard | `preview/pr-N` is there, and Vercel is building the UI against that branch. |
| 2:14 | Switch to the terminal: `./scripts/e2e -i` | The preview is ready. The E2E tester is Copilot CLI with the Neon MCP server and a browser. It signs in to the preview, adds a party hat, writes a prompt and checks in the preview branch's database that the row is there. |
| 3:03 | Dashboard | Screenshot's in. Ready to merge. And production was never touched. |

If the preview runs long, the board switches to the prepared PR on its own: "This one's running long, so here's one I prepared earlier."

### 15. Close

Back to "what now?" Agents ship fast when they can check their work. For operational systems, that check is production: a copy that's instant to create, isolated from the real thing and easy to throw away. Programming already runs at agent speed. Infra has to catch up. So where can your agents experiment, and what can they recover after a mistake?

### 16. Thank you

Thank you! The demo is on GitHub at andrelandgraf/agent-ready-postgres. Happy coding!

| | |
|---|---|
| Title | Make your Postgres agent-ready: Branching, isolation, and safer shipping |
| Slot | Thursday, October 29, 2026, 12:45–1:00 PM PT, 15 minutes |
| Speaker | Andre Landgraf, Staff Developer Advocate, Databricks |
| Demo | The Software Factory in this repo ([demo-spec.md](demo-spec.md)) building vibecastly's addons feature |

## Versions

| Version | Date | What changed |
|---|---|---|
| [v3](#v3-current) | Oct 20 | Opening rewritten around "agent speed"; the oracle is production; Lakebase intro with the two ways in; Software Factory demo; 16-slide deck: one math slide, one oracle loop slide, Neon's official architecture diagram, AGENTS.md dev loop and CI loop slides |
| [v2](#v2-html-flow-deck) | Oct 18 | 17-slide HTML flow deck: Bun and math examples, the oracle, Bobby Tables, Lakebase, branching, recovery, Copilot CLI demo |
| [v1](#v1-session-outline) | Sep 9 | Session outline submitted to GitHub: Bobby Tables hook, architecture, Copilot CLI + GitHub Actions release demo with restore |

## Main message

Agents ship fast when they can check their work. For operational systems, that check is production. So infra has to run at agent speed: copies of production that are instant, isolated and easy to throw away.

## v3 (current)

Slides: [talk-deck-v3/index.html](talk-deck-v3/index.html), 16 slides built from the v2 deck: one math slide ("Agents are solving math", OpenAI and Anthropic results in small print) instead of two; one oracle slide (a loop of agent, oracle and "fail → fix and try again" until all checks pass) instead of three; Neon's official architecture diagram from [neon.com/docs/introduction/architecture-overview](https://neon.com/docs/introduction/architecture-overview) on the Lakebase slide; and a dev loop slide before the demo ("Neon Postgres + your Copilot" next to an AGENTS.md: branch, pull env, run against the branch, migrate, verify end to end, diff the schema against production, only then report done); and a CI loop slide after it ("Neon + your GitHub Actions": every PR gets a Neon preview branch, the migration, a schema diff and a Vercel preview, next to an excerpt of the demo's real preview.yml steps).

### Run of show

| Time | Part | Notes |
|---|---|---|
| 0:00 | Opening: agent speed | Bun rewrite, math |
| 1:30 | The oracle | Test suite, Lean, loops in parallel |
| 3:00 | For apps, the oracle is production | Preview, staging and dev as close to production as possible |
| 4:00 | Lakebase Postgres | Neon and Databricks, serverless Postgres, branching |
| 6:00 | Demo: the Software Factory | One live run, about 3 minutes, plus narration |
| 11:30 | Close | What now? |
| 12:30 | Buffer | Q&A or a slow preview |

The dictated opening (raw notes below) runs about four minutes. The script below is the same story, cut to about three.

### Opening script

What a time to be alive. Agents just rewrote Bun from Zig to Rust: 535,496 lines of Zig, in 11 days. Jarred's own estimate for doing it by hand was "3 engineers with full context on the codebase about a year [...]". The rewrite merged on May 14; the blog post about it came out on July 8, almost two months later.

And math is apparently solved. I'm not smart enough to explain which problems, but OpenAI and Anthropic both published results this summer on problems that had been open for decades.

Agents are doing incredible things and they're doing them at agent speed. That's what I want to talk about today: agent speed and how to bring it to your database.

### Bun quotes

From [Rewriting Bun in Rust](https://bun.sh/blog/bun-in-rust) (Jarred Sumner, July 8, 2026):

- "Fortunately, Bun's own test suite is written in TypeScript which means it doesn't depend on the runtime's programming language."
- "At first, I didn't expect it to work. A few days in, a high % of the test suite started passing [...] My opinion went from "this is worth trying" to "I'm going to merge this"."
- "A language-independent test suite with a million assertions, adversarial code review and when something does go wrong, fixing the process that generates the code instead of hand-fixing the code."
- "By hand, I think this would've taken 3 engineers with full context on the codebase about a year [...]"

Numbers: 535,496 lines of Zig; about 50 Claude Code workflows over 11 days (May 3 to May 14), up to 64 Claudes in parallel; 6,778 commits; 0 tests skipped or deleted; about $165,000 in tokens at API pricing.

### The oracle

Of course, agents don't pull this off because you prompt "rewrite Bun in Rust" or "solve math". These big projects work because they have really good verification.

Bun has a test suite written in TypeScript, so the Zig and the Rust versions can both run it. In Jarred's words: "Bun's own test suite is written in TypeScript which means it doesn't depend on the runtime's programming language." Once the port compiled, workflows looped over test files: run them, fix what fails, repeat until everything passes. "A few days in, a high % of the test suite started passing [...]" The last mile is where the judgment calls are, and that's where people come back in: he monitored the workflows the whole time and only merged once 100% of the test suite passed in CI on every platform. But the verification loop gets you through the meaty part.

Math works the same way with a verification language like Lean. The agent forms a hypothesis and Lean checks it, right or wrong. Agents run those loops in parallel, they run at agent speed and they don't get tired. That's how they get through these feats.

### For apps, the oracle is production

So what's the oracle for the applications you're building? I would argue it's the production environment. If it runs and works in production, it's safe to merge.

That's always been the goal for developers too, but it matters more with agents, because we want to be out of the loop as much as possible. So we build preview, staging and dev environments that are as close to production as possible, in a way that's reproducible and reliable.

The closest thing to production is production. But letting agents loose on your production database is scary: one drop table by accident and you're restoring backups. So you can't really hand them production.

### Lakebase Postgres

I work at Neon. Neon was a serverless Postgres startup; Databricks acquired it and we combined our work with what Databricks was already building. The database is called Lakebase Postgres and it runs on the lakebase architecture: Postgres with stateless compute and storage that keeps the full history.

There are two ways in. If you're a Databricks customer, you get Lakebase on databricks.com. For startups, hobbyists and everyone else, there's neon.com: sign up in a minute and there's a free plan. Both run the same database and the same backend services.

What serverless Postgres gives you is branching: a copy-on-write copy of production, in seconds, whatever the size. That's the verification loop for your database. Database workflows have been stuck in the past for a long time; Vercel gave us preview deployments for the app years ago and the database never had the equivalent before branching.

### Demo: the Software Factory

One live run of the dashboard in this repo. Times are averages from five runs on Oct 19, counted from dragging the card.

On the board, the Builder and Security reviewer beats (migration, tests, review) are timed narration, and the PR comes from the prepared `feat/addons` branch. The real parts: the `dev/addons` branch, the PR, the preview workflow (preview branch, migration, schema diff, Vercel preview) and the Copilot e2e agent. Say "the agents" for the board, and point at the real artifacts.

| Time | Window | Highlight |
|---|---|---|
| 0:00 | Dashboard | One board. Neon has only production. Click + on Draft to show where a card comes from, then close it |
| 0:04 | Dashboard | Drag Addons into To do. Three agents pick it up |
| 0:07 | Neon branches panel | Builder branches production. `dev/addons` appears in seconds |
| 0:10 | Dashboard | Migration and tests on `dev/addons` (scripted beat; the real migration runs in the preview workflow) |
| 0:27 | Dashboard | Security reviewer checks the diff (scripted beat) |
| 0:37 | Dashboard, then GitHub | PR opened from the prepared `feat/addons` branch. Open the PR, then the Actions run |
| 0:45 | GitHub Actions | Preview branch from production, Drizzle migration, schema diff, Vercel preview |
| 1:15 | PR comment | Schema diff: the database change shows up in review |
| 1:30 | Dashboard | `preview/pr-N` in Neon branches. Infra at agent speed: a branch of production in seconds |
| 2:14 | Dashboard, then terminal | Preview ready, about 100 s after the PR opened. Hand off to Copilot CLI: `./scripts/e2e -i` |
| 2:20 | Terminal | E2E tester opens the preview, adds the party hat, checks the row over Neon MCP |
| 3:03 | Dashboard | Screenshot lands. Ready to merge. Production never touched |

Measured (5 runs, Oct 19): PR opens at 37 s, preview ready at 134 s (125–145), ready to merge at 183 s (166–201). The preview workflow takes 91 s, half of it the Vercel deploy. The Copilot step takes 50 s (34–76) and varies the most.

A recorded run with these cues exists as a video (3:12, Oct 19).

### Close

Back to "what now?" Agents ship fast when they can check their work. For operational systems that check is production: a copy that's instant to create, isolated from the real thing and easy to throw away. Programming already runs at agent speed; infra has to catch up. Where can your agents experiment, and what can they recover after a mistake?

### Demo operator notes

- Start: dashboard at https://software-factory-ashen.vercel.app (or `bun run dev`, port 3100). Press Reset before the talk; the board should show only `main` in Neon branches.
- Hand-off: when the card says "Testing the preview", run `./scripts/e2e -i`. If the agent replies "Neon MCP tools did not load", Copilot started before the Neon tools registered; run it again.
- Fallback: if the live preview isn't ready 3 minutes after the PR opens, the dashboard switches to the prepared PR #2 and its preview.
- Known: the e2e screenshot can show a "Live updates stopped" toast. New preview branches serve the parent branch's Realtime secret for about 100 s after it's set. Fix pending.
- Known: Cursor Bugbot comments "usage limit reached" on demo PRs until it's turned off for vibecastly.

### Raw notes (Oct 20, dictated)

Kept verbatim so nothing gets lost.

> What a time to be alive. Agents are shipping sick to us revive that would have taken an engineering team a whole week. In fact, it was faster, much faster for the team to, to do that rewrite than writing the blog post that documented all the details of that rewrite. math is apparently solved and I'm, I'm not smart enough to explain what math problems have been solved, but I've heard it's solved. And. It's just incredible what agents are doing and they doing it at agent speed. So that's why I want to talk about today is agent speak and speed and how to bring it to your database. what's very important to realize here is that obviously agents are amazing and you, if you prompt them, they can do incredible things, but if you, if you give them these like massive tasks, right, like solve math. Rewrite from sick to us. the way those migrations of projects are successful is through by giving, by having a very, like very good verification. Bun actually had a test suite in TypeScript that both the, the Rust and sick versions could leverage. So anytime there was a change, you could run the tests. Fixers face testing tests and, and iterate until all of them pass, right? And for the first, I assume ninety eight percent of the tests, there was no human intervention needed. And then when it comes to like the last, the last mile, the last one percent, right? Like there's probably a lot of more handholding needed to make judgment calls. But those kind of verification loops get you through the meaty stuff, right? The same as the last problem their verification language is that, that agents run, run the hypothesis and verify if they're true or not. If they solve the problem, yes or not. And just through that, agents can obviously run in parallel. They can run at agent speed. They don't get tired. and, and that's how they, they solve these incredible feats. so if, for your applications that you're building, what, what is that oracle? What is that verification loop? In, in my mind, that's the production environment, right? Like if it runs and works in production. then it's safe to merge. and so the goal, and I, I guess that goal has always been for developers as well, but it's just much more true and now more critical for agents as, as you want to like be out of the loop as much as possible, is to, to build environments for preview, for staging, for development that are as close as possible to production. and, and, and do that in a reproducible and reliable way. And obviously the, the closest to production there is, is production, but it's scary to let agents just run loose on your production database have them drop tables on accident and so on and so forth. So you can't really give them production. And I work at Neon, which was a serverless Postgres startup, which was then acquired by Databricks and kind of consolidated our efforts with what Databricks was already doing. And we're calling this now Lakebase, which is a serverless Postgres architecture. And we have two doors to this system. One of them is on Databricks.com. So if you are a Databricks customer, you can, and Lakebase over there. And then for startups and hobbyists and everybody else, we have Neon.com, which is the developer platform that we are still maintaining and building. And that one you know, you can just sign up quickly and we have a free plan. And on both of them, we offer the same architecture, the same backend services is, is running and powering both of these, these shell spaces. And what Post, Serverless Postgres is doing is it is and now we can like go into whatever details or whatever. but what's amazing is there is branching, you get like copy and write of your production, right? Like that's kind of like, I'm getting, this is worth four minutes, this is way too long, but like, I think this is kind of a good narration. It's like, and then like proving with branching, you get to that verification oracle loop for your apps, for a database, where historically database development workflows have been horrible and stuck in the past. Because you have amazing systems like Vercel for development now, but nothing like that existed for databases before Neon.

## v2: HTML flow deck

Oct 18. A 17-slide HTML deck to feel the flow, verbatim except one redacted sentence in slide 4's notes: [talk-deck-v2/index.html](talk-deck-v2/index.html). Open it in a browser; N shows speaker notes, T a timer, G the overview, R resets.

1. **Slide:** Make your Postgres agent-ready Branching, isolation, and safer shipping photo Andre Landgraf Staff Developer Advocate Databricks
   **Notes:** Short. Get to the hype fast.
2. **Slide:** 2026 → 2027 Programming now runs at agent speed.
   **Notes:** Start on a high note. Heading into 2027, you can build whatever you want. Programming now runs at agent speed. So does math. Two examples.
3. **Slide:** Programming Bun, rewritten from Zig to Rust ~11 days until the full test suite passed 100% of the test suite passing on all platforms before merge ~$165k in tokens bun.sh/blog/bun-in-rust · github.com/oven-sh/bun/pull/30412 · claude.com/resources/articles/ai-code-migration
   **Notes:** Bun rewrote the whole runtime from Zig to Rust with agents. Merged in May. About 11 days from start to the full test suite passing on every platform. Around 165k dollars in tokens.
4. **Slide:** Math · OpenAI Ten long-standing open problems, resolved or advanced 10 results, including Erdős problems 183, 146 and 180 ~$2k in tokens for all ten 10/10 formalized as Lean proofs openai.com/index/ten-advances-in-mathematics (Aug 1, 2026) · github.com/openai/ten-proofs
   **Notes:** So is math. In August OpenAI published ten results on long-standing open problems: sphere packing, Ramsey numbers, three Erdős problems. [One sentence redacted for this public repo.] All ten together cost about 2,000 dollars in tokens. And every one ships with a Lean certificate.
5. **Slide:** Math · Anthropic Riemann zeta zeros on the critical line 41.6% → 67.2% of zeros proven to lie on the critical line: the previous record, then Claude's ~60 subagents, thousands of numerical checks, one Lean 4 proof anthropic.com/research/riemann-zeta (Aug 10, 2026) · github.com/anthropics/zeta-23-lean
   **Notes:** And Anthropic: asked to take a real stab at the Riemann hypothesis. It didn't prove it. It did raise the share of zeta zeros proven to sit on the critical line from 41.6 to 67.2 percent. About 60 subagents, thousands of numerical checks against known zeros, and a Lean 4 proof. Fun detail: the person prompting it was Jarred Sumner, from the Bun slide.
6. **Slide:** How does that succeed? Smart models. And an oracle.
   **Notes:** How does something like the Bun rewrite succeed? Or a new bound on the zeta function? Models are really smart, sure. But it's also about having an oracle: a way to verify.
7. **Slide:** The oracle Each one had a way to check the answer Bun The test suite Written in TypeScript, so any implementation, Zig or Rust, can run it Math Lean Every proof step is machine-checked. Every hypothesis can be run and discarded immediately.
   **Notes:** Bun: the e2e tests are written in TypeScript, so any underlying implementation can run them. Great oracle for whether the model succeeded. Math: verification languages like Lean. Every hypothesis can be checked immediately and discarded.
8. **Slide:** The oracle With an oracle, you can run a loop. Or a thousand. agent attempt oracle keep fail → discard, try again × 1,000 in parallel
   **Notes:** Once you have an oracle you can run it in a loop. Or a thousand loops in parallel, burn a lot of money, and make it happen. Development keeps moving this way: build the oracle first so you can verify and build fast.
9. **Slide:** But Agents get things wrong. A lot. Anthropic, Riemann zeta 650 ideas, none worked Claude's first attempt, before the run that found the new bound Knuth, "Claude's Cycles" Restarts lost the work "He had to do some restarts when Claude stopped on random errors; then some of the previous search results were lost." anthropic.com/research/riemann-zeta · cs.stanford.edu/~knuth/papers/claude-cycles.pdf
   **Notes:** But agents will get things wrong. A lot. Claude's first pass at the zeta problem: 650 ideas, none worked. And Donald Knuth's write-up of Claude solving one of his open problems: restarts after random errors, and the earlier search results were lost. Agents need environments as close to production as possible, and they need to recover.
10. **Slide:** In a database, "wrong" looks like this What now? Robert'); DROP TABLE Students;-- your coding agent xkcd.com/327 · CC BY-NC 2.5
   **Notes:** We all know little Bobby Tables. Now cross out his name: it's your agent that dropped the table. What now?
11. **Slide:** Operational systems For operational systems, the oracle is production. Instant A copy of production per attempt, a thousand at once Isolated Nothing an agent does touches the real thing Recoverable Every mistake has an undo Infra has to run at agent speed. Today: the database.
   **Notes:** Bun had its test suite. Math has Lean. For operational systems, the oracle is the production environment: real schema, real data, real traffic. So agents need environments as close to production as possible, and infra has to run at agent speed: one copy per attempt, a thousand at once, every mistake undoable. Today I want to talk about one piece of that puzzle: the database.
12. **Slide:** Lakebase Postgres Postgres on the lakebase architecture Postgres computes production agent branch scaled to zero safekeepers (WAL) pageservers object storage stateless storage keeps the full history Lakebase Postgres, available via Neon and via Databricks
   **Notes:** Lakebase Postgres: Postgres on the lakebase architecture. Compute is stateless, storage keeps the history in object storage. That's what makes instant, copy-on-write branches possible. Same database via Neon and via Databricks. The demo uses Neon.
13. **Slide:** Branching One branch per agent loop production agent-1 agent-2 agent-3 … agent-1000 copy-on-write: shared history, isolated writes seconds to create, whatever the size throw it away when the attempt fails
   **Notes:** A branch is a new compute on the same history. No copy. Writes are isolated. Creation time doesn't depend on database size. So every agent loop gets its own copy of production: that's the oracle for database changes.
14. **Slide:** Recovery Any point in history is a restore point production backup-before-migration DROP TABLE notes; restored $ neon branches restore production backup-before-migration
   **Notes:** And because storage keeps the history, any point in time is a restore point. Take a backup branch before the production change. Agent drops a table: restore production to the backup.
15. **Slide:** Demo Copilot CLI + a branch of production 7:20 Repo: AGENTS.md database rules and Neon skills 7:50 Agent branches, migrates, verifies against real data, retries 10:30 Merge: backup branch, then production 12:00 Destructive change, then restore
    **Notes:** 6:40 total. Jump cuts are fine: prepared branch, prepared PR, finished runs.

    7:20 Repo: AGENTS.md database rules + Neon skills.
    7:50 Copilot CLI: feature that needs a migration. Agent creates a branch, migrates, verifies against real data. If it fails: discard the branch, try again. This is the oracle loop, on a database.
    10:30 Merge. Optional: GitHub Actions creates a test branch, then a backup branch, then migrates production.
    12:00 Destructive change. Restore production from the backup branch. Show the rows are back.

16. **Slide:** What now? Agents ship fast when they can check their work. For operational systems, that check is production: instant to copy, isolated, easy to roll back. Infra has to run at agent speed.
   **Notes:** Back to what now. Agents ship fast when they can check their work. For operational systems, that check is production: a copy that's instant to create, isolated from the real thing, and easy to roll back. Programming already runs at agent speed. Infra has to catch up. Ask yourself: where can your agents experiment, and what can you recover after a mistake?
17. **Slide:** Thank you demo repo: TBD · @andrelandgraf
   **Notes:** Demo repo link or QR here.

## v1: Session outline

Sep 9, submitted to GitHub's session-outline template. Verbatim, except two internal review notes that stay out of this public repo.

### Talk

**Title:** Make your Postgres agent-ready: Branching, isolation, and safer shipping

**Abstract (current):**

Giving agents access to real database infrastructure is risky: one wrong migration and production breaks. Database branching changes that.

When your Postgres database supports instant, isolated branches, agents can safely experiment on real schemas and data without touching production. This means safer experimentation, faster shipping, and preview environments that spin up automatically.

In this session, Andre Landgraf shows how branching and isolation work under the hood, how to set up agent-ready database environments using tools like MCP and GitHub Actions, plus a live demo of an agent managing a database branch end to end. You'll leave with a clear framework for making your own database infrastructure safe for agentic workflows.

**Abstract (first iteration, for contrast):**

Postgres is becoming the git for OLTP. Where git is the default for version control, the industry is standardizing on Postgres as the operational data layer.

Why? It's battle-tested, open source, extensible, and community-led. Virtually every PaaS offers a Postgres service in 2026. However, Postgres is also over 30 years old and wasn't built with agents in mind.

This talk shows how Serverless Postgres changes that. We'll break down Neon's architecture and how database branching enables agentic development, and how it powers platforms like Replit, Retool, and Netlify DB.

**Session length:** 15 min (Thu Oct 29, 12:45–1:00 PM PT)

Mapped flow: opening 2 + architecture 5 + demo 7 + close 1. No third section.

---

### Section I — Talk-level framing

These three questions help GitHub understand the narrative before anything else.

#### What is the one thing you want someone to remember from this session?

If an attendee remembers nothing else, what should it be? One or two sentences.

I want to make a case that AI infra needs branching, snapshots and instant rollbacks across the stack so agents can make mistakes and recover. I'll use serverless Postgres to show what bringing those capabilities to the database looks like.

#### What problem does your audience have that you are solving?

Describe the situation your attendees are in before they walk into your session. What are they struggling with, unsure about, or getting wrong?

I'm speaking to developers who are bringing agents into their existing GitHub workflows, but still have trouble testing and recovering database changes. Local seed data goes stale. Agents need environments that represent production to develop in and test migrations.

I want to show how database branching fits into that workflow: where the agent works, how GitHub Actions tests a migration and what we can recover when it goes wrong.

#### What is your opening hook?

How will you earn the room in the first two minutes? A surprising stat, a story, a provocative question, a demo — what is it, and why will it land?

I'll open with xkcd's little Bobby Tables, cross out his name and replace him with an agent that dropped a table, then ask, "What now?" It connects a familiar database failure to the work we're starting to give agents.

Next, I'll walk folks through a GitHub Actions release workflow. When do we run the migration? How do we test it? What happens if it fails? Those questions give the architecture diagram and demo a problem to work through.

---

### Section II — Session flow

Walk through the session section by section. For each part: what you are covering, and why it belongs. Add or remove sections to match the actual structure. Total must account for full session length.

#### Opening — 2 min

**What are you covering?**

I'll briefly show xkcd's little Bobby Tables, cross out his name and replace him with an agent that dropped a table. "What now?"

Next, I'll walk folks through a GitHub Actions release workflow. When do we run the migration? How do we test it against data that represents production? What happens if it goes wrong?

**Why does it belong here?**

These are database problems developers already face. Giving agents the same work adds another reason to make testing and recovery part of the release workflow. I'll use these questions to connect the rest of the talk.

#### Section 1 — 5 min

**What are you covering?**

I'll show an animated architecture diagram to briefly explain serverless Postgres and lakebase architecture that enables branching, snapshots and rollbacks for recovery.

I'll use Lakebase Postgres as the serverless Postgres example. It's the same database product available via Neon and via Databricks. The demo will use it on Neon.

I'll trace the workflow through the diagram: a branch for development and migration testing, a snapshot or backup branch before the production change and a recovery point if that change drops a table.

**Why does it belong here?**

I want attendees to understand what a database branch gives their agent and how recovery uses an earlier database state. The diagram gives them a model for the steps they'll see in GitHub Actions.

#### Section 2 — 7 min (demo)

**What are you covering?**

I'll ask GitHub Copilot CLI to build a small feature that requires database changes. I'll show the `AGENTS.md` file and agent skills that guide it through a branch-based development workflow on Neon.

Then I'll jump forward to an open PR with the completed feature and click merge. I'll follow the GitHub Actions workflow that merge triggers: it creates a fresh database branch on Neon, tests the migration and has an agent or script investigate the results.

Once the migration is cleared to proceed, the workflow creates another branch on Neon in the background as a backup and applies the same migration to production.

I'll also show a destructive outcome in that same workflow and recover by rolling back to a snapshot or backup branch.

**Why does it belong here?**

I'll answer the opening questions. They'll see GitHub Copilot CLI follow the development instructions and GitHub Actions run the release steps, with branchable Postgres on Neon providing the test environment and recovery primitives needed to bring the database to this modern workflow.

#### Closing — 1 min

**What are you covering?**

I'll return to "What now?" We've seen an agent change a database, a workflow test that change and recovery after a destructive outcome.

I would argue that branching, snapshots and instant rollbacks belong across the stack when we're building infra for agents. I'll ask attendees to look at where their own agents can experiment and what state they can recover after a mistake.

**Why does it belong here?**

I want attendees to carry those questions into their own systems. The Postgres demo gives them one example they can use when evaluating the rest of their AI infra.

---

### Section III — Scope and delivery

#### What will you show, not just tell?

- **Opening:** I'll show a GitHub Actions release workflow as an illustration/diagram.
- **Section 1:** I'll show an animated architecture diagram to briefly explain serverless Postgres and lakebase architecture that enables branching, snapshots and rollbacks for recovery.
- **Section 2 (demo):** GitHub Copilot CLI building out a mini feature leveraging the Neon CLI to branch the db in the process. Then I'll jump to merge the PR and review the triggered GitHub Actions including a test-branch migration, a backup branch, prod apply and snapshot/backup recovery.

#### Any questions for us?

- Do you prefer a live demo or a pre-recorded demo for this slot? Agent and github action execution times make a live run harder to keep within seven minutes.
- Does the 15-minute slot include Q&A at all?
