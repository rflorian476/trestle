# Toolbelt (beta) — v2.1.0

**Toolbelt** is a nationwide contractor marketplace: homeowners hire licensed pros, project managers assemble whole crews, and every review and photo is tied to a finished job.

Live: https://trestle-twjo.onrender.com · version check: `GET /healthz` → `{"v":"2.1.0-toolbelt"}`

## Demo logins
All demo accounts share the password **`toolbelt-demo-2026`**. Every person and business in the seed data is fictional.

| Role | Email | What to try |
|---|---|---|
| Homeowner (Pat, Austin TX) | `demo-homeowner@toolbelt.test` | **Compare bids** on "Water heater leaking" (3 bids). **Escrow sign-off** on "Primary bath remodel" (one milestone waiting). Saved **photo-to-quote** estimate. |
| Pro (Bluebonnet Plumbing) | `demo-pro@toolbelt.test` | Rapid responder badge, photo-verified portfolio, dashboard reply-time tile. |
| Pro (Barton Creek Remodeling) | `demo-remodeler@toolbelt.test` | Hired on the bath remodel: upload before/after photos, request milestone sign-off. |
| Project manager (Dana, Copperline Build Group) | `demo-pm@toolbelt.test` | **Crew builder** on the Tampa deck & seawall project: dated slots, available-pro suggestions, invite or book the whole crew. |

Seed data covers Austin, Phoenix/Scottsdale, Tampa, Atlanta, Seattle, Detroit, Minneapolis, Brooklyn, Denver and Chicago.

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
| `server.js` | Node 24 HTTP server with no npm dependencies. Uses `node:sqlite` (`data/toolbelt.db`) and `crypto.scrypt` password hashes. |
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
- **Accounts:** no email verification, password reset or account deletion UI yet. Photo uploads are not supported.
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
   - Email verification and password reset (Postmark or Resend).
   - Move to Postgres or proper SQLite tables.
   - Backups.
   - Terms and privacy pages.
