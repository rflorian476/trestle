#!/bin/bash
# Cloudflare quick tunnel -> localhost:8787. URL changes every time this restarts; see logs/tunnel-url.txt
cd "$(dirname "$0")"
while true; do echo "[$(date)] starting tunnel" >> logs/tunnel.log
 ./cloudflared-bin tunnel --no-autoupdate --protocol http2 --url http://localhost:8787 2>&1 | while read -r l; do echo "$l" >> logs/tunnel.log; u=$(echo "$l" | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com'); [ -n "$u" ] && echo "$u" > logs/tunnel-url.txt; done
 sleep 5; done
