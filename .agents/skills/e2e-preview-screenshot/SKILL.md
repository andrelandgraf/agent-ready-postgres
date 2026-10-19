---
name: e2e-preview-screenshot
description: Test the vibecastly addons preview from the Software Factory and capture the one screenshot the dashboard shows. Use when asked to run the e2e test, test the preview, or take the demo screenshot.
---

# E2E preview screenshot

This runs live on stage. Be fast, not thorough. Run the steps below in order, each shell command as one command exactly as written. Do not split them, explore the repo, or inspect the page unless a command fails. All credentials are already in the environment; never print them.

1. Read the preview the dashboard is showing:

   ```bash
   ./scripts/factory-preview
   ```

   It prints the PR number, the preview URL, and the preview branch id. Stop and report if any of them is `null`.

2. Sign in, add the party hat, type the prompt, and take the screenshot. Replace `<url>` with the preview URL:

   ```bash
   set -e
   ROOT="$(git rev-parse --show-toplevel)"
   export AGENT_BROWSER_SESSION=factory-e2e
   agent-browser set viewport 1440 900
   agent-browser open "<url>/login"
   agent-browser fill 'input[type=email]' "$DEMO_EMAIL"
   agent-browser fill 'input[type=password]' "$DEMO_PASSWORD"
   agent-browser press Enter
   agent-browser wait --text "Addons"
   if ! agent-browser get text '[data-testid=addons-panel]' | grep -q PartyHat; then
     agent-browser click '[data-testid=addons-panel] button'
     agent-browser upload '[role=dialog] input[type=file]' "$ROOT/fixtures/party-hat.png"
     agent-browser fill '#addon-name' PartyHat
     agent-browser find role button click --name "Add addon"
     agent-browser wait --text "PartyHat"
   fi
   agent-browser fill 'textarea' '@Andre wearing @PartyHat on stage at GitHub Universe'
   mkdir -p "$ROOT/screenshots"
   agent-browser screenshot "$ROOT/screenshots/addons.png"
   agent-browser close
   ```

3. Confirm the addon is in the preview branch's database with the `run_sql` tool of the `neon` MCP server. Do not use the `neon` CLI, `psql`, or a connection string. Call it once with exactly these arguments, putting the branch id from step 1 in `branch_id`:

   ```json
   {"project_id": "odd-block-46739925", "branch_id": "<branch id>", "database_name": "neondb", "sql": "select name, kind from addons order by created_at desc limit 3"}
   ```

   Stop and report if no `PartyHat` row comes back.

4. Only after step 3 found the row, hand the screenshot to the dashboard:

   ```bash
   ./scripts/upload-screenshot screenshots/addons.png
   ```

Then reply in at most three lines: the PR number, the rows `run_sql` returned, and that the screenshot was uploaded. Do not generate an image.
