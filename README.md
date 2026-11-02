# My Day

A small personal app for an Android phone. One screen for the day, plus a review afterwards.

- **Day:** a week strip, then your to-dos and a timeline of the day with meetings and timed tasks. Tap a meeting for a brief: who is invited, the description, **who they are in your Notion CRM**, recent email with them, and your private prep notes. Tap an empty slot or the **+** button to add an event, a task or a meeting note.
- **Inbox:** your unread Gmail, newest first, with sender, subject and a preview. Mail from people in your CRM is marked. Tap a mail to open it in Gmail, or **+ Task** to turn it into a Notion task linked to the sender.
- **Review:** log the day, usually next morning: mood, energy, what it was about, what happened. History shows mood over time and simple patterns against sleep, sport and steps.
- **More:** start a **new meeting note** in your Notion Meetings database, open the Meetings and Task databases in Notion, History and Settings.

It has no server of its own. It talks to the **Worker from the Calorie tracker repo** (`worker/` there), which holds the Google connections and the Notion token. Both apps share one Worker address and one app key. This app lives in its own GitHub organisation (`MyDayAppMH`), so the Worker's `ALLOWED_ORIGIN` lists both web addresses.

| Part | Where it lives |
|---|---|
| The app (`index.html`, `manifest.webmanifest`, `sw.js`, icons) | GitHub Pages, this repo, `main` / root |
| Worker (`/api/calendar`, `/api/calendar/add`, `/api/mail/*`, `/api/tasks`, `/api/brief`, `/api/meetings/new`, `/api/days`) | Cloudflare, deployed from the Calorie tracker repo |

**No personal data is stored in this repo.** Reviews and notes live in the phone's browser storage, along with a recent copy of your calendar, tasks and unread-mail list so the app opens fast.

## One-time setup

### 1. Google Cloud: Calendar and Gmail
1. <https://console.cloud.google.com> → your project → **APIs & Services → Library**. Enable **Google Calendar API** and **Gmail API**.
2. **OAuth consent screen → Data Access → Add or remove scopes**. Under "Manually add scopes" add these, then **Update** and **Save**:
   ```
   https://www.googleapis.com/auth/calendar.readonly
   https://www.googleapis.com/auth/calendar.events
   https://www.googleapis.com/auth/gmail.readonly
   ```
3. In **My Day → Settings → Connect Google (Calendar and Gmail)**, sign in and approve all three. This login is separate from Google Health on purpose: the Health API refuses any login that also carries a calendar or Gmail permission. Health stays connected from **Calorie tracker → Settings → Connect Google Health**.

`gmail.readonly` is what Google calls a restricted permission. For your own account as a test user it works, with an "unverified app" warning and the 7-day reconnect that applies while the consent screen is in Testing. My Day never sends, deletes or changes mail.

### 2. Notion: let the Worker read and write your databases
1. Notion → *Settings → Connections → Develop or manage integrations* → use the integration Pocket CRM uses, or create an **internal** one with *Read content*, *Update content* and *Insert content*.
2. Connect it (••• → *Connections*) to the **Task Database**, the **Work CRM** page (People and Companies sit under it) and the **Meetings** database if it is not under Work CRM.
3. In a Terminal, from the `worker` folder of the Calorie tracker repo (the token is typed there, never in chat):
   ```bash
   npx wrangler secret put NOTION_TOKEN
   npx wrangler deploy
   ```
   `NOTION_TASKS_DB`, `NOTION_PEOPLE_DB` and `NOTION_MEETINGS_DB` are already in `wrangler.toml`.

### 3. Install and connect
1. Open `https://mydayappmh.github.io/My-Day/` in Chrome, reload twice, then **⋮ → Install app**.
2. **Settings:** paste the Worker address (`https://calorie-tracker.matthias-homan.workers.dev`) and the same app key you use in Calorie tracker. **Save**, then **Check connection**. You want Calendar and Gmail connected (including adding events), Health connected, Notion and the Meetings database set up.
3. **Refresh everything**, then open **Day**.

## Using it
- **Week strip:** tap a day to see it, ‹ › move a week. Today is outlined. **Today** brings you back.
- **To-dos** are in a collapsible card: overdue and due today first, the rest under "more". Tasks with a due *time* also appear on the timeline. Tick a task and it is marked Done in Notion, with Undo. Backlog and Done are left out, like your Notion views.
- **Add:** the **+** button offers New event, New task and New meeting note. Tapping an empty slot on the timeline starts an event at that time. An event with guests sends them an invitation; one without guests emails nobody. A task's sheet has **Block time**, which prefills an event.
- **Meeting notes:** from a meeting's sheet, **New meeting note** creates a page in your Notion Meetings database with the meeting's name, date and time, and the attendees who are in your CRM, then offers **Open in Notion**. From the **+** menu or **More** it creates a blank note for now.
- **Inbox filters:** All, From CRM, Starred, Last 2 days.
- **Review:** the date defaults to yesterday before noon. Everything saves as you type. "Add meetings and tasks to my notes" pastes that day's meetings and completed tasks into your text.
- **Settings → Theme:** Dark (default), Light, or Match phone. **Export backup** saves reviews and prep notes; do this before changing the app's web address.

## Not yet verified
Tested with simulated Google, Gmail and Notion, and in a phone-sized browser. **Not** tested against your real accounts: the Calendar and Gmail replies, creating events and Meet links, the Notion property names, the Meetings database id (a wrong one shows as "could not find database"), matching senders and attendees by email (Notion may treat `contains` as case-sensitive), whether Gmail links open the Gmail app on the Pixel, installing, and the service worker.
