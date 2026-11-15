# Sawyer (beta) — v2.20.0

**Sawyer** is a nationwide contractor marketplace: homeowners hire licensed pros, project managers assemble whole crews, and every review and photo is tied to a finished job.

Live: https://trestle-twjo.onrender.com · version check: `GET /healthz` → `{"v":"2.20.0-sawyer","persistent":false,…}`

> **Renaming:** the product name, wordmark, tagline, demo-login domain and DB file name all come from `brand.json` (one line). Old DB files (`toolbelt.db`, `spanwise.db`, `trestle.db`) are migrated automatically on boot.

## Demo logins
All demo accounts share the password **`sawyer-demo-2026`**. Every person and business in the seed data is fictional.

| Role | Email | What to try |
|---|---|---|
| Homeowner (Pat, Austin TX) | `demo-homeowner@sawyer.test` | **Compare bids** on "Water heater leaking" (3 bids). **Escrow sign-off** on "Primary bath remodel" (one milestone waiting). Saved **photo-to-quote** estimate. |
| Pro (Bluebonnet Plumbing) | `demo-pro@sawyer.test` | Rapid responder badge, dashboard reply-time tile (demo stock photos are not shown as its work). |
| Pro (Barton Creek Remodeling) | `demo-remodeler@sawyer.test` | Hired on the bath remodel: upload before/after photos, request milestone sign-off. |
| Project manager (Dana, Copperline Build Group) | `demo-pm@sawyer.test` | **Crew builder** on the Tampa deck & seawall project: dated slots, available-pro suggestions, invite or book the whole crew. |
| Business (Lakeway Dental Group) | `demo-business@sawyer.test` | Invoices to pay, multi-location requests, COIs. |
| Traveling electrician (Marcus Delgado) | `demo-traveler@sawyer.test` | References from foremen, "Ask for a reference", status picker, saved calls and alerts with live match counts. |
| Trust team (Sawyer staff) | `demo-trust@sawyer.test` | **Moderation queue** (`/mod`): reported reviews and pro disputes, plus the **Verification** queue for license and insurance certificates; approve or reject with a reason. |

Seed data covers Austin, Phoenix/Scottsdale, Tampa, Atlanta, Seattle, Detroit, Minneapolis, Brooklyn, Denver and Chicago.


## v37: appointments customers confirm, a home history by property, exact markups

