# Changelog

## 0.2.0 (2026-08-18)

### Fixed
- **Tunnel published a dead URL in production** — `WEB_PORT` (dev-only, points at the Vite dev server) was used unconditionally as the tunnel target; production `.env` files inherited it from `.env.example` and the public URL 404'd on every request while the agent itself was healthy. `resolveTunnelPort()` now falls back to the agent's own port unless something is actually serving `WEB_PORT`.
- **`TERMORA_PORT` (the documented variable) was silently ignored** — the loader only read `PORT`. Both are honoured now, `TERMORA_PORT` taking precedence.
- **Auth rate limit was bypassable** — `trust proxy: true` let a client's own `X-Forwarded-For` header override its real IP, so rotating that header gave every auth attempt a fresh rate-limit bucket. Now trusts only `loopback` (the tunnel process).
- **`Access-Control-Allow-Origin: '*'` on every response** — including `/api/info`, which embeds the persistent auth token — with no legitimate cross-origin caller to justify it (the SPA is always same-origin). Removed; added `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` as baseline hardening instead.
- **WebSocket client gave up reconnecting after ~5.5 minutes** — contradicted its own "no hard cap" docstring. A phone that stays foregrounded through a longer outage now keeps retrying indefinitely at a 30s-capped backoff.
- **A tunnel could report a URL it never actually routed** — cloudflared quick tunnels sometimes register a connection while the edge 404s every request. Each tunnel method is now health-checked before being published, and discarded in favor of the next method if it doesn't respond.
- Fixed `npm ci` failing on every CI run since 2026-07-10 — `@rollup/rollup-darwin-x64` and `lightningcss-darwin-x64` were pinned as explicit devDependencies, forcing every install (including CI's Linux runners) onto macOS Intel binaries neither package needs pinned.

### Changed
- Dependencies updated: better-sqlite3 12.10→12.11, eslint 9→10, prettier 3.3→3.9, turbo 2.3→2.10, vitest 4.1.2→4.1.10, typescript 5.7→6.0 (typescript-eslint's peer range blocks 7.x), typescript-eslint 8.0→8.67.
- CI now runs the test suite (it previously ran lint/typecheck/build only) and covers Node 24 alongside 20/22.
- App version is read from the workspace root `package.json` at build/runtime instead of being hardcoded in five separate places — it can no longer drift out of sync with what's installed.
- `npm audit fix` applied — cleared 7 advisories (5 high) in transitive dev dependencies.

### Docs
- README screenshots replaced with real captures of the current app (the gallery was still showing the pre-redesign UI); added a short GIF tour and a real Claude Code session demo.
- Added a termora-vs-Termux comparison section.
- Quickstart rewritten as a beginner-friendly walkthrough.

## 0.1.0 (2026-06-30)

### Design System
- **Obsidian theme** — switched from Anthropic orange (#d97757) to Obsidian violet (#a78bfa)
- **True near-black background** (#09090b) replacing warm dark (#141413)
- **Geist font** — Obsidian design system requires Geist for a developer-grade feel
- **xterm.js theme** updated to full Obsidian palette (violet cursor, emerald green success states)
- **Zinc-based surface scale** — surfaces now use #0c0c0f → #18181b → #27272a → #3f3f46
- Custom scrollbar styles, focus rings (2px solid #a78bfa), and keyframe animations

### New Components
- **ControlStrip** — live latency indicator (ms), PTY dimensions (cols×rows), Universal Paste button, and Clear (Ctrl+L) in the terminal header
- **TunnelsView** — dedicated Tunnels tab: active tunnel cards, status badges (LIVE/CONNECTING/CLOSED), URL copy, global uptime/data stats
- **TunnelsView tab** added to main navigation (Terminal / Sessions / Tunnels)

### UX Improvements
- **Latency pill** in DashNav showing WebSocket round-trip time in real-time
- **`useLatency` hook** — periodic ping/pong latency measurement
- **Fade-in-up animations** on view transitions (250ms ease-out)
- **Pulse-dot animation** on connection status indicator
- Session cards show correct Obsidian palette — violet accent for active, emerald LIVE badge
- NewSessionCard uses violet hover accent
- **Version display** synced to 0.1.0 across all packages

### Bug Fixes
- Version mismatch: package.json was 0.0.1 while CHANGELOG showed 0.1.0 — now synced
- Grid view counter badge uses Obsidian violet instead of orange

### Security
- (Inherited from initial release) express-rate-limit, JWT 7-day rotation, 1MB payload cap

---

## 0.0.1 (2026-04-04)

### Features
- Initial termora release (fork of clsh with production optimizations)
- Async tmux operations (non-blocking event loop)
- WebSocket backpressure detection (64KB threshold)
- Reconnect progress tracking with attempt counter
- Rate limiting on auth endpoints (10 req/15min per IP)
- JWT expiry reduced to 7 days (from 30)
- Database indexes for faster queries
- Input validation on resize and stdin messages

### Security
- express-rate-limit on bootstrap auth
- Removed unused allowed_emails table
- WebSocket payload size limit (1MB)

### By RUD Lab
