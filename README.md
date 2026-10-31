# My Day

A small personal app for an Android phone with two jobs:

- **Day ahead:** your meetings (from Google Calendar) with a brief for each one, who you are meeting (from your Notion CRM), and your to-dos (from your Notion Task Database). Tick a task off and it is marked Done in Notion.
- **Review:** log the day, usually next morning: mood, energy, what it was about, what happened. History shows mood over time and simple patterns against sleep, sport and steps.

It does not have a server of its own. It talks to the **Worker from the Calorie tracker repo** (`worker/` there), which already holds the Google connection and now also talks to Notion. Both apps share one Worker address and one app key.

| Part | Where it lives |
|---|---|
| The app (`index.html`, `manifest.webmanifest`, `sw.js`, icons) | GitHub Pages, this repo, `main` / root |
| Worker (`/api/calendar`, `/api/tasks`, `/api/brief`, `/api/days`) | Cloudflare, deployed from the Calorie tracker repo |

**No personal data is stored in this repo.** Reviews and notes live in the phone's browser storage.

## One-time setup

### 1. Google: switch on Calendar
1. <https://console.cloud.google.com> → your project → **APIs & Services → Library** → "Google Calendar API" → **Enable**.
2. **Data Access** (or "Scopes") → add `https://www.googleapis.com/auth/calendar.readonly` → Save.
3. In **Calorie tracker or My Day → Settings → Connect Google**, sign in again and approve calendar access. (Google asks again because the permission list grew.) Settings → *Check connection* should then say "Calendar permission: granted".

### 2. Notion: let the Worker read your tasks and CRM
1. Notion → *Settings → Connections → Develop or manage integrations* → use the integration you already have for Pocket CRM, or create an **internal** one with *Read content*, *Update content* and *Insert content*.
2. Connect it to what it needs: open the **Task Database** → ••• → *Connections* → add it; open the **Work CRM** page → ••• → *Connections* → add it (People and Companies sit under it).
3. In a Terminal, from the `worker` folder of the Calorie tracker repo (the token is typed there, never in chat):
   ```bash
   npx wrangler secret put NOTION_TOKEN
   npx wrangler deploy
   ```
   `NOTION_TASKS_DB` and `NOTION_PEOPLE_DB` are already in `wrangler.toml`.

### 3. Install and connect
1. Open `https://caloriesin-n-out.github.io/My-Day/` in Chrome, reload twice, then **⋮ → Install app**.
2. Open the app → **Settings**. Tap **Copy from Calorie tracker** (works when both are opened in the same Chrome), or paste the Worker address and app key. **Save**, then **Check connection**.

## Using it
- **Day ahead:** next meeting is highlighted; tap a meeting for time, where, join link, who is invited (✓ yes, ? maybe, ✗ no, · no reply), the description, **From your CRM** (role, company, last contact, history summary, open tasks, a button to add a task for that person) and a private prep-notes box.
- **To-dos** group into overdue, due today, in progress, next three days and waiting on others. Tasks linked to a person or company are tagged CRM. Backlog and Done are left out, like your Notion views.
- **Review:** the date defaults to yesterday before noon. Everything saves as you go. "Add meetings and tasks to my notes" pastes that day's meetings and completed tasks into your text to edit.
- **History:** 14, 30 or 90 days. Patterns only appear once there are at least four logged days on each side of a comparison.
- **Settings → Export backup** saves reviews and prep notes. Do this before changing the app's web address.

## Not yet verified
Tested with simulated Google and Notion and in a phone-sized browser. **Not** tested against your real accounts: the Calendar API reply, the Notion property names in your databases (taken from your schema), matching attendees by email (`contains`, which Notion may treat as case-sensitive), installing on the Pixel, and the service worker.
