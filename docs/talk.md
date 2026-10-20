# Make your Postgres agent-ready

Talk notes for GitHub Universe 2026, all versions in one place. The current version is on top; past versions stay below unchanged so we can swap parts back in.

| | |
|---|---|
| Title | Make your Postgres agent-ready: Branching, isolation, and safer shipping |
| Slot | Thursday, October 29, 2026, 12:45–1:00 PM PT, 15 minutes |
| Speaker | Andre Landgraf, Staff Developer Advocate, Databricks |
| Demo | The Software Factory in this repo ([demo-spec.md](demo-spec.md)) building vibecastly's addons feature |

## Versions

| Version | Date | What changed |
|---|---|---|
| [v3](#v3-current) | Oct 20 | Opening rewritten around "agent speed"; the oracle is production; Lakebase intro with the two ways in; Software Factory demo |
| [v2](#v2-html-flow-deck) | Oct 18 | 17-slide HTML flow deck: Bun and math examples, the oracle, Bobby Tables, Lakebase, branching, recovery, Copilot CLI demo |
| [v1](#v1-session-outline) | Sep 9 | Session outline submitted to GitHub: Bobby Tables hook, architecture, Copilot CLI + GitHub Actions release demo with restore |

## Main message

Agents ship fast when they can check their work. For operational systems, that check is production. So infra has to run at agent speed: copies of production that are instant, isolated and easy to throw away.

## v3 (current)

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

What a time to be alive. Agents just rewrote Bun from Zig to Rust, a project that would have taken an engineering team a lot longer than a week. In fact, I've heard the rewrite went faster than writing the blog post that documents it. [VERIFY: source for the blog post comparison]

And math is apparently solved. I'm not smart enough to explain which problems, but OpenAI and Anthropic both published results this summer on problems that had been open for decades.

Agents are doing incredible things and they're doing them at agent speed. That's what I want to talk about today: agent speed and how to bring it to your database.

### The oracle

Of course, agents don't pull this off because you prompt "rewrite Bun in Rust" or "solve math". These big projects work because they have really good verification.

Bun has a test suite written in TypeScript, so the Zig and the Rust versions can both run it. Every change runs the tests, the agent fixes what fails and iterates until everything passes. I'd guess the first 98% of the tests needed no human at all. The last mile is where the judgment calls are, and that's where people come back in. But the verification loop gets you through the meaty part.

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

One live run of the dashboard in this repo. Times are averages from five runs on Oct 19 (seconds from dragging the card).

| Time | Window | Highlight |
|---|---|---|
| 0:00 | Dashboard | One board. Neon has only production. Click + on Draft to show where a card comes from, then close it |
| 0:04 | Dashboard | Drag Addons into To do. Three agents pick it up |
| 0:07 | Neon branches panel | Builder branches production. `dev/addons` appears in seconds |
| 0:10 | Dashboard | Migration and tests run against a full copy of production data |
| 0:27 | Dashboard | Security reviewer checks the diff |
| 0:37 | Dashboard, then GitHub | PR opened by the agent. Open the PR, then the Actions run |
| 0:45 | GitHub Actions | Preview branch from production, Drizzle migration, schema diff, Vercel preview |
| 1:15 | PR comment | Schema diff: the database change shows up in review |
| 1:30 | Dashboard | `preview/pr-N` in Neon branches. Infra at agent speed: a branch in seconds, a full preview in about 90 seconds |
| 2:14 | Dashboard, then terminal | Preview ready. Hand off to Copilot CLI: `./scripts/e2e -i` |
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

Oct 18. A 17-slide HTML deck to feel the flow: [talk-deck-v2/index.html](talk-deck-v2/index.html). Open it in a browser; N shows speaker notes, T a timer, G the overview, R resets. Slides and notes:

1. **Title.** Make your Postgres agent-ready: Branching, isolation, and safer shipping. Andre Landgraf, Staff Developer Advocate, Databricks. *Notes:* Short. Get to the hype fast.
2. **2026 → 2027.** Programming now runs at agent speed. *Notes:* Start on a high note. Heading into 2027, you can build whatever you want. Programming now runs at agent speed. So does math. Two examples.
3. **Programming: Bun, rewritten from Zig to Rust.** About 11 days until the full test suite passed; 100% of the test suite passing on all platforms before merge; about $165k in tokens. Sources: bun.sh/blog/bun-in-rust, github.com/oven-sh/bun/pull/30412, claude.com/resources/articles/ai-code-migration. *Notes:* Bun rewrote the whole runtime from Zig to Rust with agents. Merged in May. About 11 days from start to the full test suite passing on every platform. Around 165k dollars in tokens.
4. **Math: OpenAI.** Ten long-standing open problems, resolved or advanced: 10 results including Erdős problems 183, 146 and 180; about $2k in tokens for all ten; 10/10 formalized as Lean proofs. Sources: openai.com/index/ten-advances-in-mathematics (Aug 1, 2026), github.com/openai/ten-proofs. *Notes:* In August OpenAI published ten results on long-standing open problems: sphere packing, Ramsey numbers, three Erdős problems. All ten together cost about 2,000 dollars in tokens. And every one ships with a Lean certificate.
5. **Math: Anthropic.** Riemann zeta zeros on the critical line: 41.6% → 67.2% of zeros proven to lie on the critical line; about 60 subagents, thousands of numerical checks, one Lean 4 proof. Sources: anthropic.com/research/riemann-zeta (Aug 10, 2026), github.com/anthropics/zeta-23-lean. *Notes:* Asked to take a real stab at the Riemann hypothesis. It didn't prove it. It did raise the share of zeta zeros proven to sit on the critical line from 41.6 to 67.2 percent. Fun detail: the person prompting it was Jarred Sumner, from the Bun slide.
6. **How does that succeed?** Smart models. And an oracle. *Notes:* Models are really smart, sure. But it's also about having an oracle: a way to verify.
7. **The oracle.** Each one had a way to check the answer. Bun: the test suite, written in TypeScript, so any implementation, Zig or Rust, can run it. Math: Lean; every proof step is machine-checked. *Notes:* Great oracle for whether the model succeeded. Every hypothesis can be checked immediately and discarded.
8. **The oracle loop.** With an oracle, you can run a loop. Or a thousand: agent attempt → oracle → keep, or fail → discard, try again, × 1,000 in parallel. *Notes:* Development keeps moving this way: build the oracle first so you can verify and build fast.
9. **But agents get things wrong. A lot.** Anthropic, Riemann zeta: 650 ideas, none worked, before the run that found the new bound. Knuth, "Claude's Cycles": "He had to do some restarts when Claude stopped on random errors; then some of the previous search results were lost." Sources: anthropic.com/research/riemann-zeta, cs.stanford.edu/~knuth/papers/claude-cycles.pdf. *Notes:* Agents need environments as close to production as possible, and they need to recover.
10. **In a database, "wrong" looks like this.** xkcd 327, Robert'); DROP TABLE Students;-- with "your coding agent" written over it. What now? (xkcd.com/327, CC BY-NC 2.5) *Notes:* We all know little Bobby Tables. Now cross out his name: it's your agent that dropped the table. What now?
11. **Operational systems.** For operational systems, the oracle is production. Instant: a copy of production per attempt, a thousand at once. Isolated: nothing an agent does touches the real thing. Recoverable: every mistake has an undo. Infra has to run at agent speed. Today: the database. *Notes:* Bun had its test suite. Math has Lean. For operational systems, the oracle is the production environment: real schema, real data, real traffic.
12. **Lakebase Postgres.** Postgres on the lakebase architecture: Postgres computes (production, agent branch, scaled to zero), safekeepers (WAL), pageservers, object storage. Stateless compute, storage keeps the full history. Lakebase Postgres, available via Neon and via Databricks. *Notes:* That's what makes instant, copy-on-write branches possible. Same database via Neon and via Databricks. The demo uses Neon.
13. **Branching.** One branch per agent loop: production → agent-1 … agent-1000. Copy-on-write: shared history, isolated writes; seconds to create, whatever the size; throw it away when the attempt fails. *Notes:* A branch is a new compute on the same history. No copy. Every agent loop gets its own copy of production: that's the oracle for database changes.
14. **Recovery.** Any point in history is a restore point: production → backup-before-migration → `DROP TABLE notes;` → restored with `neon branches restore production backup-before-migration`. *Notes:* Take a backup branch before the production change. Agent drops a table: restore production to the backup.
15. **Demo: Copilot CLI + a branch of production.** 7:20 repo with AGENTS.md database rules and Neon skills; 7:50 agent branches, migrates, verifies against real data, retries; 10:30 merge: backup branch, then production; 12:00 destructive change, then restore. *Notes:* 6:40 total. Jump cuts are fine: prepared branch, prepared PR, finished runs.
16. **What now?** Agents ship fast when they can check their work. For operational systems, that check is production: instant to copy, isolated, easy to roll back. Infra has to run at agent speed. *Notes:* Programming already runs at agent speed. Infra has to catch up. Ask yourself: where can your agents experiment, and what can you recover after a mistake?
17. **Thank you.** Demo repo link or QR, @andrelandgraf.

## v1: Session outline

Sep 9, submitted to GitHub's session-outline template.

### Abstract (current)

Giving agents access to real database infrastructure is risky: one wrong migration and production breaks. Database branching changes that.

When your Postgres database supports instant, isolated branches, agents can safely experiment on real schemas and data without touching production. This means safer experimentation, faster shipping, and preview environments that spin up automatically.

In this session, Andre Landgraf shows how branching and isolation work under the hood, how to set up agent-ready database environments using tools like MCP and GitHub Actions, plus a live demo of an agent managing a database branch end to end. You'll leave with a clear framework for making your own database infrastructure safe for agentic workflows.

### Abstract (first iteration)

Postgres is becoming the git for OLTP. Where git is the default for version control, the industry is standardizing on Postgres as the operational data layer.

Why? It's battle-tested, open source, extensible, and community-led. Virtually every PaaS offers a Postgres service in 2026. However, Postgres is also over 30 years old and wasn't built with agents in mind.

This talk shows how Serverless Postgres changes that. We'll break down Neon's architecture and how database branching enables agentic development, and how it powers platforms like Replit, Retool, and Netlify DB.

### One thing to remember

I want to make a case that AI infra needs branching, snapshots and instant rollbacks across the stack so agents can make mistakes and recover. I'll use serverless Postgres to show what bringing those capabilities to the database looks like.

### The audience's problem

I'm speaking to developers who are bringing agents into their existing GitHub workflows, but still have trouble testing and recovering database changes. Local seed data goes stale. Agents need environments that represent production to develop in and test migrations.

I want to show how database branching fits into that workflow: where the agent works, how GitHub Actions tests a migration and what we can recover when it goes wrong.

### Opening hook

I'll open with xkcd's little Bobby Tables, cross out his name and replace him with an agent that dropped a table, then ask, "What now?" It connects a familiar database failure to the work we're starting to give agents.

Next, I'll walk folks through a GitHub Actions release workflow. When do we run the migration? How do we test it? What happens if it fails? Those questions give the architecture diagram and demo a problem to work through.

### Flow (2 + 5 + 7 + 1 = 15 min)

**Opening, 2 min.** Bobby Tables with an agent, "What now?", then a GitHub Actions release workflow: when do we run the migration, how do we test it against data that represents production, what happens if it goes wrong? These are database problems developers already face; giving agents the same work adds another reason to make testing and recovery part of the release workflow.

**Architecture, 5 min.** An animated architecture diagram of serverless Postgres and the lakebase architecture that enables branching, snapshots and rollbacks. Lakebase Postgres as the example, the same database via Neon and via Databricks; the demo uses Neon. Trace the workflow through the diagram: a branch for development and migration testing, a snapshot or backup branch before the production change and a recovery point if that change drops a table.

**Demo, 7 min.** GitHub Copilot CLI builds a small feature that requires database changes, guided by `AGENTS.md` and agent skills through a branch-based workflow on Neon. Jump to an open PR with the completed feature and merge it. The merge triggers GitHub Actions: a fresh database branch, the migration tested, an agent or script investigating the results. Once cleared, the workflow creates a backup branch and applies the migration to production. Then a destructive outcome in the same workflow, recovered by rolling back to the snapshot or backup branch.

**Close, 1 min.** Back to "What now?" We've seen an agent change a database, a workflow test that change and recovery after a destructive outcome. Branching, snapshots and instant rollbacks belong across the stack when we're building infra for agents. Where can your agents experiment, and what state can you recover after a mistake?

### Questions sent to GitHub

- Do you prefer a live demo or a pre-recorded demo for this slot? Agent and GitHub Actions execution times make a live run harder to keep within seven minutes.
- Does the 15-minute slot include Q&A at all?
