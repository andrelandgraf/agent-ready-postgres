---
name: e2e-preview-screenshot
description: Test the vibecastly addons preview from the Software Factory and capture the one screenshot the dashboard shows. Use when asked to run the e2e test, test the preview, or take the demo screenshot.
---

# E2E preview screenshot

This runs live on stage. Be fast, not thorough. Run the three commands below in order, each as one shell command exactly as written. Do not split them, explore the repo, or inspect the page unless a command fails. All credentials are already in the environment; never print them.

1. Read the preview the dashboard is showing:

   ```bash
   curl -s -H "authorization: Bearer $FACTORY_PASSWORD" "$FACTORY_URL/api/state" | jq -r '.pr.number, .pr.previewUrl, ([.branches[] | select(.name == ("preview/pr-" + (.pr.number|tostring)))][0].id)'
   ```

   It prints the PR number, the preview URL, and the preview branch id. Stop and report if the URL is `null`.

2. Sign in, add the party hat, type the prompt, screenshot, and upload. Replace `<url>` with the preview URL:

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
   curl -s -f -X POST "$FACTORY_URL/api/screenshot" -H "authorization: Bearer $FACTORY_TOKEN" --data-binary @"$ROOT/screenshots/addons.png"
   ```

3. Confirm the addon is in the preview branch's database with the `run_sql` tool of the `neon` MCP server. Do not use the `neon` CLI, `psql`, or a connection string for this: project `summer-credit-62081215`, the branch id from step 1, database `neondb`, SQL `select name, kind from addons order by created_at desc limit 3`.

Then reply in at most three lines: the PR number, that the screenshot was uploaded, and the rows `run_sql` returned. Do not generate an image.
