# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in termora, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### Contact

Email: **security@termora.dev**

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### Response Timeline

- **48 hours**: We will acknowledge receipt of your report
- **7 days**: We will triage the vulnerability and provide an initial assessment
- **30 days**: We aim to release a fix for confirmed vulnerabilities

### Scope

**In scope:**

- Authentication and authorization bypasses
- Token/session hijacking or leakage
- WebSocket security issues
- PTY escape or command injection
- ngrok tunnel exposure issues
- Sensitive data leakage
- Dependencies with known CVEs

**Out of scope:**

- Issues requiring physical access to the host machine
- Social engineering attacks
- Denial of service (the agent runs locally)
- Issues in third-party services (ngrok, Resend)
- Vulnerabilities in outdated versions (please update first)

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |

## Recognition

We appreciate responsible disclosure. With your permission, we will credit you in the release notes and in a SECURITY_ACKNOWLEDGMENTS.md file.

## Security Best Practices for Users

- Keep your `NGROK_AUTHTOKEN` private — never commit it to version control
- Use the one-time bootstrap token flow; do not share session JWTs
- Run termora on a trusted network when possible
- Keep Node.js and dependencies up to date