- **Appointments customers can count on** (no-shows and loose scheduling are a top complaint about the big sites, `research/competitor-flaws.md` #12). When a pro schedules a visit (Office → Schedule, or **Schedule a visit** on a hired job's page) they pick an **arrival window**: exact time, or a 1-, 2-, 3- or 4-hour window ("Arrive 8–10am"). The visit can be tied to the hired job. The customer gets "… scheduled "Water heater install" for Thu, Nov 19, arrive 8–10am. Tap to confirm or ask for another time." and sees an **Appointment** card on that job's page, on the tracker and as the first next step on their dashboard, with **Confirm this time** or **Ask to reschedule** (up to 3 times that work for them, from today to 6 months out, plus an optional note). The pro sees ✓ / ↻ / ? on the week calendar chip and "Asked to reschedule" in the visit sheet with **Use this time** next to each offered time: one tap moves the visit, marks it confirmed and tells the customer. If the pro changes the day, time or window themselves, the customer is asked to confirm again. **On my way** (v8) still sends the live ETA. Checked on the server: only that customer can confirm or ask (`visitConfirm37`, `visitAsk37`), only that pro can pick (`visitPick37`), nothing once the pro is on the way, at most 6 asks per visit. Visits only ever reach their pro and their customer in `/api/state`; the reschedule note isn't in any notice text.
- **Phone alerts for appointments.** A new alert switch, **visits** ("My pro is on the way, or my appointment is set or moved" / "A customer confirms or asks to move a visit"), on by default for everyone who turned alerts on. Scheduled, moved, confirmed, reschedule asked, on the way, arrived, done and canceled go through the existing push plumbing (v32) and open `/track/<visit>`. The push carries the notice text (who, the visit title and the time); a customer's reschedule note never goes in a notice or a push. Each account can turn the switch off on its own.
- **My home: a home history by property** (`/myhome`, from the account menu, the home log and the dashboard). One page per property: **Your home** (or your business), each business location, and up to 10 places you add yourself (a rental, a cabin, a parent's house). Every job you hired a pro for (in progress and done), the invoices and estimates that go with it (paid / due), warranties (from invoices and your own), photos of the work (the pro's job photos and the v36 invoice photos) and your own **notes** with an optional photo (paint colors, filter sizes, where the shutoff is). Jobs file themselves by ZIP and can be moved with the picker next to them. **Print or save as PDF** gives a clean printout headed "Home history printed <date> from Sawyer" (no menus or buttons), and **Download (CSV)** saves the same list (formula-safe). Private to the account: it lives on your own record (`home37`), which other accounts, the pros you hired and signed-out visitors never get; note photos must be your own uploads (checked in `server.js`).
- **SW-085: exact markups.** The job-cost markup is read from its text as hundredths of a percent (33.33% → 3333) and multiplied in whole cents with half-up rounding, so a custom 33.33% on $50 bills **$66.67** (it was $66.66), and $150 / $250 / $350 / $450 bill $200.00 / $333.33 / $466.66 / $599.99. No float multiply is left in `v36Markup`. The saved markup keeps two decimals ("33.335" → 33.34%) and 100.01% is refused.
- Tests: `node test/v37-e2e.js [shots dir]` (self-contained, local stand-in push service) is part of `test/run-all.sh`. `v36-e2e` now accepts any Sawyer version / SW cache name and sweeps 33.33 / 12.5 / 7.25% too; `v32-e2e` expects the new `visits` alert switch. SW cache is `sawyer-v37`. Code: `src/v37.js`, `src/v37.css`.
- Note: posted jobs still only take ZIPs from the built-in town list; a job in any other ZIP (for example Manistee, 49660) is posted under the account's own ZIP, so it lands under **Your home** until it's moved with the picker.

## v36: bill your job costs, photos of the work on invoices, cleaner deletes

- **Bill job costs** (invoice editor → **Job costs**, or **Bill job costs** on Office → Expenses & mileage). Receipts and trips a pro already logged (Expenses & mileage, or the v33 Quick log) go onto an invoice in one step: pick the job tag, set an optional **markup on receipts** (0–100%, presets 0/10/15/20/25, remembered privately as `mk36`), and mileage is billed at the Office rate ($0.70/mi, no markup). The sheet shows cost vs. billed ("Adds 3 lines · $199.18 (cost $182.25 + markup $16.93)") and the lines land in date order with the job name filled in. Each line remembers the receipt it came from (`l36`), so a receipt can be on **one live invoice** only (a second invoice gets a plain line); Expenses & mileage marks rows **Billed on INV-…** and shows a **Not billed yet: $X** card; voiding the invoice (or removing the line and saving) frees the receipt again. The customer's copy has ordinary lines: the server strips `l36` from every bill it sends to anyone but the pro.
- **Photos of the work** (pro's invoice / estimate / change order page). Up to 8 photos per bill, from the phone's camera or library (shrunk on the device like receipt photos) or from that customer's record; each can be tagged **Before / During / After** with an 80-character caption. The customer sees them on the bill itself, above the totals, and taps one for a full-size view with next/previous. Only the pro's own uploads (or photos already on that bill) are accepted, never COI files (checked in `server.js` before `billPhotos36`); location data was already stripped at upload (`lib/imgsafe.js`). Stored on the bill as `ph36`; it prints with the bill.
- **SW-082: deleting a contractor tidies their traveler calls** (same idea as SW-072 for projects). A call nobody was hired on is deleted, with the notices that pointed at it and travelers' saved copies. A call with a hire (filled or not) stays only as a closed, unlisted record without its description, so hired travelers keep their pay terms and Check your check log, and they're told. The server never lists such a call except to its hired travelers and staff; `/t/<id>` is the same generic 404 page as an unknown id for everyone else. Calls of accounts deleted before v36 are tidied once at start (`v36CallOrphans()`).
- **SW-080: Unicode minus budgets.** A budget that starts with any minus or dash (ASCII `-`, U+2212 `−`, hyphen / figure / en / em dashes, small and fullwidth minus), also after a `$`, parses as no budget, like TBD. One check, `v25Neg()`, feeds the lead filters (`v35Budget`) and the posted-budget vs. price-guide note (`v25Budget`).
- **SW-081: staff are never billable customers.** `saveCust` doesn't email-link a staff account (the Trust team, `demo-trust@sawyer.test`), `stmt35` answers "isn't on Sawyer yet" for a row linked to staff, and rows / unpaid bills linked to staff before the fix are unlinked once at start (`v36StaffUnlink()`).
- **Hours-log message.** A day after the server's today or more than 400 days back gets "Log days up to today (Nov 15), from the last 400 days.", naming the server's date, which is exactly what's checked.
- Tests: `node test/v36-e2e.js [shots dir]` (self-contained) is part of `test/run-all.sh`. `v35-e2e` now accepts any Sawyer version / SW cache name. SW cache is `sawyer-v36`. Code: `src/v36.js`, `src/v36.css`.

## v35: a price book, who owes you, lead filters, check your check

- **Price book** (Office → **Price book**). Pros save what they sell at their own price (name, price, per each / hour / job / ft …, category) once, and tap it into any estimate, invoice or change order. **Add from your past invoices** builds it from priced lines already sent (latest price, how often used). Items used on a saved bill rise to the top; the bill editor's **Quick add** chips are the pro's own top 4 (the old fixed chips stay until the book has items), **Price book** opens a searchable picker, and typing a saved name fills its rate. Up to 300 items. The Office backup ZIP adds `price-book.csv` (formula-safe). Private to the pro (`pb35`). The demo pro has 9 seeded items.
- **Who owes you** (top of Office → Invoices). Open balances by how late they are (not due yet, 1–30, 31–60, 61–90, 90+ days), a colored bar, and one row per customer with the oldest late invoice. **Statement** lists that customer's open invoices (total, paid, balance, days late) and offers **Send in Sawyer** (the customer gets "… sent you a statement: $X open on N invoices" and a `/statement/<pro id>` page with a Pay button per invoice; payments stay in test mode), **Copy text** and a **CSV**. One statement per customer per 24 hours, only for customers on Sawyer with open invoices, checked on the server (`stmt35`).
- **Lead filters** (pro dashboard, under New jobs in your area, and on `/jobs`). How far (inside the service radius), smallest job by posted budget ($250 … $5,000+), include jobs with no budget, include urgent jobs, and the trade's job types to skip. A job outside them rings no "New job" bell (so no phone alert) and doesn't count as new; on the dashboard and `/jobs` it stays visible with "Outside your filters: budget under $500". Per-unit budgets ("$150 per turn") aren't compared. Private to the pro (`lf35`); **Turn off** clears them.
- **Check your check** (traveling electricians, on a call they were hired on). Log hours by day (number pad, **Fill 6×10s** from the posting, quarter hours). Sawyer works out what the week should pay from the posted terms: straight time and OT at 1.5× after 40 hours a week (or after 8 a day and 40 a week), and per diem by its posted unit (7 days a week, or days worked). Type the stub's gross wages and per diem and it says **Matches the posting**, **Short $X** or **$X more**, split into wages and per diem. **Message <contractor>** pre-fills a polite summary through Sawyer; **Download hours (CSV)**; **Recent weeks** lists the last 4. A week before the posted start date says so. The traveler dashboard links to it. Private to the traveler (`tlog35`). It checks the math against the posting; it isn't payroll or tax advice. The demo traveler has last week logged with a stub $230 short.
- **SW-076: invoice editor numbers.** The legacy `.num` step badge (absolute, 2.4rem, pale) leaked into the Office invoice editor, so the "Amount" header and each line's amount floated to the top-right of the page. Office and invoice pages now show them in place (v9 fixed the same leak for tables).
- Tests: `node test/v35-e2e.js [shots dir]` (self-contained) is part of `test/run-all.sh`. `v34-e2e` now accepts any Sawyer version / SW cache name. SW cache is `sawyer-v35`. Code: `src/v35.js`, `src/v35.css`.

## v34: deleted accounts leave no listings, wipe detection, a plain beta note, export before you delete

- **SW-072: deleting an account takes its crew projects out of the catalog.** `A.__delete13` (`src/v13.js`) now calls `v34OwnerGone()`: open projects nobody was hired onto are deleted outright, with their crew chat and the "New crew opening" notices that pointed at them. Staffed or finished projects stay only as a closed, unlisted, anonymized record (no description, notes or budget); pending applications and invites are closed and the crew is told. The server never lists an owner-deleted project in anyone's state except its crew, applicants and staff (`ownerGone()` in `server.js`), and projects of accounts deleted before v34 are tidied once at start (`v34Orphans()`). The browse list skips them and the project page says "This project is closed…".
- **Persistence readiness (SW-071 prep, no plan change).** `lib/persist.js` checks whether `DATA_DIR` sits on its own disk mount (not the image's root filesystem, tmpfs or overlay; `SAWYER_PERSISTENT=1/0` overrides). Boot prints `WARNING: data is NOT persistent …` when it isn't and `NOTICE: started from an empty database …` when the DB was freshly seeded. `/healthz` adds `persistent`, `freshDb`, `dbSince`, `boots` (no paths). `DATA_DIR` resolves next to `server.js`, and an unwritable one (disk not mounted) stops the server with one clear `FATAL` line. `render.yaml` has the 1 GB `/data` disk block and the VAPID env keys written out but commented; the plan stays `free`. Steps: **Keep data between deploys** below. `tools/vapid-keys.js` makes a VAPID key pair to paste into the dashboard.
- **Beta note.** While data isn't persistent, sign-up (in the sign-in card), pro sign-up step 1 and Account show "This beta resets from time to time — don't store real jobs here yet." It disappears by itself once a disk is attached.
- **Export my data on the delete screen.** The Delete your account dialog offers **Take a copy first**: **Export my data (ZIP)** builds one ZIP on the device with `sawyer-data.json` (the `/api/account/export` copy), a README, formula-safe CSVs of jobs, quotes, messages and reviews, and, for anyone with Office records, the "Back up everything" files under `office/`. **JSON only** links the plain export. Demo accounts (which can't be deleted) don't get it.
- Tests: `node test/v34-e2e.js [shots dir]` (self-contained) is part of `test/run-all.sh`. `v33-e2e` now accepts any Sawyer version / SW cache name. SW cache is `sawyer-v34`. Code: `src/v34.js`, `src/v34.css`, `lib/persist.js`.

## v33: follow up on quotes, log receipts from the dashboard, reuse a project, one key per device

- **Quotes waiting for an answer** (pro dashboard, under "Here's what's next"). A quote with no reply for 2+ days on a job that is still open and not hired is listed with the homeowner's first name, the price (with cents) and how long ago. **Follow up** opens an editable, friendly check-in ("Hi Hana, just checking in on my quote for … ($1,234.50) …") that is sent as a normal Sawyer message, so the homeowner gets the usual "New message" notice / alert. One follow-up per quote, checked on the server (`followUp33`): not before 2 days, not after a hire, not on someone else's quote, 1,000 characters max. Threads where the homeowner already wrote back after the quote don't show. The follow-up time (`fu33`) stays with that pro and the homeowner; other pros and signed-out state don't get it.
- **Quick log** (pro dashboard). **Receipt**: total (number pad), one-tap category (Materials, Fuel, Tools, Permits, Meals, Dump fees, or More…), vendor and job (remembered), receipt photo (opens the camera on phones). **Trip**: miles, round trip (doubles the miles), from (remembers the last one) and to. Saved as the same Office expense / mileage records, so Reports, the P&L and the tax file include them. After saving: what was logged, **Undo**, **Log another**, **Done**. The card shows this month's receipts and miles. On phones the sheet opens from the bottom.
- **Reuse as template** (project managers). On a PM's own project page, and as **Start from one of your projects** in Post a project: copies trades, role names, crew counts, phases, budget, notes and town into a new draft titled "… (copy)" with blank dates. Crew, applicants and chat are not copied, and nothing is posted until the Review step.
- **SW-069: one device, one key.** Push endpoints are canonicalized (`canonEndpoint()` in `lib/webpush.js`): lowercase scheme and host, no trailing slash, `%XX` upper-cased in the query. That key is used for subscribe, the other-account 409 (SW-068 wording unchanged), unsubscribe, status and test alerts. Spellings no push service hands out are refused with 400: user:pass@, an explicit default port, `%`-escapes in host or path, dot segments, `//`, fragments, backslashes, spaces, non-ASCII. Alerts still go to the exact URL the browser gave (`pushsubs.url`). v32 rows move to the canonical key at start; if two rows are the same device, the one turned on first keeps it.
- Tests: `node test/v33-e2e.js [shots dir]` (self-contained, local stand-in push service; FCM endpoints are only subscribed / checked / removed, never sent to) is part of `test/run-all.sh`. `v32-e2e` now accepts any Sawyer version / SW cache name. SW cache is `sawyer-v33`. Code: `src/v33.js`, `src/v33.css`.

## v32: alerts on your phone or computer, cents on the tax card, safer spreadsheets
Builds on v31 (live as `6c2d3dc`).
- **Alerts on this device (opt-in browser push).** A card on the dashboard and at the top of Inbox → "How we reach you": **Turn on alerts**, the browser asks, and from then on this device gets a notification even with Sawyer closed. Pros: a new job in their trade and service area (the same match as the v28 bell), "You're hired" and "This job was filled". Homeowners: each new quote. Everyone: "New message from <name>" (never the message text). Per-kind switches in Inbox, **Send a test alert**, **Turn off**, and "Not now" on the dashboard. Clicking a notification opens the job, thread or Inbox.
  - Standard Web Push: RFC 8030 delivery, RFC 8291 `aes128gcm` payload encryption, RFC 8292 VAPID, all on `node:crypto` (`lib/webpush.js`); no library and no paid service. The browser's own push service (FCM, Mozilla, Apple, WNS) delivers it. iPhone/iPad need Sawyer added to the Home Screen first; the card says so.
  - **Keys:** the VAPID key pair is generated on first boot and stored in the server database (table `vapid`), or taken from `VAPID_PRIVATE_KEY` + `VAPID_PUBLIC_KEY` if both are set. The private key is never logged, returned or sent to a browser. On the free Render plan the database resets on each deploy, so devices need to turn alerts on again after a deploy (set the two env vars, or add a disk, to keep them).
  - **Safety:** only known push-service hosts are accepted as endpoints (no SSRF; `PUSH_TEST_ORIGIN` allows a local stand-in only outside production). A device is tied to the session that turned it on: sign-out, a password change that ends other sessions, or account delete stops its alerts. 404/410 endpoints are removed. Pushes carry a title, a one-line summary and a same-site link only (no job descriptions, no message text). "Download my data" lists alert devices (push service, when turned on, last delivered) and choices. `PUSH_DEBUG=1` logs status codes only.
- **SW-067: the Tax year card shows cents.** Gross, expenses, mileage deduction and est. net profit use `v7$`, so the card reads exactly like the P&L total and the tax CSV (for example **-$23.19**, not **$-23**).
- **csvCell defense in depth.** A trigger also counts after a leading BOM, zero-width space, spaces or newlines, and fullwidth / small-form lookalikes (`＝ ＋ － ＠ ﹦ ﹢ ﹣ ﹫`) are triggers too. Leading tab/CR are still prefixed; plain numbers (even padded, like ` -12`) stay numeric.
- Tests: `node test/v32-e2e.js` (self-contained: a local stand-in push service verifies the VAPID JWT with the public key and decrypts every payload; Chromium's DevTools push checks the service worker's notification) is part of `test/run-all.sh`. `v31-e2e` now accepts any Sawyer version / SW cache name. SW cache is `sawyer-v32`.

## v31: safe spreadsheets, a monthly P&L, one-click backup, bundles that match the source
Builds on v30 (live as `946c608`).
- **SW-066: exports can't smuggle a formula.** One escaper, `csvCell()` in `src/v7.js`, is used by the tax-year file (`v9TaxCsv`), its v30 invoice register, the QuickBooks / payments / expenses / mileage / timesheet exports, the home-history CSV and the new backup. A cell that starts with `=`, `+`, `-`, `@`, tab or CR gets a leading `'` and is quoted (`=1+2` → `"'=1+2"`), so Excel and Google Sheets show it as text. Plain numbers such as `-12.50` or `308.51` stay numbers, and quote / comma / newline quoting is unchanged.
- **SW-064: "116 mi at $0.70".** The cause was the build, not the source: `build-live.js` spliced the layers in with string replacements, and `String.replace` turns `$$` into `$`, so `$${MILE_RATE}` shipped as `${MILE_RATE}`. The build now uses function replacements. That also fixes the tax file summary ("mi x $0.70") and traveler-call descriptions ("$45/hr").
- **SW-065: button word gaps.** `.btn` now has `letter-spacing:0; word-spacing:.12em` (the v27 treatment, for every button), so "Download 2026 tax file (CSV)" no longer paints as "Download2026 tax file(CSV)". The space goes from about 2 px to 3.7 px. No new overflow or clipped buttons on 12 pages × 4 roles × 390/1440.
- **Bundles must match the source.** `test/bundle-sync.js` copies the build inputs to a temp dir, runs `build-live.js` and byte-compares `app-logic.js`, `public/index.html` and every hashed `public/js`, `public/css` and font file with the commit (same file names, same bytes). It's part of `test/run-all.sh` and needs esbuild on `NODE_PATH`, like the release build. A stale bundle fails the run.
- **Profit & loss, month by month** (Office → Reports, under Tax year). Cash basis, same math as the tax file: payments by the date paid, processor fees, expenses and mileage at $0.70/mi. The total equals the Tax year card's net. Months before the first money in or out are left off, and each month has a small net bar (red when negative). The card shows the best month, a totals row and **Download P&L (CSV)**. Fees and mileage columns fold away on phones. It says it's a planning estimate, not tax advice.
- **Back up everything** (Office → Reports → Export). One ZIP of plain spreadsheets: customers, invoices and estimates (total, paid, balance, P.O., job), every invoice line, payments, expenses, mileage, timesheets, licenses and insurance, this year's P&L, and a README with record counts. The ZIP is built in the browser (stored ZIP with CRC-32, no library) from the pro's own records. Nothing is uploaded. Photos stay in the account. It answers the "deactivated, lost all my clients' information" complaint in `docs/business-tools-flaws.md`. Code: `src/v31.js`, `src/v31.css`.
- Tests: `node test/v31-e2e.js` (self-contained) and `node test/bundle-sync.js` are part of `test/run-all.sh`. `v30-e2e` now accepts any Sawyer version / SW cache name. SW cache is `sawyer-v31`.


## v30: savings card for pros, renewals up front, per-trade crew fill, invoice register
Builds on v29 (live as `eca62d3`).
- **"Sawyer vs pay-per-lead" on the pro dashboard.** A compact sidebar card with two sliders (leads a month, cost per lead) that uses the same savings math as the `/pros` calculator: "Pay-per-lead, at these numbers $4,320/yr" vs "Sawyer, first year $180/yr". It carries the same hedge (an example of 8 leads at $45, checked November 2026, prices vary) and "How Sawyer compares" expands to the same dated rows and footnote as the `/pros` table. No exact competitor prices. Pros only; its own slider ids.
- **"Renewals coming up" on the dashboard.** Licenses, insurance, bonds, permits and traveler wallet cards that expire within 60 days (or already have) are listed by name with days left, expired first, up to 4 plus "+N more". Pro docs open Office → Licenses & COIs; wallet cards open the wallet. The bell reminders (60/30/7 days and on the day) are unchanged, and What's next no longer repeats "N docs need attention" when the card shows.
- **Per-trade fill on PM project cards.** Each project card on a project manager's dashboard lists "Concrete finishers · 1 of 3 filled", open trades first, up to 4 plus "+N more trades".
- **Invoice register in the tax-year file.** The Office → Reports tax-year CSV adds an INVOICES ISSUED section (issued, invoice, customer, due, total, paid, still owed, status) with a totals row. Drafts and voided invoices are left out. Code: `src/v30.js`, `src/v30.css`.
- Tests: `node test/v30-e2e.js` (self-contained) is part of `test/run-all.sh`. `v29-e2e` now accepts any Sawyer version / SW cache name. SW cache is `sawyer-v30`.


## v29: cents everywhere, honest calculator, quieter new-work bell
Builds on v28 (live as `aadc311`).
- **SW-063: quote amounts keep their cents everywhere.** The job-page "You quoted" callout, the homeowner's "… sent a quote: $308.51" bell, the quote list, Compare bids (price and "Hire for"), the pipeline card, the CRM card, the pro's Earned / Booked / Invoices and the quote check all use the cents-aware `v28$`. Whole dollars still read "$275" (no ".00"). The quote check keeps typed cents.
- **Compare-table footnote spacing.** The dated note under "How Sawyer compares" on `/pros` and `/pricing` has 12px of space above it, 13px muted text.
- **Dated, hedged savings calculator.** The `/pros` and `/pricing` calculator says its 8 leads × $45 starting point is an example checked November 2026, that lead prices vary by trade, area and site, and to set the sliders to what you pay; the result reads "Pay-per-lead, at these numbers". No exact competitor prices.
- **Quieter new-work bell for pros.** A posted job whose 3 lead slots are taken (and the pro isn't one of them) no longer counts as "new" on the dashboard. When a job fills up or the customer hires, unread "New job in your area" notices of pros who aren't on it are marked read and say "now full (3 of 3 pros)" or "filled, the customer hired a pro". Pros on the job keep theirs. Code: `src/v29.js`, `src/v29.css`.
- Tests: `node test/v29-e2e.js` (self-contained) is part of `test/run-all.sh`. `v28-e2e` now accepts any Sawyer version / SW cache name. SW cache is `sawyer-v29`.


## v28: new-work notices, quotes with cents, a dated comparison
Builds on v27 (live as `cae7316`).
- **"New job in your area" (in-app, no email yet).** When a customer posts a job that matches a pro's trade or a service they list, inside their service radius, that pro gets a bell notice "New job in your area: <title>" that opens the job. The dashboard's "New jobs in your area" card says how many matching jobs were posted since the pro's last dashboard visit ("2 new since your last visit") and tags those cards **New**; jobs the pro already quoted or marked interest in don't count. The last-visit time (`jobsSeen28`, set by the pro-only `seenJobs28` action) is in `PRO_PRIVATE`, so it never reaches other users, signed-out `/api/state` or prerendered HTML; notices go only to that pro. Code: `src/v28.js`, `src/v28.css`.
- **SW-061: quotes from an Office estimate keep the cents.** Picking an estimate sets the price to the exact estimate total (for example 308.51, not 309), the picker label shows cents, and the note lists line items, subtotal, tax and total that add up to that price (optional add-ons are marked "not in the price"). Cards read "You quoted $308.51".
- **SW-062: one tap, one quote, one toast.** The two-tap quote sheet and the job-page quote modal disable Send on the first submit and ignore a second tap or Enter while it's sending; Send comes back only if the price was refused.
- **"Set a starting price" means a price.** The Finish-your-profile step is done only when at least one service has a from-price above $0; blank or $0 rows keep it open with a note.
- **/jobs SEO parity (66 → 69 target).** The signed-out job board header (prerendered too) has a small labeled stock photo (Pexels carpenter, credited on `/credits`; lazy, width/height set, fixed box, no layout shift). Signed-in pros don't see it.
- **Dated, hedged "How Sawyer compares" table** (/pros, /pricing, dashboard): "checked November 2026" in the caption and a visible note; exact third-party prices replaced with "pay per lead, varies" style wording. Sawyer's own terms stay exact.
- Tests: `node test/v28-e2e.js` (self-contained, incl. privacy of the new-work data) is part of `test/run-all.sh`. `e2e` now expects the `package.json` version and `v27-e2e` accepts any Sawyer version / SW cache name.


## v27: a pipeline for pros, no second signup, Thumbtack vs Jobber
Builds on v26 (live as `4d59c1a`).
- **No second signup for pros.** A signed-in pro who opens `/join` (bookmark, header link, old email) goes to `/dash?setup=1` instead of the blank 6-step wizard: a 302 on a full page load, a replace-navigation in the app. Customers and signed-out visitors still get the wizard.
- **"Finish your profile" guided flow** on the pro dashboard: **add 3 job photos**, **set a starting price**, **submit the Verified packet**, one current step at a time with a 0–3 progress meter. Photos and prices open the existing editors; the packet links to `/verify` (a packet in review counts as done). It disappears once all three are done, except when arriving from `/join`, where it says so. Code: `src/v27.js`, `src/v27.css`.
- **Job board as a pipeline.** For a signed-in pro, dashboard "New jobs in your area" and `/jobs` cards add a strip: why the job fits (your trade, a service you list, inside your radius), roughly how far it is, and spots left of the 3-pro cap ("2 of 3 spots left", "You're in · 3 of 3 pros", "Full: 3 of 3 pros"). **Quote in two taps:** "Quote" opens a short sheet with a suggested price (your own starting price for that service, else the middle of the typical local range), start days and a default note; "Send quote" sends it. A full request has no quote button.
- **Start from an Office estimate.** The quote sheet and the job-page quote modal list the pro's own estimates; picking one fills the price (total with switched-on options and tax) and itemized line items, optional add-ons listed separately. Still editable.
- **"Not hired" notices.** When hiring, the owner can share an optional one-line reason (presets or "Something else…", 140 characters max). Pros who quoted or marked interest and weren't picked get an in-app notice (bell, a "Not hired this time" card on the dashboard, and "You weren't hired this time" on the job page) with the reason if one was shared. The reason is stored on that pro's own quote and redacted for everyone else (other pros, signed out). No email or SMS.
- **`/pros`: Thumbtack or Jobber?** A Sawyer / Thumbtack / Jobber table: what it is, how customers find you, lead cost, pros per request, office tools, monthly price. Claims are general and dated (public pages, checked Nov 2026): Thumbtack is pay per lead inside a weekly budget with several pros often contacted; Jobber is field-service software with no built-in lead marketplace and plans above $20 (Core from $29/mo billed annually). No Instant Book claim: Thumbtack retired it in Nov 2024. Stacked, labeled rows on phones.
- **`/prices` SEO (66 → 69).** The quote check now has a small labeled example photo of the work picked (real stock photo, follows the job picker), so Lighthouse's image-alt audit applies as on the other pages. Beta `noindex` stays.
- **Faster /pros and /jobs.** Signed-out visits arrive prerendered (same view render from the public snapshot, like `/prices` and `/find`), so the heading paints before the app JS: mobile Lighthouse 87–89 → 100. Signed-in visits and filtered `/jobs?…` URLs get the normal app page.
- Tests: `node test/v27-e2e.js` (self-contained) is part of `test/run-all.sh`. `v26-e2e` now accepts any Sawyer version / SW cache name. Existing hire flows keep `#cfHire` / `#cfCHire`.


## v26: check any quote, founding wording, private traveler calls
Builds on v25 (live as `9308011`).
- **Quote check on `/prices`.** "Got a quote? See if it's fair." Anyone with a quote in hand, from a pro on Sawyer or anywhere else, picks the job (every sub-trade with its own guide, such as water heaters or ice dam removal, plus "Other … job" per trade), when they need it and the quoted price. Sawyer shows the typical range near them and where the quote lands: **In typical range**, **Above typical**, **Well above typical** or **Well below typical** (the same sub-trade bases as public job pages, the same urgency and regional index, and the same conservative bands as the fair-price check on bids). Each result lists three questions to ask before hiring and a free "Get up to 3 quotes" link. It runs on the page only: the price is never saved, sent to the server or put in the URL. Code: `src/v26.js`, `src/v26.css`.
- **From a public job page.** The homeowner card's second button is now **Check a quote you got**. It opens the quote check with that job's sub-trade (or trade), ZIP and urgency already picked, so the range matches the card (for example water heaters, within 48 hours, Austin). Trades without a guide keep "See the price guide".
- **SW-059.** The `/signup` subtitle reads "Customers and PMs are free. Founding pros get 3 months free, then $20/mo." (it promised 3 free months to every pro). Every other 3-month line (pricing, FAQ, /pros, job pitch, plan cards) already sits with founding-pro wording; `v26-e2e` checks that on every public page.
- **SW-060.** Signed-out `/api/state` traveler calls have `apps: []`: no applicant or hire is named. They carry counts only (`napps`, and new `nhired`), and the spots meter on `/travel` cards and `/t/<id>` uses the hired count, so it still reads "11 of 12 spots open" signed out (prerender and app). Signed-in non-owners still get the hired rows and their own application; owners see everything.
- Tests: `node test/v26-e2e.js` (self-contained) is part of `test/run-all.sh`. `v25-e2e` now accepts any Sawyer version / SW cache name.


## v25: budget next to the guide, traveler calls paint first, reply times on Find
Builds on v24 (live as `7985ff7`).
- **SW-058.** The public job page's pro pitch reads "No lead fees. One flat $20/mo. Founding pros get their first 3 months free.", the same promise as the FAQ, signup, pricing and /pros (it used to offer 3 free months to every pro).
- **Posted budget next to the price guide (`/job/<id>`, signed out).** The homeowner card shows the customer's posted budget beside the typical range, plus one plain line on where the budget sits (within, under or above the usual range). The guide now uses the sub-trade's own range when Sawyer has one (`V25SUB` in `src/v25.js`: water heaters, ice dam removal, EV chargers, fences and about 70 more), with the same urgency and regional cost index as before; other sub-trades keep the trade-wide guide. Per-unit budgets ("$150 per turn") and "TBD" aren't compared. Public job facts only.
- **Traveler calls paint first (`/t/<id>`, signed out).** The real call page and the site header are in the first HTML, rendered by the same `VIEWS.tcall` from the signed-out public snapshot: rate, per diem, hours, location, license, dates and open spots. Applications, notes, invites, emails and phones are never in it. The page hydrates in place (one H1, same title, no layout shift; the chip-row font weights are preloaded). Signed-in visitors get the normal app page. `/compare/<id>` is still never prerendered.
- **Reply times on Find cards.** A pro card on `/find` shows "Replies in 22 min · median" once Sawyer has measured 2+ first replies for that pro (the same rule and number as the profile stat). It reads the server-measured stats in the public snapshot, so the prerendered cards and the app agree.
- Tests: `node test/v25-e2e.js` (self-contained) is part of `test/run-all.sh`. `v24-e2e` now accepts any Sawyer version / SW cache name and the sub-trade guide wording.


## v24: job pages that work for both sides, honest reply times
Builds on v23 (live as `05906fc`).
- **Public job pages (`/job/<id>`, signed out).** Below the job, a two-card panel: **For pros** (no lead fee to quote, one flat $20/mo with 3 free months, at most 3 pros per request with the spots left, contact details private) and **For homeowners** (a real example photo of that trade, labeled as an example, the typical local price range for this kind of job, "Post a similar job" for the same trade, and the price guide). An open request says "Sign in to send a quote"; a full or finished one no longer offers a quote button and points to open jobs in that trade. The panel uses public job facts only, so the server prerender stays public-data only. Owners and signed-in pros see their normal tools instead.
- **Measured reply times.** Once Sawyer has measured at least 2 first replies for a pro, the profile's reply stat reads "22 min · median reply" and the "Usually replies …" lines use that median. Pros without measured replies keep the time they gave.
- **SW-057.** The signup divider "or get a one-time code by email" no longer reads "orget … byemail": small muted labels drop the body's negative tracking and get a little word space, and the divider text never squeezes.
- **Traveler-call titles** read `<call> · <town, ST> · Sawyer` (for example "Hyperscale data center: journeyman wiremen · Ashburn, VA · Sawyer"), the same in first HTML, after mount and in-app navigation. The "(demo)" marker stays on the page.
- **Lighthouse SEO on `/job/<id>`** (66 vs 69 elsewhere): the only difference was that the page had no images, so the image-alt audit didn't apply and the beta `noindex` weighed more. The panel's labeled photo makes it 69 like the other pages. `noindex` stays until `SAWYER_INDEXABLE=1`.
- Tests: `node test/v24-e2e.js` (self-contained) is part of `test/run-all.sh`. `v22-e2e` clicks the Find result card through a locator after hydration (no more detached-element flake).


## v23: one title everywhere, faster job pages
Builds on v22 (live as `c2970a4`).
- **Titles (SW-056).** One helper, `sawyerTitle()` in `src/v23.js`, builds every title. The server uses it for the first-HTML `<title>` and the app runs the same function after every render, so the tab text never changes when the app mounts. Named pages read `<Page> · Sawyer` (`/signup` is "Sign up · Sawyer" in both, no tagline added after mount); home keeps "Sawyer — Hire pros you'd trust with your house."; profiles, jobs, compare and traveler calls use their record title.
- **Job pages paint first.** Signed-out `/job/<id>` includes the site header and the real job page in the first HTML, rendered from the signed-out public snapshot only (no escrow, cases, private photos, quote prices or notes). Signed-in visitors and `/compare/<id>` (owner-only) are never prerendered.
- **Headshots.** 240 px `-sm` copies of the pro headshots (resized from the same real photos), so `/find` cards get a `srcset`.
- Tests: `node test/v23-e2e.js` (self-contained) is part of `test/run-all.sh`.


## v22: faster first paint on profiles and Find
Builds on v21 (live as `900f81c`).
- **Profile cover photos (SW-055).** Signed-out `/p/<id>` and `/pro/<id>` covers arrive with `srcset`/`sizes` (the same `IMGSET()` the app uses). The cover preload uses `imagesrcset`/`imagesizes` with the `-sm` file as `href`, like the home hero, and the first cover photo loads eagerly. When the app mounts it keeps the painted photos and their `srcset`/`sizes`.
- **Pretty-path first HTML.** `/pro/<id>` is served exactly like `/p/<id>` (title, description, cover prerender, slim state; canonical stays `/p/<id>`). `/job/<id>` and `/compare/<id>` get the job's own title ("Compare bids: …" for compare). The app sets the same titles after it mounts, so the tab text no longer flips back to a generic one.
- **Find first paint.** Signed-out `/find` (and `/find?cat=…` etc. with the usual filter keys) includes the site header and the real results in the first HTML. The loading skeleton starts hidden, the first result photo loads eagerly, the painted photos are kept when the app mounts, and the page's extra font weights are preloaded so the first paint is already in its final layout. Mobile Lighthouse on `/find` went from the high 80s to the high 90s locally.
- Tests: `node test/v22-e2e.js` (self-contained) is part of `test/run-all.sh`.


## v20: real sign-in emails through Resend
Builds on v19 (live as `bf75b1f`).
- **Email delivery.** When `RESEND_API_KEY` is set, sign-in codes, forgot-password codes and magic links are sent as a branded plain+HTML email (Linen & Navy, Sawyer wordmark, no hosted images). The code and link expire in 10 minutes. The API never returns the code or link on a public host (`NODE_ENV=production` or `RENDER`). Locally, test mode still shows the code when no key is set.
- **From address.** `MAIL_FROM` defaults to `Sawyer <onboarding@resend.dev>`. Until a domain is verified on Resend, Resend only delivers to the account owner's email. A 403 from Resend becomes HTTP 503 with "Email delivery isn't fully enabled yet." and is logged server-side (the key and the code are never logged). Other provider failures are a friendly 502.
- **Text messages.** SMS is still unavailable on the public host. The response is 503 and tells the person to use email instead.
- **Verified reminders.** The 60 / 30 / 7 / 0-day license and insurance notices (and the "badge came off" notice) are also emailed when a provider is configured and the account has a real email. Demo addresses (`@sawyer.test`, `@demo.invalid`, `@phone.invalid`) are skipped. A failed reminder email is logged and does not break the in-app notice.
- **Price guide first paint.** Signed-out `/prices` includes the site header and the "What jobs really cost" heading in the first HTML, so the largest paint no longer waits for the app JS. That keeps the mobile Lighthouse median at 90+ (LCP about 1s, no 0.085 header shift).
- **COI uploads** are marked `kind=coi` at POST time (`x-sawyer-upload: coi` or `?kind=coi` on `/api/upload`), so the file is served at `/api/coi/…` immediately and `/u/…` is 404. `submitVerify19` still rewrites any leftover `/u/` path.
- **Pretty in-app hrefs (SW-016)** stay deferred. Typed `/prices`, `/find`, `/job/j1` and `/p/:id` already open the right view. Changing `href()` from `#/` routes would break current suites and the hash router, so it is not low-risk.
- **Env (also listed in `render.yaml`):** `RESEND_API_KEY` (secret, `sync: false`), `MAIL_FROM`. `RESEND_API_URL` is a local test hook that is ignored when `NODE_ENV=production`.
- Tests: `node test/v20-e2e.js` starts a mock Resend server and is part of `test/run-all.sh`.

## v19: a real Verified badge, honest job photos, and a clearer path to hire
Builds on v18 (live as `b184c44`).
- **Public snapshot:** signed-out `/api/state` no longer lists deleted "Former Sawyer member" rows, so throwaway account deletes don't accumulate in the public payload. People who share a job, review, message thread or consult (and staff) still see the anonymized card.
- **Signup errors:** validation still returns HTTP 400 with the real form message (bad email, short password, and so on). Unexpected throws are logged server-side and return HTTP 500 with a stable "something went wrong on our side" message, instead of a generic 400 "Sign-up failed, check the form" that hid bugs.
- **Verified is a real Trust-team review.** Pros submit a license number, issuing state, expiry date, insurer, and a photo of a current certificate of insurance (`submitVerify19`). A person on Sawyer's Trust team reviews the packet on `/mod?t=verify` and approves or rejects it with a reason the pro can see (`modVerify19`). The badge then shows what was checked and the date of the review. It comes off automatically the day the license or certificate expires, with reminders 60, 30 and 7 days ahead. `verified` is still never taken from the client; `POST /api/staff/verify` (admin token) still works for staff tooling. The FAQ no longer says this is "simulated in this demo," and the profile trust panel no longer claims a photo-ID match we don't do.
- **Example job photos on every Find card and profile.** When a pro has no photos of their own jobs, Sawyer shows real Pexels trade-work photos labeled **Example of {trade} work** — never as that pro's portfolio. "Job photos coming soon" is gone. A pro's own uploads and customer-confirmed job photos still take priority. New photos are credited in `docs/photo-credits.md` and on `/credits`.
- **Price guide → compare → hire** is the default path on a posted job. Owners see a next-step strip: typical local range and a link to the price guide, then invite matches, then **Compare N quotes side by side**, then hire from the comparison page. The demo homeowner's "Water heater leaking" job (j1) already has three bids to try this.
- **Pretty URLs (SW-016) deferred.** Typed or shared `/prices`, `/find`, `/job/j1` and `/p/:id` still open the right view (existing hash rewrite). In-app links stay `#/` for now so current suites and CSP stay intact. Indexing stays off until `SAWYER_INDEXABLE=1` on the custom domain.
- **SW-049:** license numbers, insurer and policy numbers, and COI file URLs are visible only to the pro and to staff. Signed-out `/api/state`, `/p/:id` inline state, and other users never get them. The public trust panel shows only what was checked and when (for example "License verified Nov 2026, expires …" and "Insurance on file"). COI files are served at `/api/coi/…` to the owner or staff; an unauthenticated request is 401, and `GET /u/…` of a COI is 404.
- **SW-050:** the Verified badge stays on through the printed expiry date and comes off at the end of that day (the next calendar day). Reminders fire at 60, 30 and 7 days and on the expiry date ("expires today"). A `TEST_NOW` env var can shift the clock in non-production runs only.
- **SW-051:** hiring (including from compare) notifies the other bidders that the job was filled, without naming the winner or the price.
- **SW-052:** compare bid columns are plain articles, not `role="row"` outside a grid.
- Email is now delivered through Resend when `RESEND_API_KEY` is set (v20). SMS is still not configured; the public host tells people to use email.
- Tests: `node test/v19-e2e.js http://localhost:8899 shots/v19` (needs `playwright` on `NODE_PATH`). It's part of `test/run-all.sh`.

## v18: QA leftovers, field limits, Your data, a real Change password dialog
Builds on v17 (SW-042, SW-043, SW-044; live as `23488d5`).
- **SW-045:** no JSON-LD on any page while the host isn't indexable. The home page's Organization schema now appears only with `SAWYER_INDEXABLE=1`, the same as the profile and traveler-call schemas. Robots meta, `X-Robots-Tag` and `robots.txt` are unchanged.
- **Sweep 1 leftovers rechecked on v17 code** (SW-011..016, SW-020..023, SW-025, SW-026 were fixed in v13 without their own commits). Three still had gaps and are now fixed:
  - **SW-010:** contrast misses on Projects (filled crew slots faded to 60%), the pro Schedule (done visits faded) and muted "Done" badges. All pass axe AA now.
  - **SW-011:** heading levels skipped on For pros, Projects, Job board, Saved pros, Per diem and every empty state. Lists get a visually hidden H2. Empty-state titles are H2 but look the same as before.
  - **SW-047:** deleting a customer account used to break every later customer sign-up. The leftover "Former Sawyer member" row had no `email`, and `signupCustomer` called `u.email.toLowerCase()` on it. Every email lookup is now null-guarded and skips deleted rows, deleted accounts keep an empty email, and a sanitizer on load repairs rows already stored without one. After a customer is deleted, a new customer, pro or PM can sign up.
  - **SW-048:** the Per diem calculator and Pro schedule put an H2 before the page H1. The calculator now sits after the guide's H1, and consult requests sit after the Office H1. The heading audit requires a single H1 first, with no skipped levels, on every page for every role.
  - **SW-024:** the last placeholder-style seed names are gone (Pat Homeowner → Pat Hollis, Dana Buildwell → Dana Castellano, Joe Framer → Joe Franco, and so on). Short names stay "Pat H.".
- **Field limits enforced by the server (SW-036 follow-through):** `lib/limits.js` checks every `/api/act` call and sign-up. Over-long input gets HTTP 400 with "Keep the … under N characters." Nothing is cut silently.
  - Names and business names: 80. Titles: 120 (job titles 90). Bio: 1,500. Descriptions, messages and reviews: 2,000. Notes, replies and quote notes: 1,000.
  - Any other free-text argument is capped at 2,000.
  - The browser gives fields without a `maxlength` the same limit the first time they're focused, including the chat composer. A "N characters left" counter appears at 80%.
  - Long unbroken words and URLs wrap in cards, bubbles, tables and headings. The job chip in a conversation fits a 390 px phone.
- **Account → Your data:** **Download my data** saves `sawyer-data-<date>.json` (`GET /api/account/export`). It contains your account (email, phone, sign-in methods), your profile, your upload links and every record that involves you.
  - It's built from the same privacy-filtered snapshot the app uses, so other people appear only as the app shows them to you.
  - It never includes password hashes, salts, session tokens, passkey keys or codes.
  - Signed-out requests get 401. Rate limit: 10 an hour.
- **A real Change password dialog:** fields for current password, new password and confirm.
  - Show/Hide buttons (`aria-pressed`) and a live hint (characters to go, passwords don't match, new password is the same as the old one).
  - Server errors show inline. Save stays disabled until the form is valid, and Enter submits.
  - **Forgot your current password?** emails (or texts) a one-time code to the account. After the code you can set a new password without the old one (the SW-033 rule). On a public host with no email provider, the code request says codes aren't available, as on sign-in.
- **Shared demo accounts can't change their password.** Changing it would lock out every tester and sign out their sessions. This is the same rule as Delete account. The dialog explains why.
- Tests: `node test/v18-e2e.js http://localhost:8899 shots/v18` (needs `playwright` and `axe-core` on `NODE_PATH`). It's part of `test/run-all.sh`. `test/seo.js` now expects no JSON-LD while the host isn't indexable. `hotfix-e2e` and `v13-e2e` follow the new dialog.

## v16: uploads hardening, slim profile pages, records and honest dashboards
Builds on v15 (SW-041: a missing recipient gets the normal "doesn't exist" error even when the first-contact cap is hit).
- **Uploads hardening (QA sweep 2, B5):** `lib/imgsafe.js` walks the real structure of every JPEG, PNG and WebP, not just the magic bytes.
  - It refuses files with HTML or script anywhere inside: in a comment segment, a PNG text chunk, EXIF/XMP, or tacked on after the image. The user is told what to do ("That image has web code hidden inside it… save the photo again… upload that copy"). Truncated files and HTML with an image header are refused too. All of these return HTTP 415.
  - Harmless bytes after the end marker, such as a phone's motion clip, are cut off, so only the image is stored.
  - **Location data is removed.** The GPS block of a JPEG's EXIF is blanked, and XMP, PNG `eXIf` and WebP EXIF/XMP are dropped. A homeowner's job photo never carries the house's coordinates. Orientation and camera tags stay.
- **SW-018 finished:** a signed-out `/p/:id` page inlines only that profile's data (about 9 KB instead of about 94 KB for the whole public state). That covers the pro, their reviews (still tokenized), quotes, consults, and the jobs and crew projects they're in. Signed-out project cards no longer include PM ids, so those accounts are not inlined.
  - The server uses the slim copy only if `VIEWS.pro` renders **byte for byte the same** from it as from the full public state. This is checked once per pro per data version; otherwise the full state is inlined as before. `SLIM_P=0` turns the slim copy off.
  - The browser loads the full public state in the background after the page loads. It also loads it synchronously before rendering any other page, so Find, other profiles and Home never render from the slim copy. Client-side demo seeding skips a partial state.
  - The server-rendered cover now uses the same stock-photo order as the browser's first render, so the preloaded LCP image is the one that paints.
- **Records (Office and business accounts):**
  - Expiry notices for licenses, policies, permits and wallet documents now go out from the server for **every** account with a dated record. Before, they only went to pros who had payment reminders on. The schedule is the same everywhere: 60, 30 and 7 days before, and on the day. The Office copy now says so; it used to say "45 days" in two places.
  - A renewed record starts its notices over.
  - Notice copy fits the record type: only a license or liability policy mentions the verified badge, and permits say "close it out or ask for an extension".
  - **Vendor COIs with real expiry dates:** when a pro sends a certificate of insurance, the customer or business gets the policy name, carrier, number and expiry from the pro's general-liability record. They get notices 30 and 7 days out and on the day, and can tap **Ask for an updated COI**. A pro with no policy on file is asked to add it.
  - The demo business (Lakeway Dental) holds Bluebonnet's COI, which runs out with Bluebonnet's policy (23 days in the seed).
  - The business panel's **Invoices** list shows real invoices to pay, with overdue dates and pay links. Before, it said "Invoices appear here when jobs complete" while an invoice was overdue.
- **Honest dashboards and first-run guidance:**
  - **Profile views are real.** The pro tile used to show a made-up number (40 to 200 by account id) with a fixed "+12% vs last month". `POST /api/pview` now counts one view per visitor per pro per day, sent when the profile renders in a browser. It is rate limited, and crawlers, Lighthouse and the pro's own visits don't count. Counts are stored in a `pviews` table, so a view never bumps the data version, and only the pro sees them. The tile shows the 30-day total, the change against the 30 days before, and a real sparkline.
  - The random decorative sparklines on the other dashboard tiles are gone, including the ones drawn on zeros.
  - The demo pro has a seeded sample view log.
  - A brand-new homeowner's home log card says "Set up your maintenance plan" instead of "9 maintenance tasks due".
  - A PM with no projects sees **How a crew comes together** (post, fill each slot, run it from one board) next to the empty projects card.
- Tests: `node test/v16-e2e.js http://localhost:8899 shots/v16` (fixtures in `test/fixtures/`). It is part of `test/run-all.sh`.

## v14: QA retest-1 fixes + fair prices, traveler dashboard
- **QA retest 1:**
  - **SW-039:** a review's author id is shared only with the parties to it: the author, the reviewed pro and staff. Signed-out visitors and everyone else get a per-review token (`rv-<id>`) and a short name such as "Pat H.". The token can't be linked across reviews or to `users[]`.
  - **SW-040:** HTML error and auth pages fit a 390 px phone with no sideways scroll. They now show the house mark in Plus Jakarta Sans on linen.
  - Sweep 1 and sweep 2 bugs were rechecked against v13 and are fixed: Find has no empty well, H1s, titles, contrast and axe are clean, HSTS is on over HTTPS, and pretty URLs work. One is only partly fixed. **SW-018:** `/p/:id` still inlines the public state, about 400 KB raw or 80 KB gzipped, and that state is cached for 3 s.
- **Fair-price check:** owners see "Typical for this job near (town): $X – $Y" above their quotes and on Compare bids. Each bid is marked **In typical range**, **Above typical**, **Well above typical** or **Well below typical**. The bands are wide on purpose, so honest pros aren't flagged for scope the estimate can't see. Pros see the range before they quote. The checks disappear once a job is hired.
- **Realistic ranges for common jobs:** water heaters, panel upgrades, EV chargers, mini-splits, full system and roof replacements, kitchen and bath remodels, dock in/out and fences now use job-specific costs. These feed the request wizard, the price guide examples and the quote check, so all three show the same numbers. Before, a water heater showed as $260–$950.
- **Traveler-first dashboard:** traveling-trade accounts open on "Your travel work". It shows matching open calls, applications, invites and references, the 3 best matches with rate and per diem, availability, and links to the traveler profile, lodging and per diem. Home tools follow below.
- **First-contact cap:** a sender can start at most 20 new conversations in 24 hours (`NEW_THREAD_MAX`). The next one gets HTTP 429. Replies in existing threads are never limited.
- Tests: `NODE_PATH=… bash test/run-all.sh [port]` runs every e2e suite, each against its own fresh server, and marks a suite failed on any `FAIL` line. The v14 checks alone: `node test/v14-e2e.js http://localhost:8899 shots/v14`.

## v13: speed + design pass
- Faster pages: the home log, project board, moderation and marketing code (`src/v12-lazy.js`, built to `/js/lz12.<hash>.js`) loads only when one of those pages opens, with a skeleton while it loads. Signed-in users prefetch it when the browser is idle.
- Signed-out pro profiles (`/p/:id`) come back from the server with the cover already rendered and the cover photo preloaded, so it paints before the app scripts run.
- Profile map town names no longer overlap. Each label tries 8 spots; if none fits, the town shows just its dot.
- Pros without their own photos show "Job photos coming soon" with a Request a quote link, instead of stock "Recent work" photos with captions that don't match. Search cards use the pro's own first photo, or a plain trade photo with no caption.
- Design pass, comparing against Airbnb, Thumbtack, Stripe and Linear:
  - **Home:** new hero ("Pros you'd trust with your house keys.") with floating trust cards showing a real top-rated pro and how milestone escrow works. A strip of what you get replaces the small counts. The page now has a single "How it works" section, and Sawyer vs Angi can be compared for homeowners and for pros. Sections use the same spacing throughout, and cards react to hover and taps.
  - **Dashboards:** dashboards open with their header. The clip-art is gone, and "what's next" is a tidy 2-column list. Nothing is duplicated (no second invoices card or project board card), and towns show instead of bare ZIP codes.
  - **Profile:** highlights sit in a 2-column grid. The sidebar sticks as one block, so it no longer overlaps the guarantee card. The guarantee copy now matches milestone escrow.
  - **Search:** the helper lines are smaller and quieter.
  - **Mobile:** the request flow and Office are denser.
  - **Traveler board:** job calls come first, and the map stays folded until opened.
- Pro cards and the home "top pros" row no longer reuse stock house photos. A pro without their own photos gets a trade tile with initials and "Job photos coming soon".
- **QA sweep 1 (Medium/Low, SW-010 to SW-025):**
  - Text contrast passes WCAG AA on linen.
  - Every page has one H1, and unknown links open a real "Page not found" page.
  - ARIA fixes: toggles, tabs, map and grid buttons, and scrolling tables.
  - Only pros can edit pro profiles.
  - Seed names read as real people, with a "Hill Country Mutual (demo)" insurer.
  - The footer says plainly that all data is fictional sample data.
  - The font files are named Plus Jakarta Sans.
  - Uploads return real HTTP error codes, and public profile data is cached for 3 seconds.
  - The unused dark icon was removed.
- **QA sweep 2 (SW-033 to SW-038):**
  - "Forgot password?" on the password sign-in emails a one-time code, then opens Set a password.
  - **Account → Delete account** asks you to type DELETE. It then:
    - signs you out everywhere;
    - removes the login, passkeys, linked sign-ins and uploads;
    - anonymizes the profile, with reviews kept as "Former Sawyer member".
  - Deletion is blocked while a job is active and on shared demo accounts.
  - A portfolio save where every photo is rejected is refused instead of silently clearing the gallery. Only an empty list clears it.
  - Quotes are accepted only on open jobs, in dollars, up to $10M.
  - Job titles are capped at 90 characters and descriptions at 2,000.
  - The message photo check matches the 5 MB server limit and shows the server's error.
- **Security hotfix merged (main 6eb9c79):**
  - Pro profile edits go through an allowlist, and staff and verified are set server-side only. Verified changes only through `POST /api/staff/verify`, which needs `x-admin-token`.
  - CSP with no inline handlers (`data-csp` instead), real HTTP codes, a redacted public snapshot, pretty URLs, the failure-based login limiter, a light theme only, and fixes to the job lifecycle and messaging rules.
  - Stock photos are never a pro's portfolio. The demo pro (Bluebonnet) no longer has a seeded stock gallery, `setGal12` only takes the pro's own uploads, and profiles without uploads show "Job photos coming soon".
  - Forgot password works with the hotfix rule that a password change needs the current password: a session started by a one-time code in the last 15 minutes may set a new password once without the old one.
- Tests: `node test/v13-e2e.js http://localhost:8899 shots/v13/final` and `ADMIN_TOKEN=… node test/hotfix-e2e.js http://localhost:8899` (the server needs the same `ADMIN_TOKEN`). Before/after screenshots are in `shots/v13/before-after/`.

## v12 features
- **Pro profile**: **Services & starting prices** (pros set "From $X" per service, others show Sawyer's typical price), a real-photo **portfolio** with a full-screen lightbox (arrow keys, captions, before/after tags) that also becomes the cover, a **Track record** block (median reply, customer-confirmed jobs, quotes in 90 days, hire rate, repeat customers, member since), **Towns covered** with a "Do they come to you?" ZIP check, and **Book a free consult** (on-site, video or phone; 14-day day/time picker, taken slots blocked, 2 live bookings per customer per pro, .ics download). Visitors can pick a time before signing in; the pick survives sign-in/sign-up.
- **Completeness + import (demo)**: the setup checklist gains prices, 3+ photos and consults; once complete it becomes a 100% ring. **Import from Google or Facebook** fills description, phone, hours, services, years and website after you check each field (test mode: sample data). Reviews never import.
- **Home log** (`/homelog`, homeowners and businesses): maintenance schedule with Done/Snooze/Book a pro, **warranties** (read from pro invoices and estimates plus your own, with receipt photo), past jobs, pros you've hired and receipts, with CSV export.
- **Project board** (`/board`, PMs): every project's crew slots on one Gantt-lite timeline, crew counts, open slots and double-booking warnings. Click a bar to set that crew's dates.
- **Reviews & marketing** (Office → Reviews & marketing): ask finished customers for a review (editable template; test mode sends an in-app notice), one reminder after 3 days, share link + **QR code** (SVG/PNG, printable leave-behind cards), and an **embeddable review widget** (`/embed/<pro id>`, frameable anywhere, no scripts).
- **Trust**: anyone signed in can **Report** a review (not their own); the trust team decides in `/mod`. Removed reviews are archived and everyone involved is told why.
- **Fixed**: duplicate stats and mismatched stock "before/after" photos on profiles with a portfolio, two stacked sticky bars on mobile profiles, leftover "Demo prototype" footer copy, several contrast and ARIA issues.
- Tests: `node test/v12-e2e.js http://localhost:8899 shots/v12/final`.

## v11 features
- **Guided request** (`/post`): 4 steps (trade → details + photos → timing, location and budget with the typical price range → review). Type the problem to get a trade suggestion. Signed-out visitors can fill it in; the draft survives sign-up and a banner offers "Finish and send".
- **Instant matched shortlist** on the new job: top 3 pros by verified reviews, distance, reply speed and whether they do that exact job, each with "why matched", typical range, reply time and **Invite to quote** (max 5 invites).
- **Compare pros side by side** (`/cmp`): from the shortlist, or tap **Compare** on up to 3 search cards (tray at the bottom). Rating, typical range, distance, reply time, license/insurance expiry, background check, reliability, jobs finished, years; the clear leader in a row is marked "Best".
- **Price guide** (`/prices`): typical ranges for 24 trades with common example jobs, re-priced for any area; also on the home page and search.
- **Team & clock** (Office): add crew with role, pay rate and access level (Admin / Office / Field crew, with a "who can see what" table), clock people in on a job and out again. Clock-outs land on Timesheets for approval.
- **Job costing**: invoices (pro side) and hired jobs show invoiced vs. labor (hours × each person's rate), materials, mileage, profit and margin, plus who's on the clock now.
- **Document vault** (Office → Documents): W-9, contracts, permits, lien waivers and warranties alongside licenses and COIs, with photo/scan upload, a job tag, filters, missing-document nudges and 60/30/7-day expiry reminders.
- **Traveler references**: travelers ask a contractor or PM for a reference; the contractor answers from their own sign-in (stars, would-hire-again, strengths, text). References show on the traveler profile; travelers can hide but not edit them.
- **Notification center** (`/inbox`): categories (Jobs & quotes, Money, Messages, Crew & travel, Records), unread filter, day groups, per-category email/text settings with quiet hours, and an **email + text preview** of every notice (test mode: nothing is sent).
- **Fixed:** uploaded photos over 64 KB were cut off by the compression layer (they showed as broken images). Streamed responses now send headers once.

## v2 features
- **Crew builder**: project slots with dates; suggestions match trade + distance and hide pros who are booked in that window (their blocked dates or other crews); invite (slots fill as pros accept; demo pros auto-reply) or book the whole crew; per-slot fill status.
- **Photo-verified job history**: the hired pro uploads before/after photos (JPEG/PNG/WebP only, 5 MB max, magic bytes checked, stored in `DATA_DIR/uploads`, served with `nosniff`). Photos stay *Pending* and private to the job until the customer confirms the job is done, then show as *Verified* on the pro's profile.
- **Milestone escrow (MOCK, test mode)**: the customer splits the job into milestones, "funds" each one, and releases on sign-off; the pro can request sign-off. Status shows per milestone. No card fields, no real money.
- **Photo-to-quote**: a rules-based estimator (trade base range × size × urgency × regional index × description keywords), always labeled as an estimate and showing its math.
- **Rapid responder badge**: median first response (messages, leads, crew invites) under 1 hour. Badged pros rank first in emergency searches (`emerg=1`, urgent keywords, or the Emergency links).
- **Side-by-side bid compare**: with 2+ bids, compare price, timeline, rating, verified jobs, response time and badges, and hire from the compare view.

## What's here
| File | Purpose |
|---|---|
| `server.js` | Node 24 HTTP server with no npm dependencies. Uses `node:sqlite` (`data/sawyer.db`) and `crypto.scrypt` password hashes. |
| `app-logic.js` | The app's own business rules (`A.*` actions), run **server-side** in a `vm` sandbox. The server sets the session user, runs the action, saves to SQLite and returns a user-scoped snapshot. |
| `public/index.html` | The ultimate UI. Storage is patched so every action goes to `/api/act`. It polls `/api/state` every 4 seconds. |
| `build-live.js`, `client-pre.js`, `client-post.js` | Regenerate `public/` and `app-logic.js` from `src/app.html` + `src/v2.js` + `src/v2.css`. Run with `node build-live.js`. |
| `run-server.sh` / `run-tunnel.sh` / `start.sh` | Restart loops for the server and a Cloudflare quick tunnel. |
| `test/e2e.js` | Playwright test using three browser contexts (customer, pro, PM), run on desktop and mobile. |

## Run / restart
```
cd /workspace/contractor-app/live
./start.sh              # (re)starts server loop + tunnel loop, prints the public URL
cat logs/tunnel-url.txt # current public URL
tail -f logs/server.log logs/tunnel.log
```
- **Server only:** `nohup setsid ./run-server.sh &`. It listens on 127.0.0.1:8787 and restarts itself if it crashes.
- **Tunnel URL:** **The quick-tunnel URL changes every time cloudflared restarts** (reboot, crash or `start.sh`). Re-read `logs/tunnel-url.txt` after a restart and re-share the link.
- **Wipe all data and reseed the demo data:** stop the server, `rm -rf data/`, then start it again.
- **Run the tests:** `cd ../designs/src && cp ../../live/test/e2e.js _live_e2e.js && node _live_e2e.js <BASE_URL> ../../live/shots/v2`

## Security / safety
### Hotfix (QA sweeps 1–2)
- **Profile edits are an allowlist** (`bio, rate, phone, license, insurance, availNow`, pros only). `staff`, `verified`, `bg`, `plan`, `role`, etc. are never taken from the client. Typing a license no longer earns the Verified badge; changing it clears the badge. Staff mark a pro verified with `POST /api/staff/verify` `{uid, verified}` and header `x-admin-token: $ADMIN_TOKEN` (endpoint is off, 404, when `ADMIN_TOKEN` isn't set).
- **Real HTTP status codes** (400/401/403/404/405/413/415/429); JSON bodies still carry `status`.
- **Public snapshot is minimized:** signed out, no phone numbers, emails, business addresses or job descriptions/customer ids. Signed-in pros see open job details and business phones.
- **Headers:** hash-based Content-Security-Policy on every app page (no inline event handlers; use `data-csp`), HSTS over HTTPS, `X-Frame-Options: DENY`, nosniff, `Referrer-Policy`.
- **Pretty URLs** (`/prices`, `/find?cat=Roofing`, `/job/j1`) serve the app; unknown pages are an HTML 404.
- **Login throttling counts failed attempts only** (10 per account+IP, 50 per IP, 15 min, HTTP 429 + Retry-After).
- **Job lifecycle:** hire only open jobs and real pros, no switching after hire, complete only hired jobs, reviews only for a hired pro.
- **Messaging** needs a real account and a connection (pro profile, job, quote, project, traveler call, invoice, etc.).
- **Password change** needs the current password and signs out other sessions.
- Light Linen & Navy theme only; stock photos are never shown as a pro's own work.
- Tests: `node test/hotfix-e2e.js http://localhost:8910` (set `ADMIN_TOKEN` to the server's to cover the staff action).
- **Passwords:** scrypt with a per-user salt.
- **Sessions:** a random 256-bit token in an `HttpOnly; SameSite=Lax` cookie, plus `Secure` when served over https. Sessions last 30 days and are stored in SQLite.
- **Rate limits:**
  - Login: 10 per 15 minutes per IP.
  - Signup: 20 per hour per IP.
  - Actions: 120 per minute per user.
  - Global: 600 per minute per IP.
- **Origin and request checks:** POST requests from another origin are rejected, and requests must be JSON. Bodies are capped at 256 KB.
- **Allowed actions:** only whitelisted actions are accepted. Ownership rules are enforced server-side by the same `A.*` checks. Examples:
  - Only the job owner can hire.
  - Only the hiring customer can review, and only after completion.
  - Only the PM can accept applicants.
- **Pro profile edits:** `updatePro` cannot change id, role, email, verified, paid or demo.
- **Input:** strings are capped, control characters are removed, and prototype keys are dropped.
- **XSS:** all user content is rendered through the app's `esc()`. The e2e test posts a `<script>` bio and checks that it shows as text.
- **Private data:** snapshots never include password data, other users' emails, other people's DMs or notifications, or private crew messages. Quote prices are visible only to the job owner and the quoting pro.
- **Payments:** mock only. The plan step shows "Test mode, no real charge", and there are no card fields anywhere.
- **Banner:** "Beta test, don't post sensitive info." shows on every page.
- **Demo data:** demo pros, customers, PMs and projects are seeded and labeled "(demo)" or "Demo:".
  - Demo accounts have no password and can't be logged into.
  - Messages to demo pros get a labeled auto-reply. Real users never get fake replies.

## Limitations
- **Scale:** one Node process holds the whole dataset in memory. Each SQLite collection is stored as a JSON document. That's fine for a beta with hundreds of users, but not for real scale.
- **Live updates:** polling every 4 seconds, not websockets. Actions use synchronous XHR so the original UI code stays unchanged. Chrome logs a deprecation *warning* for this, not an error.
- **Accounts:** password reset (one-time code) and account deletion exist (v13). On a public host with `RESEND_API_KEY` set, the code is emailed (v20). There is still no separate "confirm your email" step at sign-up.
- **Profile views:** the per-day dedupe set is in memory, so a server restart can count a returning visitor once more that day.
- **Hosting:** if the box restarts, run `./start.sh` again. There is no systemd or pm2 boot hook.

## Deploy to Render (free tier)
This repo is deploy-ready, and nothing has been pushed anywhere yet.
1. Push this folder to a GitHub repo (branch `main`).
2. In Render, choose **New, then Blueprint** and pick the repo. `render.yaml` creates a free Web Service with these settings:
   - Build command: `npm install --omit=dev`. There are no dependencies, so this is a no-op.
   - Start command: `npm start`.
   - Health check path: `/healthz`.
   - `NODE_VERSION=24`. `node:sqlite` needs Node 22.13 or newer; `engines` allows `>=22.13 <25`.
3. The server listens on `0.0.0.0:$PORT`.
   - Render terminates TLS and sends `x-forwarded-proto: https`. The server trusts that header and marks the session cookie `Secure`. Set `TRUST_PROXY=0` to disable this.
   - Rate limits key on the client IP from `x-forwarded-for`.
4. **Free tier caveats:**
   - There is no persistent disk. `data/` (`DATA_DIR=./data`) is wiped on every deploy, restart and idle spin-down (after about 15 minutes idle). The demo seed is recreated automatically on the empty DB. Since v34 the server says so: a `WARNING: data is NOT persistent` line at boot, `"persistent": false` in `/healthz`, and a "This beta resets from time to time" note on sign-up and Account. See **Keep data between deploys** below.
   - The first request after an idle period takes about 30–60 seconds while the service wakes up.
5. `public/index.html` and `app-logic.js` are committed build outputs. To regenerate them from the design source, run `npm run rebuild-ui`; it is skipped when `../ultimate` is missing.

## Keep data between deploys (persistent disk, SW-071)
Not enabled yet: a Render disk needs a paid instance, so it's an owner decision. `render.yaml` has the disk block written out and commented. Exact steps:
1. **Decide on the plan.** Render disks only work on paid instances (Starter is about $7/mo; a 1 GB disk is about $0.25/mo). A paid instance also stops the 15-minute idle spin-down and the 30–60 s cold start.
2. **Pin the push keys first** (optional, recommended). On your own machine run `node tools/vapid-keys.js`, then in the Render dashboard → service → **Environment** add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` with those values (and `VAPID_SUBJECT=mailto:you@your-domain` if you like). Don't commit them. With both set, phones that turned alerts on keep working across resets. Without them the key pair lives in the database (table `vapid`), so it moves with the disk once the disk exists.
3. **Attach the disk.** Either in the dashboard (service → **Disks** → **Add disk**: name `sawyer-data`, mount path **`/data`**, size **1 GB**), or in `render.yaml`: change `plan: free` to `plan: starter` and uncomment the four `disk:` lines (`name: sawyer-data`, `mountPath: /data`, `sizeGB: 1`).
4. **Point the app at it.** Set `DATA_DIR=/data` (dashboard → Environment, or the `DATA_DIR` value in `render.yaml`). The server creates the folder if needed, checks it can write there, and stops with a clear `FATAL: DATA_DIR=/data is not writable …` message if the disk isn't mounted. Uploads go to `/data/uploads`, the database to `/data/sawyer.db`.
5. **Deploy and check.** `GET /healthz` should show `"persistent": true` and, after the next deploy, `"freshDb": false` with `"boots"` going up and `"dbSince"` unchanged. The boot log no longer prints the `WARNING` line, and the "This beta resets" note disappears from the app.
6. **Note:** the first boot on the empty disk seeds the demo data once (the current ephemeral data isn't copied over, by design: it is test data). A service with a disk restarts with a few seconds of downtime on each deploy.

**Wipe detection** (works with or without a disk): `/healthz` returns `persistent` (is `DATA_DIR` on its own disk mount, not the image's root filesystem, tmpfs or overlay), `freshDb` (this boot started from an empty database and seeded it), `dbSince` (when this database was first created) and `boots` (how many starts it has survived). An uptime monitor that alerts when `freshDb` is `true` or `dbSince` changes catches a wiped or unmounted disk right away. No paths or secrets are in the response. `SAWYER_PERSISTENT=1` / `0` overrides the mount check on hosts where the mount table is misleading.

## Email (Resend)
- `RESEND_API_KEY` — required to send mail. Set it in the Render dashboard; `render.yaml` lists it as `sync: false` so a Blueprint sync will not overwrite it.
- `MAIL_FROM` — defaults to `Sawyer <onboarding@resend.dev>`. After you verify a domain on Resend, change this to an address on that domain (for example `Sawyer <hello@your-domain>`).
- `RESEND_API_URL` — local tests only. Ignored when `NODE_ENV=production`. Never point this at an untrusted host.
- Until the domain is verified, Resend only delivers to the account owner. Recipients get a friendly 503: "Email delivery isn't fully enabled yet."

## Box-only env
- **`run-server.sh`:** binds to 127.0.0.1:8787.
- **Defaults:** `HOST=0.0.0.0`, `PORT=8787`, `DATA_DIR=./data` (next to `server.js`).

## Making it permanent
1. **Render:** create a Web Service from this folder.
   - Build: `node build-live.js`. Start: `node server.js`.
   - Set `PORT` from Render, and add a 1 GB persistent disk mounted at `/data` with `DATA_DIR=/data` (step by step: **Keep data between deploys** above).
   - Paid starter instance is about $7/mo. The free tier has no disk.
2. **Or Fly.io:** `fly launch`, then `fly volumes create data`, mount it at `/data`, and set `DATA_DIR=/data`.
3. **Domain:** buy one (about $10–12/yr, e.g. Cloudflare Registrar) and add a CNAME to the Render or Fly hostname. HTTPS is automatic.
4. **Before a public launch:**
   - Real Stripe Checkout (hosted, so no card data touches the server).
   - Password reset and sign-in codes are emailed through Resend when `RESEND_API_KEY` is set (v20). A verified sending domain is still needed so mail can go to addresses other than the Resend account owner. SMS is still outstanding.
   - Move to Postgres or proper SQLite tables.
   - Backups.
   - Terms and privacy pages.
   - Turn indexing on (below) only after this host is the custom domain.

## Search indexing (off until launch)

`/p/:id` and `/t/:id` are real URLs, but this temporary domain is full of fictional demo listings, so nothing is indexable until you opt in.

- `GET /robots.txt` is `Disallow: /`.
- Every response sends `X-Robots-Tag: noindex, nofollow`.
- No page carries JSON-LD while indexing is off. That includes the home page's Organization schema (v18, SW-045).
- Records labelled demo (`demo: true` or a name/title containing `(demo)`) are never in `/sitemap.xml`, and their pages stay `noindex` with no JSON-LD even after indexing is turned on.

**Launch switch (one line):**

```
SAWYER_INDEXABLE=1
```

Also set the canonical origin (no path). Open Graph and canonical tags use it, then `PUBLIC_URL`, then the request host:

```
SAWYER_BASE_URL=https://your-domain
```

Leave `SAWYER_INDEXABLE` unset or `0` until then. With it on, the sitemap lists `/` plus non-demo pro and traveler-call URLs only.

### v11 performance notes
- App JS ships as hashed, immutable `public/js/a*.js` files (built by `build-live.js`), preloaded in `<head>` and run in order by a tiny loader.
- Signed-out visitors to `/` get the real header + hero prerendered (`public/pre-top.html`, `public/pre-home.html`). On that page the loader waits for the first paint before running the app, so the hero photo is the LCP. After changing the home hero or header, regenerate with `NODE_PATH=/workspace/tools/node_modules node tools/prerender-hero.js http://localhost:8899`.
- If `esbuild` resolves at build time (`NODE_PATH`), inline CSS/JS get a whitespace+syntax minify (names untouched). `NO_MINIFY=1` skips it. No runtime dependency.
