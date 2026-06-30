# Changelog

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
