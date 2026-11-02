#!/bin/bash
# keeps the Toolbelt server up: restarts on crash
cd "$(dirname "$0")"
while true; do echo "[$(date)] starting server" >> logs/server.log; HOST=127.0.0.1 PORT=8787 node server.js >> logs/server.log 2>&1; sleep 2; done
