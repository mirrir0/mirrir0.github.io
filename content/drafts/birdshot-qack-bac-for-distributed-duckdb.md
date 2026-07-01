---
title: "Birdshot: Qack-BAC for distributed DuckDB"
description: "Building a bearer-authentication gateway on top of DuckDB's quack protocol to manage swarms of distributed analytics databases."
date: "2026-06-26"
tags: [duckdb, waddling, birdshot, quack, distributed-systems, auth]
---

## Birdshot: Qack-BAC for distributed DuckDB

*June 26, 2026*

---

### 🎯 Goals

I've been hacking on [Waddling](https://getwaddling.com), a DuckDB-native project, for the last few weeks — and one pain point kept coming up: **managing authentication across a swarm of distributed analytics databases is a nightmare.**

DuckDB's quack protocol is elegant for what it does — it lets DuckDB instances talk to each other and to DuckDB-backed services over HTTP. But out of the box, there's no lightweight, scalable way to say: *"This client can talk to these databases, for this long, with these permissions."*

Enter **Qack-BAC** (Qack Bearer Authentication Control) — a thin authentication and authorization layer I'm building as part of a bigger extension called **Birdshot**.

The goals were simple:

1. **Bearer-token auth** — issue short-lived tokens per client, validated at the gateway
2. **Per-database scope** — a token for one DuckDB instance shouldn't unlock another
3. **Stateless validation** — the gateway should verify tokens without hitting a central DB every time
4. **Zero config on the DuckDB side** — the databases themselves shouldn't need to know about auth

---

### 🔍 Findings

**Quack is wonderfully minimal.** The protocol is just HTTP with a custom content type — which means you can slap a reverse-proxy auth layer in front of it without touching the DuckDB process at all. That was the first aha moment.

**JWTs fit the bill perfectly.** They're self-contained, signed, and can carry claims for database ID, expiry, and permission level. No shared session store needed.

The tricky part was **token issuance**. You need a trusted issuer (the Birdshot gateway) that both the client and the quack endpoint trust. I went with an Ed25519 keypair — the gateway signs tokens, and each quack endpoint (or the gateway itself in proxy mode) can verify using the public key.

**Another finding: connection pooling.** Quack connections aren't free. If every client opens a fresh authenticated connection, you saturate fast. Birdshot's gateway multiplexes authenticated clients over a shared connection pool to the underlying DuckDB instances. Clients get a virtual connection; the gateway handles the real one.

---

### 🛠️ Implementation

The Birdshot extension has three layers:

#### 1. **The Token Issuer** (`birdshot auth issue`)

A CLI + HTTP endpoint that:

- Authenticates the requester (via API key or OAuth)
- Checks requested database scopes against an ACL
- Returns a signed JWT with claims: `{ db_id, sub, exp, perms: "read" | "write" }`

```bash
birdshot auth issue --db my-db --perms read --ttl 1h
# → eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiSldUIn0...
```

#### 2. **The Quack Gateway** (`birdshot gateway`)

A thin HTTP reverse-proxy that:

- Listens on `:7331` (quack's usual port, or any you configure)
- Intercepts every quack request and validates the `Authorization: Bearer <token>` header
- Verifies the JWT signature using the gateway's public key
- Checks that the requested database matches the token's `db_id` claim
- Proxies the request to the actual DuckDB quack endpoint
- Multiplexes connections via a LRU connection pool

```
client → Birdshot Gateway (auth check) → DuckDB Quack Endpoint
```

#### 3. **The Admin API** (`birdshot admin`)

For managing:

- Database registrations
- API keys for token issuance
- Token revocation (via a server-side denylist — the one stateful bit)
- Audit logs of who connected to what and when

---

### 📊 Current Status

The gateway prototype works end-to-end:

I'm currently dogfooding this with a small swarm of analytics DuckDB instances across different projects. Once the admin API and audit logging are solid, I'll publish the Birdshot extension for others to play with.

---

### 💭 Takeaways

The quack protocol's simplicity is its superpower. By layering authentication *around* it rather than *inside* it, we get something that's both more secure and easier to maintain. Qack-BAC isn't trying to replace quack's own auth — it's trying to make multi-database, multi-tenant deployments practical without forking anything.

*Next up: making the token revocation bulletproof and shipping the admin dashboard.*

---

*Built on top of [Waddling](https://getwaddling.com) — duckDB-native distributed analytics.*