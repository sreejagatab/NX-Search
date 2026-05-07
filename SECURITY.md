# Security Policy — NX Search

## Reporting a Vulnerability

If you discover a security vulnerability in this project, **do not open a public GitHub issue**.

Report it privately by emailing: **sbdeliverservice@gmail.com**

Please include:
- A clear description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix

You will receive a response within 48 hours. We take all reports seriously and will work to fix confirmed issues promptly.

---

## Supported Versions

| Version | Supported |
|---|---|
| `main` (latest) | ✅ Yes |
| Any tagged release | ✅ Yes |
| Older forks / clones | ❌ No |

---

## Security Architecture

### No credentials in the browser bundle

- `VITE_NEURONX_API_KEY` is injected at build time and sent as `X-API-Key` on every request
- The key is visible in the compiled bundle — treat it as a low-privilege read-only key
- Never store admin credentials or private keys in environment variables prefixed `VITE_`

### Proxy — no CORS, no key exposure in URLs

All API traffic routes through nginx (production) or Vite's dev proxy (development):

```
Browser → /api/* → nginx → neuronx.jagatab.uk
Browser → /v1/*  → nginx → neuronx.jagatab.uk
```

The API key is forwarded server-side via the `X-API-Key` header — it never appears in a URL.

### Content Security

- No `dangerouslySetInnerHTML` used anywhere
- Query highlighting uses React `<mark>` elements (not `innerHTML`)
- External URLs open with `rel="noopener noreferrer"`
- Clipboard writes use `navigator.clipboard.writeText` (secure context only)

### SSH Deploy Key

The CI/CD pipeline uses a **dedicated, scoped SSH keypair** (`gh-actions-nx-search`) with write access only to `/var/www/nx-search` on the server. It has no sudo privileges.

### Secrets in GitHub Actions

| Secret | Scope |
|---|---|
| `SSH_PRIVATE_KEY` | deploy only |
| `VITE_NEURONX_API_KEY` | build only, not logged |
| `SSH_HOST`, `SSH_USER` | deploy only |

Secrets are never printed in CI logs (`set +x` is respected by the runner).

---

> © 2026 Sree Ganesh Jagatab — All Rights Reserved. See [LICENSE](LICENSE).
