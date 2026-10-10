# TicketWave SDK examples

Runnable quickstart examples for the **TicketWave public API**, covering the
three things TicketWave HQ powers: **events**, **food ordering**, and
**bookings**. Every example is a small, self-contained file you can run with a
stock Node.js and read in under a minute.

TicketWave HQ is white-label commerce for events, food and bookings. This repo
sits alongside the API contract published at
[github.com/TicketWave-IP/openapi-spec](https://github.com/TicketWave-IP/openapi-spec)
and shows that contract in motion. For the product itself, see
[access.ticketwavehq.com](https://access.ticketwavehq.com).

> These examples are intentionally dependency-free. They call the API with the
> built-in `fetch` in Node.js 18+, so you can clone and run without an
> `npm install`. The call shapes mirror the official `@ticketwave/sdk`
> TypeScript client one-to-one, so moving to the SDK later is a straight swap.

---

## Contents

- [What you get](#what-you-get)
- [Requirements](#requirements)
- [Quickstart](#quickstart)
- [The examples](#the-examples)
  - [Events](#events)
  - [Food ordering](#food-ordering)
  - [Bookings and door entry](#bookings-and-door-entry)
- [How these map to the OpenAPI spec](#how-these-map-to-the-openapi-spec)
- [Authentication and scopes](#authentication-and-scopes)
- [Using the official SDK instead](#using-the-official-sdk-instead)
- [Rate limits and errors](#rate-limits-and-errors)
- [Project layout](#project-layout)
- [Contributing](#contributing)
- [Related repositories](#related-repositories)
- [License](#license)

---

## What you get

Five focused examples, each one a single command:

| # | Example | API surface | Reads or writes |
|---|---------|-------------|-----------------|
| 01 | List events | `GET /api/v1/events` | read |
| 02 | Get one event with ticket tiers | `GET /api/v1/events/{slug}` | read |
| 03 | List paid orders | `GET /api/v1/orders` | read |
| 04 | Food ordering, gated by the access engine | `POST /api/v2/resources`, `POST /api/v2/access/decide` | write + read |
| 05 | Bookings and door entry, with override | `POST /api/v2/resources`, `POST /api/v2/access/decide`, `POST /api/v2/access/overrides` | write + read |

There is also a [curl-equivalents](examples/curl-equivalents.md) reference so
you can watch the raw HTTP traffic before writing any code.

---

## Requirements

- **Node.js 18 or newer** (for the global `fetch`). Check with `node -v`.
- A **TicketWave API key**. Issue one at
  [access.ticketwavehq.com/dashboard/settings/api-keys](https://access.ticketwavehq.com/dashboard/settings/api-keys).
  Live keys look like `tw_live_xxxxxxxxxxxxxxxx`.

No other tooling. There is nothing to install.

---

## Quickstart

```bash
git clone https://github.com/TicketWaveHQ/sdk-examples.git
cd sdk-examples

# Provide your key (copy .env.example if you prefer a file)
export TICKETWAVE_API_KEY=tw_live_xxxxxxxxxxxxxxxx

# List your first five published events
node examples/01-list-events/index.mjs
```

You should see a short list of your tenant's events, and a hint showing how to
feed the first event slug into example 02.

Handy npm scripts wrap the same commands:

```bash
npm run events   # 01
npm run event    # 02  (needs EVENT_SLUG)
npm run orders   # 03
npm run food     # 04  (needs ACTOR_ID)
npm run door     # 05  (needs ACTOR_ID)
npm run check    # syntax-check every example, no key or network needed
```

---

## The examples

### Events

**[`examples/01-list-events`](examples/01-list-events/index.mjs)** reads a page
of your published events. Pagination is offset-based (`page` / `pageSize`), and
every row belongs to your own tenant. Cross-tenant probes resolve to `404`, not
`403`, so the surface cannot be used to enumerate other tenants.

**[`examples/02-get-event-with-tiers`](examples/02-get-event-with-tiers/index.mjs)**
fetches a single event by slug and prints its visible ticket tiers with prices
formatted in each tier's ISO 4217 currency.

```bash
export TICKETWAVE_API_KEY=tw_live_xxxxxxxxxxxxxxxx
EVENT_SLUG=summer-jam-2026 node examples/02-get-event-with-tiers/index.mjs
```

### Food ordering

Food ordering is not a separate API namespace. In TicketWave, an ordering
action ("can this device place a kitchen order right now?") is modelled as a
**resource** that the v2 access-decision engine governs. Each attempt becomes an
`ALLOW` / `DENY` / `REVIEW` decision you can log, replay, dispute, and override.

**[`examples/04-food-ordering-access`](examples/04-food-ordering-access/index.mjs)**
registers a resource of kind `api_route` for the "place order" action, then asks
the engine to decide whether a `device` actor may use it, passing basket context
along with the request.

```bash
export TICKETWAVE_API_KEY=tw_live_xxxxxxxxxxxxxxxx
ACTOR_ID=<uuid-of-a-registered-device> node examples/04-food-ordering-access/index.mjs
```

### Bookings and door entry

A booking that grants entry (a ticket, a table reservation, a room hold) is
enforced at the door by the same engine. A scanner asks for a decision, the
verdict is logged, and a supervisor can override a wrong call after the fact
without ever mutating the original decision.

**[`examples/05-booking-door-decision`](examples/05-booking-door-decision/index.mjs)**
registers a `door` resource, decides entry for a booking holder, and, if the
verdict is `DENY`, applies a supervisor override that writes a fresh `ALLOW` log
row while preserving the original for the audit trail.

```bash
export TICKETWAVE_API_KEY=tw_live_xxxxxxxxxxxxxxxx
ACTOR_ID=<uuid-of-the-booking-holder> node examples/05-booking-door-decision/index.mjs
```

---

## How these map to the OpenAPI spec

The single source of truth for every field, enum, and status code used here is
the OpenAPI 3.1 document at
[github.com/TicketWave-IP/openapi-spec](https://github.com/TicketWave-IP/openapi-spec).
Each example file names the exact `operationId` it exercises in its header
comment, so you can jump straight from an example to the matching operation in
[`openapi.yaml`](https://github.com/TicketWave-IP/openapi-spec/blob/main/openapi.yaml).

| Example | operationId in the spec | Namespace |
|---------|-------------------------|-----------|
| 01 List events | `listEvents` | `/api/v1/*` |
| 02 Get event by slug | `getEventBySlug` | `/api/v1/*` |
| 03 List orders | `listOrders` | `/api/v1/*` |
| 04 Register resource + decide | `createAccessResource`, `decideAccess` | `/api/v2/*` |
| 05 Register resource + decide + override | `createAccessResource`, `decideAccess`, `createOverride` | `/api/v2/*` |

The two namespaces:

- **`/api/v1/*`** reads tenant resources: events, ticket tiers, and orders.
  Scope `plugin:read`, with optional `plugin:pii` to unmask buyer identity.
- **`/api/v2/*`** is the commerce and access-decision engine: register
  resources, write rules, ask for `ALLOW` / `DENY` / `REVIEW`, then replay,
  dispute, and override. Scope `plugin:read` for reads, `plugin:write` for
  state changes.

The enums the examples rely on come straight from the spec:

- **ResourceKind:** `event`, `ticket`, `door`, `api_route`
- **ActorKind:** `user`, `anonymous`, `service`, `device`
- **Decision:** `allow`, `deny`, `defer`, `challenge`
- **OrderStatus:** `pending`, `paid`, `deposit_paid`, `refunded`,
  `partially_refunded`, `cancelled`, `disputed`

If an example ever disagrees with the spec, the spec wins. Please open an issue
so we can correct the example.

---

## Authentication and scopes

Every request carries a bearer token:

```
Authorization: Bearer tw_live_xxxxxxxxxxxxxxxx
```

Issue and rotate keys at
[access.ticketwavehq.com/dashboard/settings/api-keys](https://access.ticketwavehq.com/dashboard/settings/api-keys).
Scopes decide what a key can do:

| Scope | Grants |
|-------|--------|
| `plugin:read` | Read events, tiers, orders, and access logs. GET routes on v2. |
| `plugin:pii` | Unmask buyer name and email on orders. |
| `plugin:write` | Register resources, write rules, decide, override, dispute. |

Tenant scoping is enforced server-side on every row, so a key only ever touches
resources under its own `clientId`.

---

## Using the official SDK instead

These examples stay dependency-free on purpose, so they double as a reference
for the exact wire shapes. When you are ready for a typed client, TicketWave
ships a TypeScript SDK generated from the very same OpenAPI spec. The package is
published as `@ticketwave/sdk`:

```bash
npm install @ticketwave/sdk
```

```ts
import { TicketWave } from "@ticketwave/sdk";

const tw = new TicketWave({ apiKey: process.env.TICKETWAVE_API_KEY });

const events = await tw.events.list({ status: "published", pageSize: 5 });
const decision = await tw.access.decide({ actorId, resourceId, trustMode: "hybrid" });
```

Because the SDK and this repo are both generated from
[the same spec](https://github.com/TicketWave-IP/openapi-spec), the method names
line up with the `operationId`s referenced above. Confirm the current published
version and install instructions on the npm registry before pinning it in a
production project.

If you need a client in another language, generate one directly from the spec
with the OpenAPI Generator, as documented in the
[openapi-spec README](https://github.com/TicketWave-IP/openapi-spec#how-to-consume-it).

---

## Rate limits and errors

- **v1** is limited to **120 requests per minute per key**.
- **v2** is limited to **240 requests per minute per key**.

When you exceed a limit the API returns `429` with a `Retry-After` header. The
shared client in [`examples/_shared/client.mjs`](examples/_shared/client.mjs)
surfaces that as a readable error, and turns any non-2xx response into an
`ApiError` carrying the status and parsed body. Common statuses:

| Status | Meaning |
|--------|---------|
| `400` | Bad request (malformed body or query) |
| `401` | Missing or invalid bearer token |
| `403` | Authenticated, but the scope is insufficient |
| `404` | Not found, or a cross-tenant reference (anti-enumeration) |
| `409` | State conflict (for example a unique constraint) |
| `429` | Rate limited |

---

## Project layout

```
sdk-examples/
├── examples/
│   ├── _shared/client.mjs              # dependency-free fetch wrapper
│   ├── 01-list-events/index.mjs
│   ├── 02-get-event-with-tiers/index.mjs
│   ├── 03-list-orders/index.mjs
│   ├── 04-food-ordering-access/index.mjs
│   ├── 05-booking-door-decision/index.mjs
│   └── curl-equivalents.md
├── .github/
│   ├── workflows/smoke.yml             # node --check on 18 / 20 / 22
│   └── ISSUE_TEMPLATE/example-request.yml
├── .env.example
├── package.json
└── LICENSE
```

---

## Contributing

Contributions are welcome, especially new examples that cover an endpoint not
shown here. Please keep three rules:

1. **Dependency-free.** Standard-library Node.js only, so `git clone` then run.
2. **One idea per example.** Small enough to read in a minute.
3. **Cite the spec.** Name the `operationId` in the header comment and link to
   [openapi-spec](https://github.com/TicketWave-IP/openapi-spec).

`npm run check` syntax-checks every example and runs in CI on Node 18, 20, and
22. For questions about the API contract itself (a wrong field, a missing enum
value), open an issue on the
[openapi-spec](https://github.com/TicketWave-IP/openapi-spec) repo rather than
here.

---

## Related repositories

- **[TicketWave-IP/openapi-spec](https://github.com/TicketWave-IP/openapi-spec)** - the canonical OpenAPI 3.1 contract these examples run against.
- **[TicketWave HQ on GitHub](https://github.com/TicketWaveHQ)** - the company that operates TicketWave.
- **[access.ticketwavehq.com](https://access.ticketwavehq.com)** - the product: white-label commerce for events, food and bookings.

---

## License

[MIT](LICENSE). Copy any snippet into your own project without attribution.
