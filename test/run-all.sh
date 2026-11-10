#!/bin/bash
# Runs every e2e suite, each against its own fresh server (empty data dir, so suites don't affect each other).
# usage: NODE_PATH=/path/to/node_modules(with playwright) bash test/run-all.sh [port]   -> prints PASS/FAIL per suite
cd "$(dirname "$0")/.."
PORT=${1:-8961}; B="http://localhost:$PORT"; export ADMIN_TOKEN="${ADMIN_TOKEN:-$(node -e 'process.stdout.write(require("crypto").randomBytes(18).toString("hex"))')}"
LOG=${LOG_DIR:-/tmp/sawyer-tests}; mkdir -p "$LOG"; rc=0
SUITES=${SUITES:-"e2e v7-e2e v8-e2e v9-e2e v10-e2e v11-e2e v12-e2e v13-e2e hotfix-e2e v14-e2e"}
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
exit $rc
