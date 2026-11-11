# Sawyer (beta) — v2.3.0

**Sawyer** is a nationwide contractor marketplace: homeowners hire licensed pros, project managers assemble whole crews, and every review and photo is tied to a finished job.

Live: https://trestle-twjo.onrender.com · version check: `GET /healthz` → `{"v":"2.3.0-sawyer"}`

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


## v20: real sign-in emails through Resend
Builds on v19 (live as `bf75b1f`).
- **Email delivery.** When `RESEND_API_KEY` is set, sign-in codes, forgot-password codes and magic links are sent as a branded plain+HTML email (Linen & Navy, Sawyer wordmark, no hosted images). The code and link expire in 10 minutes. The API never returns the code or link on a public host (`NODE_ENV=production` or `RENDER`). Locally, test mode still shows the code when no key is set.
- **From address.** `MAIL_FROM` defaults to `Sawyer <onboarding@resend.dev>`. Until a domain is verified on Resend, Resend only delivers to the account owner's email. A 403 from Resend becomes HTTP 503 with "Email delivery isn't fully enabled yet." and is logged server-side (the key and the code are never logged). Other provider failures are a friendly 502.
- **Text messages.** SMS is still unavailable on the public host. The response is 503 and tells the person to use email instead.
- **Verified reminders.** The 60 / 30 / 7 / 0-day license and insurance notices (and the "badge came off" notice) are also emailed when a provider is configured and the account has a real email. Demo addresses (`@sawyer.test`, `@demo.invalid`, `@phone.invalid`) are skipped. A failed reminder email is logged and does not break the in-app notice.
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
   - There is no persistent disk. `data/` (`DATA_DIR=./data`) is wiped on every deploy, restart and idle spin-down (after about 15 minutes idle). The demo seed is recreated automatically on the empty DB.
   - The first request after an idle period takes about 30–60 seconds while the service wakes up.
5. `public/index.html` and `app-logic.js` are committed build outputs. To regenerate them from the design source, run `npm run rebuild-ui`; it is skipped when `../ultimate` is missing.

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
   - Set `PORT` from Render, and add a 1 GB persistent disk mounted at `/data` with `DATA_DIR=/data`.
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
