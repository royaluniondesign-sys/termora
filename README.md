<div align="center">

# termora

**Your machine, in your hands.**

Real terminal access from your phone. Not SSH. Not a simulation.
A real PTY on your machine, streamed to your pocket.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green?logo=node.js&logoColor=white)](https://nodejs.org)
[![Build](https://img.shields.io/badge/Build-Passing-brightgreen)]()
[![Security](https://img.shields.io/badge/Security-Hardened-blue?logo=shield)]()
[![by](https://img.shields.io/badge/by-RUD-d97757)]()

</div>

---

## What is termora?

termora gives you real terminal access to your Mac from your phone. Clone, install, run — scan the QR code and you're in. Multiple live terminal sessions, a custom keyboard built for terminal use, 6 keyboard skins, touch-optimized copy/paste, and zero-loss reconnection. Open source, zero config.

**Key highlights:**

- Run Claude Code from your phone and watch it work in real time
- **Touch Actions Bar** — select, copy, paste directly on the terminal
- Multiple terminal sessions with live grid preview
- Custom keyboard with sticky modifiers, key repeat, and context strip
- 3-tier tunnel: ngrok, SSH, Wi-Fi (works without any signup)
- **Zero-loss reconnection** — close the app, reopen, everything's still there
- Install as a PWA — fullscreen, no browser chrome

## Quickstart

> **Requires [Node.js 20+](https://nodejs.org)** and macOS or Linux.

```bash
git clone https://github.com/rud-lab/termora.git
cd termora
npm install
npm run dev
```

A QR code prints to the console. Scan it on your phone. That's it.

## How It Works

```
  Phone / Tablet / Browser
        |
        | HTTPS (WebSocket)
        v
  +----------------+
  |  Tunnel        |  ngrok / SSH (localhost.run) / Wi-Fi
  +-------+--------+
          v
  +------------------------+
  |  termora agent         |  <- runs on your machine
  |  +-- PTY 0: zsh        |
  |  +-- PTY 1: claude     |
  |  +-- PTY 2: ...        |
  |  +-- up to 8 sessions  |
  +------------------------+
```

## Security

termora is designed with security as a core principle, not an afterthought.

| Feature | Detail |
|---------|--------|
| **JWT Authentication** | 7-day rotation with one-time bootstrap tokens |
| **Rate Limiting** | Auth endpoints protected against brute-force |
| **Encrypted Tunnels** | All traffic over HTTPS via ngrok or SSH |
| **No Cloud Storage** | Your data never leaves your machine |
| **Restrictive CORS** | Production-mode restricts origins |
| **Constant-time Comparison** | Token verification prevents timing attacks |

Found a vulnerability? See [SECURITY.md](SECURITY.md) for our disclosure policy.

## Features

### Terminal
- **Multiple live sessions** — create, rename, close; up to 8 concurrent PTYs
- **Real PTY** — full zsh/bash with colors, vim, tmux, everything
- **Session persistence** — sessions survive server restarts via tmux
- **Session grid** — 2-column card layout with live terminal previews

### Touch and Mobile
- **Touch Actions Bar** — select, copy, paste, cut, tab, history
- **Swipe navigation** — swipe between sessions, swipe down for grid
- **Zero-loss reconnection** — automatic buffer replay on reconnect
- **PWA** — install to home screen, runs fullscreen

### Keyboard
- **Two layouts** — iOS Terminal (6-row) and MacBook (5-row)
- **Sticky modifiers** — tap Shift/Ctrl/Opt/Cmd once, it stays for the next key
- **Key repeat** — hold any key for auto-repeat
- **Context strip** — quick-access: esc, F1-F5, commit, diff, plan, Ctrl+C
- **6 skins** — iOS Terminal, MacBook Silver, Gamer RGB, Custom Painted, Amber Retro, Ice White

### Connectivity
- **3-tier tunnel fallback** — ngrok, localhost.run SSH, local Wi-Fi
- **Zero-config start** — works immediately with SSH tunnel (no signup needed)
- **Static URL with ngrok** — same URL every time for PWA home screen

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS v4, xterm.js (WebGL) |
| Backend | Node.js 20+, Express, ws, node-pty, tmux, better-sqlite3 |
| Tunnel | @ngrok/ngrok SDK, localhost.run (SSH fallback) |
| Auth | jose (JWT), one-time bootstrap tokens |
| Monorepo | Turborepo, npm workspaces |

## Project Structure

```
termora/
+-- packages/
|   +-- agent/     # Backend: Express + WebSocket + node-pty + auth + tunnel
|   +-- web/       # Frontend: React + xterm.js + Tailwind + keyboard system
|   +-- cli/       # CLI wrapper (future)
+-- docs/
    +-- images/    # Screenshots
```

## Configuration

Create a `.env` file in the project root (optional):

```bash
NGROK_AUTHTOKEN=your_token
NGROK_STATIC_DOMAIN=your-subdomain.ngrok-free.dev
TERMORA_PORT=4030
TERMORA_NO_TMUX=1
TERMORA_NO_OPEN=1
TUNNEL=ssh
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

Made by **[RUD](https://github.com/rud-lab)** | Star this repo if termora is useful to you

</div>
