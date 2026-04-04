#!/bin/bash
export PATH="/opt/homebrew/bin:$PATH"
cd /Users/oxyzen/termora
exec node node_modules/.bin/vite --config packages/web/vite.config.ts --host --port ${PORT:-5555}
