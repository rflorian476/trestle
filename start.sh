#!/bin/bash
# start (or restart) server + tunnel in the background
cd "$(dirname "$0")"; mkdir -p logs
pkill -f run-server.sh; pkill -f run-tunnel.sh; pkill -f "node server.js"; pkill -f "cloudflared-bin tunnel"; sleep 1
nohup setsid ./run-server.sh >/dev/null 2>&1 &
nohup setsid ./run-tunnel.sh >/dev/null 2>&1 &
for i in $(seq 1 40); do [ -s logs/tunnel-url.txt ] && [ logs/tunnel-url.txt -nt logs/.start ] && break; sleep 1; done
echo "Public URL: $(cat logs/tunnel-url.txt 2>/dev/null)"
