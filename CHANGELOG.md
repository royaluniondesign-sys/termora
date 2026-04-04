# Changelog

## 0.1.0 (2026-04-04)

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

### By RUD
