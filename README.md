# My Day

A small personal app for an Android phone. One screen for the day, plus a review afterwards.

- **Day:** a week strip, then your to-dos and a timeline of the day with meetings and timed tasks. Tap a meeting for a brief: who is invited, the description, **who they are in your Notion CRM**, recent email with them, and your private prep notes. Tap an empty slot or the **+** button to add an event, a task or a meeting note.
- **Readiness for training (1 to 10):** a card at the top of today. It scores last night's sleep (35%), HRV (25%), resting heart rate (25%) and the last two days' training load (15%), each against your own 28-day normal, so it needs about a week of data to learn you. About 7 is an ordinary day; 8 to 10 means good to go hard, 4 to 5 keep it light, 1 to 3 rest. Skin temperature, breathing rate or blood oxygen well off your normal hold the score at 5 at most. Tap the card to see each part. It is a rule of thumb from your own numbers, not medical advice.
- **Inbox:** your unread mail from the main (Primary) inbox, newest first, with sender, subject and a preview. Social (LinkedIn and similar), promotions, updates and forums are left out. Mail from people in your CRM is marked. Tap a mail to open it in Gmail, or **+ Task** to turn it into a Notion task linked to the sender.
- **Day screen:** today's **steps** and **calories burned** so far (from Google Health, the same connection as sleep and readiness) sit under the readiness score.
- **Quick counters:** a slim box on the day screen (tap its line to open or close it; closed, it still has a **+💧** button). Tap **Water** for each glass (a glass is 250 ml), tick **Drinking alcohol** to get Beer, Wine, Long drink and Shot counters (they stay hidden until it is ticked), and tick **Travelling** or **Ill or injured**. Ill or injured holds the readiness score at 5. It works for today and past days, and it edits the same entry the Review tab shows for that date, so the two always agree. Review also has plus **Had sex** (Review only). All of it is saved in that day's entry on the phone, and History compares mood on days with and without each.
- **Review:** log the day, usually next morning: mood, energy, sport (Run, Walk, Gym, Golf, Tennis, Padel), what it was about, tick boxes for **alcohol** and **sex**, what happened. History shows mood over time and simple patterns against sleep, sport, steps and alcohol. Everything stays on your phone.
- **Portfolio** (under More): your crypto holdings with live prices from CoinMarketCap, like the CoinMarketCap app: price and 24 h change per coin, value, amount, and a total. **Hide amounts** blanks the numbers on screen. The amounts you hold are typed or pasted into the app and stay on your phone; only prices come from CoinMarketCap.
- **More:** start a **new meeting note** in your Notion Meetings database, open the Meetings and Task databases in Notion, open **Pocket CRM** (your contacts app) and the **LinkedIn** app, the installed **Racket Rankings** app, Portfolio, History and Settings. On Android the two app buttons ask the phone to open the app itself (the installed Pocket CRM, by its Android package name `org.chromium.webapk.a5bf4b8d4443f6622_v2`, and the LinkedIn app) and fall back to the web page when it is not installed. If Pocket CRM is ever installed again, its package name can change: look it up at `chrome://webapks` in Chrome and update `POCKET_CRM_PACKAGE` in `index.html`.

It has no server of its own. It talks to the **Worker from the Calorie tracker repo** (`worker/` there), which holds the Google connections and the Notion token. Both apps share one Worker address and one app key. This app lives in its own GitHub organisation (`MyDayAppMH`), so the Worker's `ALLOWED_ORIGIN` lists both web addresses.

| Part | Where it lives |
|---|---|
| The app (`index.html`, `manifest.webmanifest`, `sw.js`, icons) | GitHub Pages, this repo, `main` / root |
| Worker (`/api/calendar`, `/api/calendar/add`, `/api/mail/*`, `/api/tasks`, `/api/brief`, `/api/meetings/new`, `/api/crypto/*`, `/api/days`) | Cloudflare, deployed from the Calorie tracker repo |

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

### 3. CoinMarketCap prices (for the Portfolio, optional)
1. Make a free account at <https://pro.coinmarketcap.com> and copy your API key from the dashboard (the free Basic plan is enough: the app asks at most about once a minute while the Portfolio is open).
2. In a Terminal, from the `worker` folder of the Calorie tracker repo (type the key there, never in chat):
   ```bash
   npx wrangler secret put CMC_API_KEY
   ```
3. In **More → Portfolio**, tap **Paste a list** (one coin per line, like `HYPE 169.5`) or **+ Add coin**. A ticker can belong to several coins, so the app shows the candidates, best-ranked first, and you pick.

### 4. Install and connect
1. Open `https://mydayappmh.github.io/My-Day/` in Chrome, reload twice, then **⋮ → Install app**.
2. **Settings:** paste the Worker address (`https://calorie-tracker.matthias-homan.workers.dev`) and the same app key you use in Calorie tracker. **Save**, then **Check connection**. You want Calendar and Gmail connected (including adding events), Health connected, Notion and the Meetings database set up.
3. **Refresh everything**, then open **Day**.

## Using it
- **Week strip:** tap a day to see it, ‹ › move a week. Today is outlined. **Today** brings you back. **Swipe left or right** on the Day tab to move between days. **Settings → Display** can show Mon to Fri only (a weekend day always shows all seven).
- **To-dos** are in a collapsible card: overdue and due today first, the rest under "more". Tasks with a due *time* also appear on the timeline. Tick a task and it is marked Done in Notion, with Undo. Backlog and Done are left out, like your Notion views.
- **Add:** the **+** button offers New event, New task and New meeting note. Tapping an empty slot on the timeline starts an event at that time. An event with guests sends them an invitation; one without guests emails nobody. A task's sheet has **Block time**, which prefills an event.
- **Meeting notes:** from a meeting's sheet, **New meeting note** creates a page in your Notion Meetings database with the meeting's name, date and time, and the attendees who are in your CRM, then offers **Open in Notion**. From the **+** menu or **More** it creates a blank note for now.
- **Portfolio:** tap a coin to change the amount or remove it. If a price looks wrong, it is probably the wrong coin for that ticker: remove it and add the right one. Your amounts are in the backup file too, so keep that file private.
- **Inbox filters:** All, From CRM, Starred, Last 2 days. **Tap a mail** to read it right there (quoted history is cut, long mails are shortened, attachments are listed). **Open in Gmail** is one tap away. Reading in My Day does not mark the mail as read in Gmail, and the text is not saved on your phone.
- **Review:** the date defaults to yesterday before noon. Everything saves as you type. "Add meetings and tasks to my notes" pastes that day's meetings and completed tasks into your text.
- **Home-screen shortcuts:** press and hold the My Day icon on the phone for **New task**, **New event** and **Review**; the first two open their form straight away, Review opens the Review tab. (Android updates an installed app's shortcuts when it next checks for changes, which can take a day; reinstalling the app makes it immediate.)
- **Settings → Theme:** Dark (default), Light, or Match phone. **Export backup** saves reviews and prep notes; do this before changing the app's web address.

## Not yet verified
Tested with simulated Google, Gmail and Notion, and in a phone-sized browser. **Not** tested against your real accounts: the Calendar and Gmail replies, creating events and Meet links, the Notion property names, the Meetings database id (a wrong one shows as "could not find database"), matching senders and attendees by email (Notion may treat `contains` as case-sensitive), whether Gmail links open the Gmail app on the Pixel, installing, and the service worker.
