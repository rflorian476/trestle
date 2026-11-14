#!/bin/bash
# Runs every e2e suite, each against its own fresh server (empty data dir, so suites don't affect each other).
# usage: NODE_PATH=/path/to/node_modules(with playwright) bash test/run-all.sh [port]   -> prints PASS/FAIL per suite
cd "$(dirname "$0")/.."
PORT=${1:-8961}; B="http://localhost:$PORT"; export ADMIN_TOKEN="${ADMIN_TOKEN:-$(node -e 'process.stdout.write(require("crypto").randomBytes(18).toString("hex"))')}"
# Standard suites expect local test-mode codes. Provider keys are set only inside v20-e2e.
unset RESEND_API_KEY SENDGRID_API_KEY EMAIL_FROM MAIL_FROM TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_FROM TWILIO_MESSAGING_SERVICE_SID RESEND_API_URL
LOG=${LOG_DIR:-/tmp/sawyer-tests}; mkdir -p "$LOG"; rc=0
SUITES=${SUITES:-"e2e v7-e2e v8-e2e v9-e2e v10-e2e v11-e2e v12-e2e v13-e2e hotfix-e2e v14-e2e v16-e2e v17-e2e v18-e2e v19-e2e"}
for s in $SUITES; do
  [ -f "test/$s.js" ] || continue
  if curl -s -o /dev/null --max-time 1 "$B/healthz"; then echo "FAIL $s (port $PORT is already serving something; pick another: bash test/run-all.sh <port>)"; rc=1; continue; fi
  D=$(mktemp -d); HOST=127.0.0.1 PORT=$PORT DATA_DIR=$D RATE_X=${RATE_X:-50} node server.js >"$LOG/$s.server.log" 2>&1 & SP=$!
  for i in $(seq 1 50); do curl -sf "$B/healthz" >/dev/null && break; sleep 0.2; done
  if ! kill -0 $SP 2>/dev/null; then echo "FAIL $s (server did not start on port $PORT; is the port taken?)"; rc=1; rm -rf "$D"; continue; fi
  SH="$LOG/shots-$s"; mkdir -p "$SH"
  if timeout 900 node "test/$s.js" "$B" "$SH" >"$LOG/$s.log" 2>&1 && ! grep -q "^FAIL" "$LOG/$s.log"; then st=PASS; else st=FAIL; rc=1; fi
  echo "$st $s ($(grep -c '^PASS\|"ok":true\|✓' "$LOG/$s.log") pass lines, $(grep -c '^FAIL' "$LOG/$s.log") FAIL lines)"
  kill $SP 2>/dev/null; wait $SP 2>/dev/null; rm -rf "$D"
done

# Self-contained suites start their own servers (seo, exposure). They must not use the shared e2e port.
for s in seo exposure v20-e2e v21-e2e v22-e2e v23-e2e v24-e2e v25-e2e v26-e2e v27-e2e; do
  [ -f "test/$s.js" ] || continue
  if timeout 180 node "test/$s.js" >"$LOG/$s.log" 2>&1 && ! grep -q "^FAIL" "$LOG/$s.log"; then st=PASS; else st=FAIL; rc=1; fi
  echo "$st $s ($(grep -c -E '^ok |^PASS' "$LOG/$s.log") pass lines, $(grep -c '^FAIL' "$LOG/$s.log") FAIL lines)"
done
exit $rc
