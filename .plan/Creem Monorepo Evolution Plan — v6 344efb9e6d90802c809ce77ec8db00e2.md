# Creem Monorepo Evolution Plan — v6

> **North Star**: Make Creem a dev-native **5-minute greenfield experience** and
> a guided **sub-30-minute brownfield integration** — choose stack, scaffold or
> integrate, verify first checkout, ship billing UI.

## Executive Summary

### What we’re unlocking

Creem already removes the hardest business and legal parts of selling
internationally: Merchant of Record, tax/compliance, checkout, and payout
operations. This plan removes the remaining developer activation bottleneck. The
goal is a path where a founder can create a Creem account, choose their stack,
wire billing into their app, verify checkout/webhooks, and start selling
globally in minutes.

The core deliverables: a shared billing contract (`@creem/core`), plug-and-play
UI widgets (React, Svelte, then Vue/Solid), stack-specific integration packages
(Convex, Supabase, Next.js, SvelteKit), canonical templates for every supported
combination, and a config-as-code CLI that treats billing configuration like
version-controlled infrastructure.

### Why this matters now

Creem’s growth opportunity is not only better docs or fewer support tickets. It
is collapsing the time from “I want to sell globally” to “my product can accept
payments legally and operationally.” Merchant of Record solves the business
side; this plan solves the developer side. When both are minutes-level
experiences, Creem becomes one of the fastest paths from codebase to global
revenue.

Support leverage still matters: repetitive integration questions should move
from humans into product, templates, and docs. But support reduction is a
consequence of the bigger unlock — faster activation, faster first revenue, and
a stronger dev-native moat.

### The developer experience — before and after

**Before**: Piecing together docs, dashboard clicks, manual webhook setup,
unclear stack wiring, no billing UI components, copy-paste examples that don’t
match your architecture.

**After**: Choose stack → scaffold or integrate → set env vars → run → click
subscribe → see webhook-driven state reflected in UI. Under 5 minutes for
greenfield. Under 30 minutes for brownfield with agent-guided integration.

### Optimistic 30 / 60 / 90 day picture

| Timeframe  | Deliverable                                                                               | User impact                                                              |
| ---------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Day 30** | `@creem/core` extracted + `@creem/supabase` + `@creem/nextjs` + `@creem/sveltekit` drafts | Contract validated against the first React/Svelte + server-runtime paths |
| **Day 60** | `@creem/ui-react` + `@creem/ui-svelte` standalone + `@creem/convex` migrated              | Billing widgets work with any supported backend                          |
| **Day 90** | `create-creem-app` + first 4 templates + interactive docs quickstart                      | 5-minute greenfield experience is real and testable                      |

This is an intentionally optimistic landing picture, not a fixed delivery
contract. The exact order will change as the first validation loop surfaces
unknowns, but this is the kind of pace the plan is designed to make possible.

### What success looks like — DevX signals to validate

We cannot reliably instrument arbitrary user projects end-to-end. The right
measurement model combines internal benchmark runs, template telemetry where
available, support tagging, and customer feedback.

| Signal                                                         | What it tells us                                                                         | How to validate realistically                                                                                                                         |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Time-to-first-checkout**                                     | How quickly a developer can reach a verified test checkout                               | Internal benchmark runs for each canonical template; optional CLI/template telemetry for scaffolded apps; customer interviews for brownfield projects |
| **Time-to-first-working-webhook**                              | Whether the integration produces real billing state, not just a checkout link            | Internal benchmark runs with local webhook simulation; template E2E tests; customer feedback from early integrations                                  |
| **Integration-related support tickets per activated merchant** | Whether repetitive integration burden is moving from support into product/docs/templates | Tag support tickets by category and compare trend before/after template/docs launch                                                                   |
| **Waitlist → first transaction conversion**                    | Whether better self-serve onboarding improves activation                                 | Internal funnel metric                                                                                                                                |
| **Docs / quickstart completion confidence**                    | Whether developers can complete the intended path without human help                     | Docs step analytics where possible, template smoke tests, user feedback, and support-ticket reduction                                                 |

The exact numeric targets should be set after establishing current baselines.
These signals measure the API/SDK/code side of the journey. Payout and broader
operational support remain part of the full Creem product experience, but this
plan is scoped to reducing friction in developer activation and integration.

## Developer Journey — The 5-Minute Promise

### Greenfield (new project)

A 5-minute promise is credible if the steps are:

1. `npx create-creem-app --ui react --integration nextjs supabase`
2. Set ~3 env vars (`CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, and
   e.g. `SUPABASE_URL`)
3. `npm run dev`
4. Open billing page → click Subscribe
5. Complete test checkout
6. See webhook-driven state reflected in UI

Templates make this work because each one is a complete, tested, correctly-wired
project. No generation logic — the CLI routes to the right template, clones it,
and personalizes the env.

### Brownfield (existing project)

This is where Creem can win against every competitor, because most “quickstarts”
are greenfield-biased.

1. Detect host stack (framework, router, database, auth)
2. Select nearest canonical template from the manifest
3. Diff only the integration surfaces (webhook route, provider setup, billing
   page, env vars)
4. Apply minimal wiring without re-scaffolding the app
5. Verify: build passes, test checkout works, webhook fires

This can be agent-guided (template manifest + skill bundle) or manual (per-stack
integration guide in docs). The agent path is the recommended, but not the only
path.

### What is unlocked vs. blocked

| Area                                 | Status                             | Why it matters                                                                                                                                            |
| ------------------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Core integration ecosystem**       | **Unblocked**                      | `@creem/core`, first integration packages, UI widget extraction, and CLI parity can start immediately                                                     |
| **Greenfield templates + docs**      | **Partially unblocked**            | Architecture, docs structure, and template design can start now; runnable templates depend on the relevant UI and integration packages existing           |
| **Brownfield integration path**      | **Partially unblocked**            | Template manifest and skill/docs design can start now; high-confidence implementation depends on canonical templates existing                             |
| **Stronger pricing/product widgets** | **Partially blocked on Creem API** | Trial metadata, bundle APIs, and one-time product grouping/upgrade modeling are needed for fully dynamic, plug-and-play pricing and product upgrade flows |
| **Config-as-code + sync engine**     | **Blocked on Creem API**           | Needs product update/archive, bundle CRUD, discount update, and `updatedAt` fields                                                                        |
| **Live sync + audit trail**          | **Enhanced by platform work**      | Change History API enables efficient polling, attribution, and enterprise audit trails, but is not required for baseline correctness                      |

The detailed discussion list lives in
[**Open Decisions**](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
below.

## Table of Contents

1. [Current State Analysis](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
2. [Target Architecture](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
3. [Terminology + Ownership Rules](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
4. [Open Decisions (D1–D6)](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
5. [How to Read the Stages](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
6. [Stage 0 — Foundation: Core Extraction](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
7. [Stage 1 — Integration Interfaces + First Integrations](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
8. [Stage 2 — UI Widgets (React + Svelte)](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
9. [Stage 3 — Convex Integration Migration](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
10. [Stage 4 — CLI Coverage Parity](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
11. [Stage 5 — Config-as-Code + Sync Engine](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
12. [Stage 6 — Additional UI Frameworks](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
13. [Stage 7 — Templates + Docs Overhaul](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
14. [MVP Validation Stream](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
15. [Cross-Cutting Concerns](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
16. [CLI vs SDK vs Dashboard Parity Table](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)
17. [Appendix A — Sync Engine Merge Scenarios](https://www.notion.so/Creem-Monorepo-Evolution-Plan-v6-344efb9e6d90802c809ce77ec8db00e2?pvs=21)

## 1. Current State Analysis

### Packages Today

| Package                  | npm name                  | Version | Role                                                                                             |
| ------------------------ | ------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `packages/creem-sdk`     | `creem`                   | 1.4.4   | Core TypeScript SDK (Speakeasy-generated), 24 endpoints, MCP server                              |
| `packages/creem-cli`     | `creem-cli`               | 0.1.3   | CLI (commander), login/products/checkouts/subscriptions/customers/transactions/discounts/migrate |
| `packages/convex`        | `@creem_io/convex`        | 0.3.0   | Convex integration + React/Svelte widgets + design system + core billing types                   |
| `packages/nextjs`        | `@creem_io/nextjs`        | 0.5.0   | Next.js integration (server checkout/portal/webhook + React client components)                   |
| `packages/better-auth`   | `@creem_io/better-auth`   | 1.1.0   | Better Auth plugin                                                                               |
| `packages/webhook-types` | `@creem_io/webhook-types` | 1.0.0   | Shared webhook event types + normalization                                                       |
| `packages/creem-io`      | `creem_io`                | 1.1.0   | Wrapper SDK (deprecated label — **needs confirmation**, see D2)                                  |
| `packages/docs`          | —                         | —       | Mintlify documentation                                                                           |

### `_source/` Community References

| Directory                                                              | Notes                                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `laravel/`                                                             | Full Laravel package (Illuminate HTTP, webhooks, Artisan commands) |
| `laravel-omnipay/`                                                     | Omnipay bridge                                                     |
| `expo/`, `framer/`, `nextjs-supabase-boilerplate/`, `datafast-plugin/` | Empty or minimal                                                   |

### Key Observations

1. **UI widgets are Convex-coupled** — `src/svelte/widgets/types.ts` and
   `src/react/widgets/types.ts` import `FunctionReference` from `convex/server`.
   Every widget calls Convex directly via `useQuery`/`useMutation`/`useAction`.
2. **Widget types already identical** — React and Svelte `widgets/types.ts` are
   byte-for-byte identical (180 lines each). The abstraction seam exists; it
   just needs to be pulled out.
3. **Core is partially extracted** — `src/core/` (types, catalog, resolver,
   selectors, payments, pendingCheckout, subscriptionUpdate, markdown) is
   backend-agnostic. Good starting point.
4. **Design system exists** — `src/design-system/` has CSS tokens (colors,
   typography, rounded, base). Consumed via `src/library.css`.
5. **Ark UI is the headless foundation** — Both React (`@ark-ui/react`) and
   Svelte (`@ark-ui/svelte`) widgets use Ark UI for Dialog, Portal, etc. Ark UI
   also supports **Vue** and **Solid**, which aligns with the expansion plan. It
   does **NOT** support Angular or React Native.
6. **Creem API has significant gaps** — No product update/archive, no product
   bundles (groups) via API, no discount update. These are hard blockers for
   config-as-code.
7. **SDK is Speakeasy-generated** — The `creem` SDK is auto-generated from
   `openapi.json` via Speakeasy. All files are marked `DO NOT EDIT`. Adding new
   endpoints requires updating the OpenAPI spec and re-running Speakeasy
   generation (if Creem adds the API endpoint). The CLI (`creem-cli`) is
   hand-written and depends on the SDK — adding CLI commands for existing SDK
   endpoints is straightforward; adding CLI commands for non-existent API
   endpoints is impossible.

### Creem API Surface (from openapi.json)

| Resource                   | Available Endpoints                                                                                                    | Missing (needed for parity)                                                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Products                   | create, get, search                                                                                                    | **update, archive**                                                                                                                                                          |
| Product Bundles (Groups)   | —                                                                                                                      | **full CRUD** (dashboard-only for subscriptions; nonexistent for one-time products)                                                                                          |
| Checkouts                  | create, get                                                                                                            | —                                                                                                                                                                            |
| Customers                  | get, list, billing portal                                                                                              | create, update                                                                                                                                                               |
| Subscriptions              | get, search, update, upgrade, cancel, pause, resume                                                                    | —                                                                                                                                                                            |
| Transactions               | get, search                                                                                                            | —                                                                                                                                                                            |
| Licenses                   | activate, deactivate, validate                                                                                         | —                                                                                                                                                                            |
| Discounts                  | create, get, delete, list/search                                                                                       | **update**                                                                                                                                                                   |
| Customer Credits           | create account, get account, get balance, list accounts, list entries, credit, debit, reverse, freeze, unfreeze, close | — (full API, **Experimental** preview)                                                                                                                                       |
| Stats                      | summary                                                                                                                | —                                                                                                                                                                            |
| Payment Methods            | —                                                                                                                      | **Not available via API** — managed only through Creem-hosted customer portal (Stripe-powered payment page). No direct API for listing, adding, or removing payment methods. |
| Customer Preferences       | —                                                                                                                      | **Not available via API** — billing email, business address, tax ID managed only through customer portal.                                                                    |
| Change History / Audit Log | —                                                                                                                      | **Does not exist yet** — enhances config-as-code sync (Stage 5), not a hard prerequisite                                                                                     |

## 2. Target Architecture

![image.png](image.png)

[https://www.notion.so](https://www.notion.so)

### Layer Ownership Matrix

The complexity: some technologies span multiple layers.

| Technology             | Frontend | Backend    | Database | Package Role                                    |
| ---------------------- | -------- | ---------- | -------- | ----------------------------------------------- |
| React                  | ✅       | —          | —        | UI widget consumer                              |
| Svelte                 | ✅       | —          | —        | UI widget consumer                              |
| Next.js                | ✅       | ✅         | —        | Server Actions, Route Handlers, webhook routes  |
| SvelteKit              | ✅       | ✅         | —        | load functions, form actions, webhook endpoints |
| Nuxt                   | ✅       | ✅         | —        | Server routes, composables                      |
| Remix / TanStack Start | ✅       | ✅         | —        | Loaders, actions                                |
| Convex                 | —        | ✅         | ✅       | Reactive queries, mutations, actions, schema    |
| Supabase               | —        | (edge fns) | ✅       | Postgres + realtime + auth                      |
| Drizzle / Prisma       | —        | —          | ✅       | ORM only — needs a server runtime               |
| Firebase               | —        | ✅         | ✅       | Firestore + Cloud Functions                     |

### Layer Ownership — The Overlap Problem

**The ownership overlap is real and must be resolved per-combination**, not with
a universal rule. Key scenarios:

| Combination              | Backend Owner           | Why                                                                                                                                                                                                |
| ------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js + Supabase**   | Next.js                 | Supabase is DB-only. Next.js owns webhook routes, Server Actions, SSR.                                                                                                                             |
| **Next.js + Convex**     | **Convex**              | Convex insists on owning the backend (reactive mutations, actions, webhook handling). Next.js reduces to SSR/routing shell. Webhook routes go through Convex HTTP actions, not Next.js API routes. |
| **SvelteKit + Supabase** | SvelteKit               | Same as Next.js + Supabase. SvelteKit owns load functions, form actions, webhooks.                                                                                                                 |
| **SvelteKit + Convex**   | **Convex**              | Same as Next.js + Convex. SvelteKit handles SSR/load functions, but billing mutations/queries/webhooks are Convex-owned.                                                                           |
| **Next.js + Firebase**   | **Needs investigation** | Firebase Cloud Functions may want backend ownership similar to Convex. Or Next.js API routes could call Firebase directly. TBD.                                                                    |
| **Next.js + Drizzle**    | Next.js                 | Drizzle is ORM-only. Next.js owns everything server-side.                                                                                                                                          |

**Key insight**: The overlap problem primarily exists with “full-stack database”
platforms (Convex, Firebase, Appwrite) that want to own the backend. For
“database-only” integrations (Supabase, Drizzle, Prisma), the server runtime
framework always owns the backend.

This affects templates — `templates/nextjs-convex/` has a fundamentally
different architecture than `templates/nextjs-supabase/`. The ownership-aware
wiring is baked into each template at authoring time, not resolved at scaffold
time (see Stage 7.1 — scaffolding is routing, not generation).

### Proposed Directory Structure

```
packages/
├── core/                     # @creem/core
├── ui-react/                 # @creem/ui-react
├── ui-svelte/                # @creem/ui-svelte
├── integration-convex/       # @creem/convex
├── integration-supabase/     # @creem/supabase
├── integration-nextjs/       # @creem/nextjs
├── integration-sveltekit/    # @creem/sveltekit
├── integration-better-auth/  # @creem/better-auth
├── sdk/                      # creem (existing, Speakeasy-generated)
├── cli/                      # creem-cli
├── docs/                     # Mintlify docs
└── templates/
    ├── nextjs-supabase/
    ├── sveltekit-supabase/
    ├── nextjs-convex/
    └── sveltekit-convex/
```

> **Note**: Flat `packages/*` is fine for now. Can evolve to `packages/ui/`,
> `packages/integrations/`, `packages/templates/` later if the count exceeds
> ~15.

### Widget Component Hierarchy

![image.png](image%201.png)

**Implementation status**:

| Widget         | Status         | Blocker                                                                                                                                                                                                                                                            |
| -------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Subscription   | ✅ Implemented | —                                                                                                                                                                                                                                                                  |
| Product        | ✅ Implemented | —                                                                                                                                                                                                                                                                  |
| BillingGate    | ✅ Implemented | —                                                                                                                                                                                                                                                                  |
| BillingHistory | Can implement  | Transaction search API exists (`GET /v1/transactions/search`). Fields: amount, currency, type, status, periodStart/End, description. Sufficient for a basic history table.                                                                                         |
| Credits        | Can implement  | Customer Credits API exists and is complete, but Experimental. Needs an optional `credits` capability on `BillingContextValue` plus a webhook top-up pattern.                                                                                                      |
| PaymentMethods | ⚠️ Portal-only | **No API for payment method management.** Creem uses Stripe-hosted payment pages under the hood. The only option is redirecting to the Creem customer portal (`customers.generateBillingLinks`). No API for listing, adding, or removing payment methods directly. |
| Preferences    | ⚠️ Portal-only | **No API for billing preferences.** Customer entity only has `id`, `email`, `name`, `country`. No billing address, tax ID, or preference fields exposed. Portal redirect only.                                                                                     |

## 3. Terminology + Ownership Rules

### Terminology

To reduce naming confusion, this plan uses the following vocabulary:

- **UI packages** — `@creem/ui-react`, `@creem/ui-svelte`, and future
  `@creem/ui-vue`, `@creem/ui-solid`, etc. These are the reusable widget
  libraries.
- **Integration packages** — `@creem/convex`, `@creem/nextjs`,
  `@creem/sveltekit`, `@creem/supabase`, etc. These packages wire Creem into a
  runtime, data layer, or full-stack platform.
- **`<CreemProvider>`** — the framework-level provider component that injects
  the billing API into the widgets.
- **`BillingContextValue`** — the value exposed by `<CreemProvider>` to the UI
  widgets. This is the contract the widgets consume.
- **`CreemDatabaseIntegration`** — the persistence contract for database-only
  integrations such as Supabase, Drizzle, or Prisma.

### Provider Ownership Rule

Many integration packages may be capable of exposing a `<CreemProvider>`, but an
app must use **exactly one active provider owner**.

**Provider precedence:**

1. **Full-stack integration wins** — if the stack includes a platform that owns
   backend execution end-to-end, that integration owns the provider. Example:
   Convex.
2. **Otherwise, server runtime wins** — if the stack includes a runtime such as
   Next.js, SvelteKit, or Nuxt, that runtime owns the provider and talks to the
   underlying data integration.
3. **Otherwise, client/data integration wins** — if there is no server runtime,
   the client/data integration owns the provider. Example: React + Supabase
   only.

**Examples:**

- `react + supabase` → use the Supabase provider
- `react + nextjs + supabase` → use the Next.js provider
- `svelte + sveltekit + supabase` → use the SvelteKit provider
- `react + nextjs + convex` → use the Convex provider
- `svelte + sveltekit + convex` → use the Convex provider

This is one concept expressed at different stack layers, not competing concepts.
Templates and docs should always prewire the correct provider so the user
usually does not have to decide manually.

## Open Decisions

These decision blocks shape multiple domains and should be resolved before
committing to package names, public API contracts, or platform-dependent
implementation.

### D1 — Package Namespace

Creem owns `@creem_io` on npm (current integration packages) and the unscoped
`creem` name (SDK). Scoped packages require an `@scope` prefix — unscoped
patterns like `creem-convex` lack visual grouping and are not a real option.

| Option        | Example Packages                     | Pros                     | Cons                                                          |
| ------------- | ------------------------------------ | ------------------------ | ------------------------------------------------------------- |
| `@creem/*`    | `@creem/core`, `@creem/convex`       | Cleanest, shortest       | ❌ Need to verify if `@creem` npm org is available/obtainable |
| `@creem-io/*` | `@creem-io/core`, `@creem-io/convex` | ✅ Owned, mirrors domain | Longer, hyphen in scope                                       |

**Action**: Check if `@creem` npm org is available. If yes → use `@creem/*`. If
not → use `@creem-io/*`. The SDK (`creem`) keeps its bare name regardless.

### D2 — `creem_io` Wrapper SDK — Deprecate or Evolve?

The `creem_io` package is marked deprecated in `package.json` and prints a
console warning. It provides:

- A simpler `createCreem()` factory with `testMode` boolean instead of
  `serverIdx`
- Built-in webhook `handleEvents()` with signature verification + event
  routing + `onGrantAccess`/`onRevokeAccess` lifecycle hooks
- Framework-agnostic webhook handling (works with Express, Next.js, Fastify,
  etc.)

**The webhook handling and lifecycle hooks are genuinely useful** — the core SDK
(`creem`) does NOT have webhook verification or event routing built in. Every
integration currently reimplements this (nextjs, convex, better-auth).

**Options**:

- **A) Confirm deprecation**: Remove from workspace, all webhook logic lives in
  integration packages
- **B) Absorb value into `@creem/core`**: Extract webhook handling, lifecycle
  hooks, `createCreem()` convenience into core. Delete `creem_io` package.
- **C) Un-deprecate and rename**: If there’s user demand for a
  “batteries-included” SDK wrapper

**Recommended direction**: Move the useful parts of `creem_io` into
`@creem/core`: webhook verification, event routing, and lifecycle hooks. The
rest overlaps with the generated SDK and should not remain as a separate
long-term package. The only open question is whether the current deprecation
label reflects Creem's intended direction or needs to be revisited before
migration

### D3 — Framework + Integration Priority Order

Which UI frameworks and integration packages to prioritize affects the whole
ecosystem. The priority order should be grounded in real user-demand signals
from waitlist conversations, support, Discord, sales calls, and existing
customers.

**Proposed priority (UI Widgets)**:

| Priority | Framework    | Headless UI     | Notes                                             |
| -------- | ------------ | --------------- | ------------------------------------------------- |
| 🔴 P0    | React        | Ark UI          | Already implemented, extract from Convex          |
| 🔴 P0    | Svelte 5     | Ark UI          | Already implemented, extract from Convex          |
| 🟡 P1    | Vue 3        | Ark UI          | Ark UI has Vue support, large Nuxt ecosystem      |
| 🟡 P1    | Solid        | Ark UI          | Ark UI has Solid support, TanStack Start growing  |
| 🟢 P2    | React Native | TBD (no Ark UI) | High demand, completely different rendering model |
| 🟢 P2    | Angular      | TBD (no Ark UI) | Angular CDK, lower demand in indie SaaS           |

**Proposed priority (Integration Packages)**:

| Priority | Integration    | Type           | Notes                                  |
| -------- | -------------- | -------------- | -------------------------------------- |
| 🔴 P0    | Convex         | DB + Backend   | Already implemented, migrate           |
| 🔴 P0    | Supabase       | DB             | Most popular indie DB                  |
| 🔴 P0    | Next.js        | Server Runtime | Most popular React meta-framework      |
| 🟡 P1    | SvelteKit      | Server Runtime | Pairs with Svelte widgets              |
| 🟡 P1    | Better Auth    | Auth Plugin    | Already implemented, migrate           |
| 🟢 P2    | Drizzle        | DB (ORM)       | Growing, pairs with any server runtime |
| 🟢 P2    | Nuxt           | Server Runtime | Pairs with Vue widgets                 |
| 🟢 P2    | Prisma         | DB (ORM)       | Popular, pairs with any server runtime |
| ⚪ P3    | Firebase       | DB + Backend   | Overlap pattern similar to Convex      |
| ⚪ P3    | Appwrite       | DB + Backend   | Smaller ecosystem                      |
| ⚪ P3    | MongoDB        | DB             | Needs server runtime pairing           |
| ⚪ P3    | TanStack Start | Server Runtime | Pairs with React/Solid                 |
| ⚪ P3    | Remix          | Server Runtime | Niche but loyal community              |

### D4 — Feature Requests

These are API gaps and platform features that block or improve specific domains.

**P0 — Blocks Config-as-Code + Sync Engine:**

| #        | Request                                           | Status              | Why                                                                                   |
| -------- | ------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------- |
| FR-1     | `PUT /v1/products/:id` — update product           | ❌ Missing          | Cannot sync product config changes without this                                       |
| FR-2     | `POST /v1/products/:id/archive` — archive product | ❌ Missing          | Cannot remove products from config-as-code                                            |
| FR-3     | Product Bundle CRUD endpoints                     | ❌ Missing          | Bundles are config-as-code entities and pricing-widget grouping data, but have no API |
| FR-4     | `PUT /v1/discounts/:id` — update discount         | ❌ Missing          | Cannot sync discount changes without this                                             |
| ~~FR-5~~ | `~~GET /v1/discounts/search` — list discounts~~   | ✅ Resolved         | Now available in Creem API                                                            |
| FR-7     | `updatedAt` field on all entities                 | ⚠️ Confirmed coming | Needed for snapshot-based change detection in sync engine                             |

**P1 — Enhances Sync Engine (not hard blockers):**

| #    | Request                                                                  | Status     | Why                                                                                                                                                                                                                                                                       |
| ---- | ------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-6 | Change History / Audit Log API (full spec in §5.4, incl. `source` field) | ❌ Missing | Enables efficient drift detection via cursor-based polling instead of full snapshot comparison. Not a hard prerequisite — `updatedAt`-based snapshot diffing works without it, but the Change History API enables `creem dev` live sync mode and enterprise audit trails. |
| FR-8 | ACID batch mutation endpoint (see D6 Option C)                           | ❌ Missing | Could make `creem deploy` truly atomic — depends on Creem’s database architecture                                                                                                                                                                                         |

**P1 — Widget Completeness + Product Modeling Gaps:**

| #     | Request                                                                                 | Status     | Why                                                                                                                                                                                                                                                                                                |
| ----- | --------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-9  | Product bundles for one-time products, with upgrade pricing (delta or full replacement) | ❌ Missing | Currently bundles only exist for subscriptions — one-time products (e.g., Figma kits) can’t offer upgrade paths                                                                                                                                                                                    |
| FR-10 | Trial metadata in `/v1/products`                                                        | ❌ Missing | Trial information exists in webhook events but not product API responses. Pricing widgets need this upfront to render trial labels and distinguish real trial states from payment/pending states. Featurebase: https://creem.featurebase.app/p/expose-trial-information-and-duration-in-v1products |
| FR-11 | Bundle relationships exposed via API                                                    | ❌ Missing | Dynamic pricing widgets need product-to-bundle relationships without hardcoded product mappings. Featurebase: https://creem.featurebase.app/p/get-bundles-from-api                                                                                                                                 |

**Why these matter for UI widgets:**

- `<Subscription>` and pricing widgets need trial metadata to render correct
  trial labels before checkout and to interpret `trialing` state accurately.
- Bundle relationships are needed for fully dynamic pricing tables without
  hardcoding product mappings in app code.
- `<Product>` is not just a product card renderer. For one-time products, the
  strongest flows are often upgrade paths: e.g., buy a base Figma kit, then
  later upgrade to a pro kit by paying the delta or replacing the prior
  purchase. Without one-time product bundles and upgrade pricing, the Product
  widget can show products and initiate checkout, but it cannot support the full
  upgrade UX that makes one-time digital goods feel first-class.

### D5 — Monorepo Structure — When to Nest?

Keep flat `packages/*` while the first UI and integration packages are still
being extracted. When package count exceeds ~12, restructure to nested
`packages/ui/`, `packages/integrations/`, `packages/templates/`. Low priority —
can be decided when the package graph is real instead of theoretical.

### D6 — Non-Atomic Deploy Strategy

`creem deploy` executes N API calls to update N entities. Unlike Git merge
(atomic), if call 5 of 10 fails, the deploy is partial. This needs a deliberate
strategy.

**Option A — Accept partial deploys + manual rollback (simple)**

- On failure: log which changes succeeded/failed/pending
- Offer `creem deploy --resume` to retry from the failure point
- To rollback: developer manually reverts via dashboard or CLI
- **Pros**: Zero implementation overhead, ships faster
- **Cons**: Partial state during failure, manual cleanup

**Option B — Dry-run + automatic rollback (robust)**

- `creem deploy --dry-run` shows the full plan without executing
- On failure mid-deploy: automatically reverse successful changes back to their
  BASE values (from `.creem/state.json`)
- **Pros**: Safe deploys, no partial state
- **Cons**: More implementation work, rollback can itself fail

**Option C — ACID batch endpoint (ideal, requires Creem platform support)**

- If Creem’s backend uses an ACID database and mutations run inside transaction
  scopes (like Convex functions do), a single **batch mutation endpoint** could
  accept all N changes in one API call — all-or-nothing, automatic rollback on
  failure at the database level.
- This would make `creem deploy` truly atomic, eliminating the non-atomic
  problem entirely.
- **Pros**: True atomicity, zero partial state, no CLI-side rollback complexity
- **Cons**: Requires Creem platform to build a batch endpoint; not all
  databases/architectures support this
- **Open architecture question**: Does Creem's persistence layer support
  transactional batch mutations across products, bundles, and discounts? If yes,
  a batch mutation endpoint is the cleanest long-term solution for atomic
  deploys. If not, the CLI should assume non-atomic deploys and provide dry-run,
  progress logging, and resume behavior.

**How dry-run works (implementation complexity: low):**

The 3-way merge algorithm (§5.3) already computes the full diff before executing
any API calls. `--dry-run` simply stops after the diff computation and displays
the plan:

```
creem deploy --dry-run

  Would CREATE  product "Enterprise Plan" ($99/mo)
  Would UPDATE  product "Pro Plan" price $19 → $29
  Would ARCHIVE product "Legacy Plan"
  Would UPDATE  discount "LAUNCH20" percentage 20% → 15%

  4 changes to production. Run `creem deploy` to execute.
```

This is essentially an `if (!dryRun)` guard around the execution loop — the
merge computation already happens regardless. No Creem API support needed; it’s
purely CLI-side.

**How rollback works (implementation complexity: medium):**

Before executing, save each entity’s current production state as a rollback
snapshot. Track each API call in a transaction log:

```
[1/4] CREATE product "Enterprise Plan"   ✅ → rollback: archive prod_xyz
[2/4] UPDATE product "Pro Plan"          ✅ → rollback: revert price to $19
[3/4] ARCHIVE product "Legacy Plan"      ❌ FAILED (500 — internal server error)
[4/4] SKIPPED — aborting due to failure

Rolling back 2 successful changes...
[2/2] REVERT product "Pro Plan" price → $19    ✅
[1/2] ARCHIVE product "Enterprise Plan"        ✅
Deploy rolled back cleanly.
```

Note: archiving a product with active subscriptions is expected to succeed
(industry standard: existing subscriptions continue, only new purchases are
blocked). Partial deploy failures are more likely caused by network issues, rate
limits, or server errors — not business logic rejections. The challenge: what if
the rollback itself fails? (cascading failure). Mitigation: log everything,
always show the exact state, let the developer intervene.

**Recommended direction**: First validate whether Creem's backend can support
ACID batch mutations. If yes, Option C should become the target because it
removes partial deploy risk at the platform level. If not, start with Option A —
partial deploys with clear logs, `--resume`, and dry-run — because it ships
quickly and keeps the implementation simple. Automatic rollback can be added
later if partial deploys become a real operational problem.

## How to Read the Stages

The stages below are **domain chapters**, not a waterfall roadmap.

Each stage describes:

- the target state for that part of the ecosystem
- the real decisions, platform capabilities, or design inputs needed to
  implement it
- the package/API/docs surface that should exist when the domain is mature

The implementation order is defined separately in **MVP Validation Stream**. In
practice, Stages 1, 2, 3, and the first Stage 7 templates should be developed
together because each one exposes different integration risks. The stage numbers
are there to make the system understandable, not to force a strict build
sequence.

## Stage 0 — Foundation: Monorepo Restructure + Core Extraction

**Goal**: Extract `@creem/core` from `packages/convex/src/core` +
`webhook-types` + design system + webhook handler. Establish the shared
UI/integration contract. Plan namespace migration.

### Open Inputs

- **D1 — Package namespace**: needed before public package publishing
- **D2 — `creem_io` fate**: needed before finalizing what moves into
  `@creem/core`

### 0.1 — Extract `@creem/core`

Move the following from `packages/convex/src/core/` into a new `packages/core/`
package:

| Source                           | Target in `@creem/core`                                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/core/types.ts`              | `src/types.ts` — PlanCatalog, BillingSnapshot, SubscriptionSnapshot, etc.                                       |
| `src/core/catalog.ts`            | `src/catalog.ts`                                                                                                |
| `src/core/resolver.ts`           | `src/resolver.ts`                                                                                               |
| `src/core/selectors.ts`          | `src/selectors.ts`                                                                                              |
| `src/core/payments.ts`           | `src/payments.ts`                                                                                               |
| `src/core/pendingCheckout.ts`    | `src/pendingCheckout.ts`                                                                                        |
| `src/core/subscriptionUpdate.ts` | `src/subscriptionUpdate.ts`                                                                                     |
| `src/core/markdown.ts`           | `src/markdown.ts`                                                                                               |
| All `*.test.ts` files            | `src/__tests__/`                                                                                                |
| `packages/webhook-types/src/*`   | `src/webhooks/` — types, normalization, type guards                                                             |
| `creem_io` webhook handler       | `src/webhooks/handler.ts` — signature verification, event routing, onGrantAccess/onRevokeAccess lifecycle hooks |
| `src/design-system/`             | `src/design-system/`                                                                                            |
| `src/library.css`                | `src/styles.css`                                                                                                |

Exports:

```
@creem/core           → types, catalog, resolver, selectors, payments, markdown
@creem/core/webhooks  → webhook event types, normalization, type guards, handler, lifecycle hooks
@creem/core/styles    → CSS design system (Tailwind tokens + component styles)
```

### 0.2 — Define the UI Contract

The critical abstraction that decouples UI widgets from backends. Three types
form the billing data model:

- **`ConnectedBillingModel`** — The reactive data model: products, current
  subscription, customer info, plan catalog. This is the billing state that
  changes over time. Widgets observe it; integration providers populate it from
  their data layer.
- **`BillingContextValue`** — The full API surface that UI widgets consume:
  `ConnectedBillingModel` + action methods (`createCheckout`,
  `cancelSubscription`, etc.) + loading/error state. Each integration package
  implements a `<CreemProvider>` that supplies this via framework-specific
  context mechanisms.
- **`BillingSnapshot`** — A non-reactive, serializable point-in-time capture of
  `ConnectedBillingModel`. Used for server-side rendering (pass billing state
  without hydration) and config-as-code comparisons (diff local vs remote
  billing state).

```tsx
// @creem/core/src/billing-context.ts

/**
 * Integration-agnostic billing context consumed by UI widgets.
 * Each integration package (Convex, Supabase, Next.js, etc.) may implement a provider
 * that supplies this context via framework-specific context/store mechanisms.
 */
export interface BillingContextValue {
  /** Reactive billing model — widgets observe this for state changes. */
  model: ConnectedBillingModel | null;
  /** Loading state. */
  isLoading: boolean;
  /** Error state. */
  error: Error | null;

  /**
   * Create a checkout session from a stable local product key.
   * The provider resolves this to the environment-specific Creem product ID.
   */
  createCheckout(
    productKey: string,
    opts?: {
      successUrl?: string;
      units?: number;
      discountCode?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<{ url: string }>;

  /** Update subscription (plan switch, seat change, interval change). */
  updateSubscription(opts: {
    productKey?: string;
    units?: number;
    updateBehavior?: UpdateBehavior;
  }): Promise<void>;

  /** Cancel current subscription. */
  cancelSubscription(): Promise<void>;

  /** Resume paused or scheduled-cancel subscription. */
  resumeSubscription(): Promise<void>;

  /** Get customer billing portal URL. */
  getPortalUrl(): Promise<{ url: string }>;

  /** Trigger a refresh (for polling-based integrations). No-op for reactive integrations. */
  invalidate(): void;
}
```

Provider ownership follows the precedence rule from §3: full-stack integration →
server runtime integration → client/data integration.

Widget and app code should pass stable local product keys, not
environment-specific remote product IDs. Integration providers resolve those
keys through `planCatalog`, `creem.config.ts`, or imported remote state before
calling the Creem API. This keeps the UI contract compatible with test/live
environments where the same product has different remote IDs.

Potential provider surfaces (using `@creem/*` naming as example — see D1 for
namespace decision):

- `@creem/convex/react` → `<CreemProvider>` using
  `useQuery`/`useMutation`/`useAction`
- `@creem/convex/svelte` → `<CreemProvider>` using `useQuery` from
  `convex-svelte`
- `@creem/supabase/react` → `<CreemProvider>` using Supabase client + React
  hooks for client-only stacks such as React + Supabase
- `@creem/nextjs` → `<CreemProvider>` using Server Actions + `useTransition` (no
  `/react` subpath needed — Next.js IS React)

Examples:

- `react + supabase` → use the Supabase provider
- `react + nextjs + supabase` → use the Next.js provider
- `svelte + sveltekit + supabase` → use the SvelteKit provider
- `react + nextjs + convex` → use the Convex provider

### 0.3 — Namespace Migration

Target namespace depends on D1 decision:

| Current                   | `@creem/*`              | `@creem-io/*`           |
| ------------------------- | ----------------------- | ----------------------- |
| `@creem_io/convex`        | `@creem/convex`         | `@creem-io/convex`      |
| `@creem_io/nextjs`        | `@creem/nextjs`         | `@creem-io/nextjs`      |
| `@creem_io/better-auth`   | `@creem/better-auth`    | `@creem-io/better-auth` |
| `@creem_io/webhook-types` | Absorbed into core      | Absorbed into core      |
| `creem` (SDK)             | Stays `creem`           | Stays `creem`           |
| `creem-cli`               | Stays `creem-cli`       | Stays `creem-cli`       |
| `creem_io`                | Absorbed into core (D2) | Absorbed into core (D2) |

**Deliverables**: Core package published, UI contract defined, namespace
migration plan documented.

## Stage 1 — Integration Interfaces + First Integrations (Next.js + Supabase + SvelteKit)

**Goal**: Build the first non-Convex integrations to validate the contract from
a clean slate. Starting with Next.js + Supabase (most common indie stack) forces
the abstraction to be right before migrating the existing Convex integration.

> **Paired workstream**: Stage 1 and Stage 2 are designed to be developed
> together. Stage 1 validates the integration/runtime side of the contract;
> Stage 2 ports the widgets onto the same contract. Neither stage is fully
> convincing in isolation.

### Open Inputs

- **Shared billing contract draft**: `BillingContextValue`,
  `ConnectedBillingModel`, and webhook normalization need to be stable enough to
  implement against. They do not need to be published before local package work
  begins.
- **D1 — Package namespace**: needed before publishing the integration packages.
- **Creem SDK (`creem`) available**: current SDK is enough for checkout,
  subscriptions, transactions, customers, and webhooks.

### 1.1 — `@creem/supabase` (Database Integration)

Responsibilities:

- **Webhook ingestion** → Upsert products, customers, subscriptions, orders into
  Supabase tables
- **Billing queries** → `getBillingModel(userId)`, `getBillingSnapshot(userId)`
- **Subscription management** → Wraps SDK calls (`cancelSubscription`,
  `resumeSubscription`, etc.)
- **Checkout creation** → Wraps SDK `checkouts.create`

```tsx
// packages/integration-supabase/src/index.ts
import { createClient } from "@supabase/supabase-js";
import { Creem } from "creem";

export function createCreemSupabase(config: {
  supabaseUrl: string;
  supabaseKey: string;
  creemApiKey: string;
  creemWebhookSecret: string;
  planCatalog?: PlanCatalog;
}) { ... }
```

Subpath exports:

- `@creem/supabase` → Server-side: webhook handler, billing queries, mutations
- `@creem/supabase/react` → `<CreemProvider>` that uses Supabase realtime +
  React context
- `@creem/supabase/svelte` → `<CreemProvider>` that uses Supabase realtime +
  Svelte stores

### 1.2 — `@creem/nextjs` (Server Runtime Integration)

Responsibilities:

- **Webhook route handler** → `app/api/creem/route.ts` helper
- **Server Actions** → `createCheckout`, `cancelSubscription`, etc.
- **Billing queries** → Server Components that fetch billing state
- **Session resolution** → Map auth session to Creem customer

Must pair with a database integration (Supabase, Drizzle, Prisma) for
persistence.

```tsx
// packages/integration-nextjs/src/index.ts
export function createCreemNextjs(config: {
  database: CreemDatabaseIntegration; // Supabase, Drizzle, Prisma, etc.
  creemApiKey: string;
  creemWebhookSecret: string;
  resolveUserId: (request: Request) => Promise<string | null>;
}) { ... }
```

### 1.3 — `@creem/sveltekit` (Server Runtime Integration)

Same pattern as Next.js but for SvelteKit:

- **Webhook endpoint** → `src/routes/api/creem/+server.ts`
- **Load functions** → Billing state in `+page.server.ts`
- **Form actions** → Checkout creation, subscription management
- **Session resolution** → Via `event.locals`

### 1.4 — Database Interface

For integrations like Drizzle/Prisma that are database-only (no server runtime):

```tsx
// @creem/core/src/database-integration.ts
export interface CreemDatabaseIntegration {
  upsertProduct(product: NormalizedProductEntity): Promise<void>;
  upsertCustomer(customer: NormalizedCustomerEntity): Promise<void>;
  upsertSubscription(sub: NormalizedSubscriptionEntity): Promise<void>;
  upsertOrder(order: NormalizedOrderEntity): Promise<void>;
  getBillingModel(userId: string): Promise<ConnectedBillingModel>;
  getBillingSnapshot(userId: string): Promise<BillingSnapshot>;
}
```

### 1.5 — Testing Strategy

- **Unit tests**: In each integration package (`packages/integration-supabase/`,
  `packages/integration-nextjs/`, etc.)
- **E2E / integration tests**: In template projects
  (`packages/templates/nextjs-supabase/`) which are the natural cross-boundary
  integration point. Templates import the real integration + UI widget packages
  and test the full flow: webhook → DB upsert → billing model query → widget
  rendering → checkout creation.

This approach is clean because:

- Unit tests stay close to the code they test
- E2E tests live where all the packages naturally compose (the template IS the
  integration)
- CI runs template E2E tests after all package builds succeed
- **The test chain IS the versioning enforcement**: a breaking change in
  `@creem/core` fails downstream package tests, which fails template E2E tests,
  which blocks publish. Changesets coordinate version bumps across affected
  packages as part of the same PR.

**Deliverables**: `@creem/supabase`, `@creem/nextjs`, `@creem/sveltekit`
packages with unit tests. `templates/nextjs-supabase` with E2E tests. Database
interface validated.

## Stage 2 — UI Widgets (React + Svelte)

**Goal**: Extract UI widgets from `packages/convex` into standalone,
integration-agnostic `@creem/ui-react` and `@creem/ui-svelte` packages.

> **Paired workstream**: Stage 2 is built alongside Stage 1. The widgets need
> real integration packages to validate the contract, and the integration
> packages need real widget consumers to prove the provider shape.

### Open Inputs

- **Shared UI contract draft**: widgets need `BillingContextValue` and
  `ConnectedBillingModel` from the foundation domain.
- **At least one real integration workstream**: widgets should be validated
  against live provider implementations, not only mocked data.
- **D3 — UI framework priority**: React and Svelte are the obvious first
  extractions, but real user-demand signals should guide what comes next.

### 2.1 — Decouple from Convex

Current coupling points in widgets:

1. `ConnectedBillingApi` uses `FunctionReference<"query">` from `convex/server`
2. `SubscriptionRoot.svelte` calls `useConvexClient()` and `useQuery()` from
   `@mmailaender/convex-svelte`
3. `SubscriptionRoot.tsx` calls `useQuery()` and `useMutation()` from
   `convex/react`

**Solution**: Widgets consume `BillingContextValue` (from Stage 0.2) via
framework context instead of Convex function references directly.

```tsx
// @creem/ui-react — widgets consume context
import { useCreemBilling } from "@creem/ui-react";

function SubscriptionRoot() {
  const billing = useCreemBilling(); // BillingContextValue from context
  // billing.model, billing.createCheckout, etc.
}
```

```
<!-- @creem/ui-svelte — widgets consume context -->
<script lang="ts">
  import { getCreemBilling } from "@creem/ui-svelte";
  const billing = getCreemBilling(); // BillingContextValue from Svelte context
</script>
```

### 2.2 — Package Structure

```
packages/ui-react/
├── src/
│   ├── context.tsx              # CreemProvider, useCreemBilling
│   ├── primitives/              # BillingToggle, PricingCard, CheckoutButton, ...
│   ├── widgets/                 # Subscription, Product, BillingPortal, ...
│   │   ├── Subscription.tsx     # Compound: Subscription.Root, .Item, .ItemTitle, etc.
│   │   ├── Product.tsx
│   │   ├── BillingPortal.tsx
│   │   ├── BillingHistory.tsx
│   │   ├── PaymentMethods.tsx
│   │   ├── Preferences.tsx
│   │   └── Credits.tsx
│   └── index.tsx
├── package.json                 # peerDeps: react, @ark-ui/react, @creem/core
└── tsconfig.json
```

Same structure for `packages/ui-svelte/`. Subpath exports
(`@creem/ui-react/Subscription`, `@creem/ui-react/Product`, etc.) enable
per-widget tree-shaking — apps only bundle the widgets they import.

### 2.3 — Widget Hierarchy Implementation

Based on the Figma diagram (image 2):

**Level 1** — Top-level compound components:

- `<Subscription>` — Plan selection, billing toggle, pricing cards
- `<Product>` — One-time product listings with upgrade paths
- `<BillingHistory>` — Transaction history table (subscriptions → usage-based)
- `<Credits>` — Credit balance, history, purchase, and spend flows
- `<PaymentMethods>` — Card management (portal wrapper now, inline API later)
- `<Preferences>` — Billing email, business address, tax ID (portal wrapper now,
  inline API later)
- `<BillingGate>` — Conditional rendering based on billing state

**Level 2** — Subscription.Item compound:

- `<Subscription.Item>` — Individual plan card container

**Level 3** — Granular sub-components:

- `<Subscription.ItemTitle>` — Plan name
- `<Subscription.ItemPrice>` — Price display with interval
- `<Subscription.ItemDescription>` — Feature list / description
- `<Subscription.ItemCTA>` — Subscribe / Switch / Current plan button
- `<Subscription.ItemBadge>` — Status badges (Current, Popular, etc.)

### 2.4 — New Widgets

| Widget           | Approach                                                                                   | API Dependency                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `BillingHistory` | Full implementation — render transaction table from `transactions.search`                  | ✅ Transaction search API exists                                                                                     |
| `Credits`        | Credit balance display, transaction history, buy-credits checkout flow, spend confirmation | ✅ Customer Credits API exists, but Experimental. See §2.4.1.                                                        |
| `PaymentMethods` | “Manage payment methods” button → opens Creem customer portal                              | ✅ Portal URL generation exists. ❌ No direct payment method API.                                                    |
| `Preferences`    | “Manage billing details” button → opens Creem customer portal                              | ✅ Portal URL generation exists. ❌ No direct preference API (no billing address, tax ID fields on customer entity). |

> **Future**: When Creem exposes payment method and customer preference APIs,
> those widgets can be upgraded to inline editing. For now, they are thin
> portal-redirect wrappers — still valuable as they give a consistent in-app
> experience.

### 2.4.1 — Customer Credits Widgets

Creem’s Customer Credits API (released April 2026, Experimental) provides a full
server-side ledger: accounts, credit/debit/reverse transactions, balance
queries, entry history, and account lifecycle (freeze/unfreeze/close). This
unlocks a new category of UI widgets for credit/unit-based products, AI usage,
prepaid wallets, loyalty points, and internal balances.

| Widget               | Description                                                                                             | API Operations Used                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `<Credits.Balance>`  | Current balance display with unit label (“742 credits”, “1,200 gems”)                                   | `getBalance`                                            |
| `<Credits.History>`  | Paginated transaction history showing credits/debits with references and timestamps                     | `listEntries`                                           |
| `<Credits.Purchase>` | Buy-credits flow: select credit pack → checkout → credit account top-up on `checkout.completed` webhook | `createCheckout` + server-side webhook top-up           |
| `<Credits.Spend>`    | Inline spend confirmation (“Use 10 credits for this action?”) with insufficient-balance handling        | Integration-owned server action/mutation + `getBalance` |

These can follow the same compound component pattern: `<Credits>` as the root
with `<Credits.Balance>`, `<Credits.History>`, `<Credits.Purchase>`,
`<Credits.Spend>` as children.

**Integration contract extension** — `BillingContextValue` (§0.2) gets an
optional `credits` capability. This stays inside the existing `<CreemProvider>`
architecture; credit widgets should not require a second app-level provider.

```tsx
// Optional capability on BillingContextValue for credit-based billing
interface BillingContextValue {
  // existing billing fields/actions...
  credits?: CreditContext;
}

interface CreditContext {
  /** Current balance for the active credit account. */
  balance: string | null;
  /** Unit label ("credits", "gems", "points"). */
  unitLabel: string;
  /** Whether balance is loading. */
  isLoading: boolean;
  /** Buy a credit pack via checkout. Provider resolves productKey to remote product ID. */
  purchaseCredits(
    productKey: string,
    opts?: {
      successUrl?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<{ url: string }>;
  /** Spend credits through an integration-owned server action/mutation. */
  spendCredits(opts: {
    amount: string;
    reference: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
  /** Fetch balance (for polling-based integrations). */
  refreshBalance(): Promise<void>;
  /** Fetch paginated entry history. */
  getEntries(opts?: {
    limit?: number;
    cursor?: string;
  }): Promise<CreditEntry[]>;
}
```

**Key design decisions:**

- `<CreemProvider>` remains the single integration boundary. Integration
  packages add `credits` when the stack supports credit accounts.
- Credit widgets should render a clear unsupported/not-configured state when
  `billing.credits` is absent.
- Amounts are **strings** (Creem API uses strings to avoid overflow — credits
  can be very large numbers)
- Client-facing widgets should not expose raw ledger mutations.
  `purchaseCredits` creates checkout, `spendCredits` calls an integration-owned
  server action/mutation, and raw `credit` / `debit` / `reverse` operations stay
  server-side.
- Every ledger write still needs an `idempotency_key`; integration packages
  should generate sensible defaults for server-side writes and allow explicit
  overrides where needed.
- The purchase flow links Creem products (credit packs) to credit account
  top-ups via the `checkout.completed` webhook — this is a new webhook handler
  pattern
- Account lifecycle (freeze/unfreeze/close) and direct ledger repair operations
  are admin/server concerns, not widget concerns

**Reference implementation**: The `_source/nextjs-supabase-boilerplate` already
has a working credits feature (`CreditsBalanceCard`, `TransactionHistory`,
`useCredits`, `spendCredits`) using local Supabase storage. The Creem-native
version replaces the local ledger with Creem’s Customer Credits API, removing
the need for custom database tables and race-condition handling.

**Domain requirement**: Credit widgets require integration-package support for
the optional `credits` capability inside `BillingContextValue`. They do not
introduce a second provider; `<CreemProvider>` remains the only provider the app
has to choose.

### 2.5 — Design System

- `@creem/core/styles` provides the CSS design tokens
- UI packages import tokens and define component-level styles
- Consumers: `@import "@creem/ui-react/styles"` or
  `@import "@creem/ui-svelte/styles"`
- Each UI package bundles `@creem/core/styles` automatically (no separate import
  needed)

**Target deliverables**: `@creem/ui-react` and `@creem/ui-svelte` as standalone
packages. All existing widgets migrated. BillingHistory, PaymentMethods,
Preferences, and Credits widget families defined. Compound component API
preserved. Optional credits capability documented.

## Stage 3 — Convex Integration Migration

**Goal**: Migrate `packages/convex` to use `@creem/core` and `@creem/ui-*`. This
is the acid test — if the abstraction works for Convex’s unique reactive model,
it works for everything.

### Open Inputs

- **Shared provider contract stable enough to migrate Convex**: the contract
  does not need to be perfect, but it must be stable enough that Convex does not
  churn every week.
- **Existing Convex example apps**: these become regression targets for the
  migration.
- **Provider ownership rule**: Convex must remain the backend owner when paired
  with Next.js or SvelteKit.

**Backend ownership**: Convex owns everything — webhook routes (via HTTP
actions), billing mutations, billing queries, data persistence. When paired with
Next.js or SvelteKit, the meta-framework is reduced to SSR/routing/load
functions only.

### 3.1 — `@creem/convex` Package

What remains integration-specific:

- **Convex component** (`src/component/`) — schema, webhook handler, Convex
  functions
- **Client class** (`src/client/`) — Creem class that wraps Convex
  queries/mutations/actions
- **Provider subpaths** — `@creem/convex/react`, `@creem/convex/svelte`

```
packages/integration-convex/
├── src/
│   ├── component/          # Convex component (schema, functions)
│   ├── client/             # Creem class, parsers, helpers
│   ├── react/              # <CreemConvexProvider> (~80 LOC)
│   ├── svelte/             # <CreemConvexProvider> (~80 LOC)
│   └── index.ts
├── convex.config.ts
└── package.json            # deps: @creem/core, creem; peerDeps: convex
```

### 3.2 — Provider Implementation (~80 LOC each)

```tsx
// @creem/convex/react — provider that bridges Convex → BillingContextValue
import { useQuery, useMutation, useAction } from "convex/react";
import { CreemProvider } from "@creem/ui-react";

export function CreemConvexProvider({ api, children }) {
  const model = useQuery(api.uiModel, {});
  const createCheckoutAction = useAction(api.checkouts.create);
  // ... wire all BillingContextValue methods to Convex functions
  return <CreemProvider value={billing}>{children}</CreemProvider>;
}
```

### 3.3 — Migration Path

1. `@creem/convex` depends on `@creem/core` (not bundled copy)
2. `@creem/convex` peer-depends on `@creem/ui-react` and/or `@creem/ui-svelte`
3. Examples updated: `example-react/`, `example-svelte/` import from new
   packages
4. Old `packages/convex` deprecated with major version bump + migration guide

**`ConnectedBillingModel` Breaking Change**: The current type was designed for
Convex. Key changes needed for core:

- Replace `user._id` with `user.id` (Convex convention → generic)
- Keep `allProducts` — needed for pricing pages
- Keep `activeSubscriptions` — needed for multi-subscription scenarios

This must be documented in the migration guide with before/after examples.

**Deliverables**: `@creem/convex` validated against existing example apps.
Migration guide written (including `ConnectedBillingModel` shape change). Old
package deprecated.

## Stage 4 — CLI Coverage Parity

**Goal**: Bring CLI to full parity with SDK and Dashboard where API allows. No
new Creem API endpoints needed — this stage only adds CLI commands for
operations the SDK already supports.

### Open Inputs

- **Creem SDK (`creem`) available with all current endpoints**: this domain only
  adds commands for API operations that already exist.
- **Shared types where useful**: CLI commands can use core/config types once
  available, but CLI parity for existing endpoints does not need to wait for the
  full ecosystem.

### How SDK/CLI Extensibility Works

The `creem` SDK is **Speakeasy-generated** from `openapi.json`. Every file has
`DO NOT EDIT`. The generation process:

1. Creem team updates their API
2. `openapi.json` is updated (manually or auto-generated from the API)
3. `speakeasy generate` regenerates the entire `packages/creem-sdk/` package
4. New endpoints appear as new methods on the SDK classes

**To add missing endpoints (e.g., product update)**:

- The Creem API team must build the endpoint first
- Then `openapi.json` gets the new path
- Then Speakeasy regenerates the SDK
- Then the CLI can add the command

There is **no shortcut** — we cannot add SDK methods for endpoints that don’t
exist on the API. The CLI depends on the SDK which depends on the API.

### 4.1 — CLI Coverage Gaps (API exists, CLI command missing)

These can be implemented immediately:

| Command                            | SDK Method                        | Effort |
| ---------------------------------- | --------------------------------- | ------ |
| `creem subscriptions update <id>`  | `creem.subscriptions.update()`    | Low    |
| `creem subscriptions upgrade <id>` | `creem.subscriptions.upgrade()`   | Low    |
| `creem licenses activate`          | `creem.licenses.activate()`       | Low    |
| `creem licenses validate`          | `creem.licenses.validate()`       | Low    |
| `creem licenses deactivate`        | `creem.licenses.deactivate()`     | Low    |
| `creem stats summary`              | `creem.stats.getMetricsSummary()` | Low    |
| `creem discounts list`             | `creem.discounts.list()`          | Low    |

### 4.2 — Why Config-as-Code Is NOT in This Stage

Previous versions of this plan (v4 and earlier) included `creem.config.ts` as
part of Stage 4. After careful analysis (see v5 changelog), we concluded that
**a config file has no unique value until it can serve as the real, living
source of truth with full sync capabilities**.

The two interim values a config file could offer are:

1. **Batch bootstrapping** — creating multiple products at once. This is
   adequately solved by a good `Skill.md` file + the existing CLI
   `creem products create` command.
2. **Type-safe product references in app code** — importing product IDs/keys
   from a typed config. This is already solved by `planCatalog` in the
   integration packages (e.g., `@creem/convex`), which provides typed product
   definitions without requiring a separate config file.

Neither justifies shipping a config file that would be:

- **Brittle** — without product update/archive APIs (FR-1, FR-2), the file can
  only create entities, not sync them. Any dashboard edit makes the file stale.
- **Misleading** — developers would reasonably expect `creem.config.ts` to be
  authoritative, but it cannot be until the sync engine exists.
- **Environment-inconsistent** — test and production have different entity IDs.
  Without `.creem/state.json` bindings and the full sync workflow, the config
  file cannot track this.

**The config file ships with Stage 5**, where it becomes a living document with
change history, drift detection, and real sync — not a fragile convenience
layer.

**Deliverables**: CLI commands for all API-supported operations (subscriptions
update/upgrade, licenses activate/validate/deactivate, stats summary, discounts
list). Full CLI ↔︎ SDK parity for existing endpoints.

## Stage 5 — Config-as-Code + Sync Engine

**Goal**: Introduce `creem.config.ts` as a living, authoritative source of truth
for billing configuration. Ship it together with the full push/pull/deploy sync
workflow — not before. The config file only exists when it can actually be kept
in sync with Creem’s test and production environments.

This stage also delivers `creem dev` — a live bidirectional sync mode similar to
`npx convex dev`, test-only.

### Why Config-as-Code Lives Here (Not in Stage 4)

Previous plan versions (v4 and earlier) split config-as-code into Stage 4
(create-only config) and Stage 5 (two-way sync). After analyzing Autumn’s
approach and evaluating the interim value honestly, we merged them. See §4.2 for
the full reasoning. The short version:

- **A config file without sync is misleading** — it suggests authority it cannot
  enforce.
- **Autumn’s `autumn.config.ts` suffers the same problem today** — `atmn pull`
  does full file regeneration (string builders + Prettier + `fs.writeFileSync`
  overwrite), and `atmn push` pushes changes to the API. But there is no drift
  detection, no change history, no conflict resolution. If someone edits the
  dashboard after a push, the config file is silently stale. This is acceptable
  for Autumn’s simpler model (single environment), but Creem has test +
  production with different entity IDs — the stakes for consistency are higher.
- **The workarounds for interim value already exist** — `planCatalog` provides
  typed product references in app code, and CLI + `Skill.md` handle batch
  bootstrapping.
- **Shipping the config file with the sync engine means it arrives as a real
  tool, not a half-measure.**

### Platform Requirements — Hard Blockers

| Required from Creem Platform              | Status              | Notes                                      |
| ----------------------------------------- | ------------------- | ------------------------------------------ |
| `PUT /v1/products/:id` (update)           | ❌ Missing          | Cannot sync config changes without this    |
| `POST /v1/products/:id/archive` (archive) | ❌ Missing          | Cannot remove products from config         |
| Product Bundle CRUD endpoints             | ❌ Missing          | Bundles are config entities with no API    |
| `PUT /v1/discounts/:id` (update)          | ❌ Missing          | Cannot sync discount changes               |
| `updatedAt` field on all entities         | ⚠️ Confirmed coming | Needed for snapshot-based change detection |

### Nice-to-Have (Enhances Stage 5, Not Hard Blockers)

| Required from Creem Platform      | Status       | Notes                                                                                                                                                                    |
| --------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Change History / Audit Log API    | ❌ Missing   | Enables cursor-based `creem dev` live polling + enterprise audit trail. Without it, sync relies on `updatedAt` snapshot diffing (slower, less granular, but functional). |
| ACID batch mutation endpoint      | ❌ Missing   | Makes `creem deploy` truly atomic. Without it, we use Option A/B from D6.                                                                                                |
| `GET /v1/discounts/search` (list) | ✅ Available | Resolved — now in Creem API                                                                                                                                              |

### 5.1 — `creem.config.ts` — Declarative Billing Configuration

```tsx
// creem.config.ts
import {
  defineConfig,
  product,
  productBundle,
  discount,
} from "creem-cli/config";

export const proMonthly = product({
  key: "pro-monthly", // stable local key committed to Git
  name: "Pro Plan",
  description: "Everything you need",
  price: 1999,
  currency: "USD",
  billingType: "recurring",
  billingPeriod: "every-month",
  taxCategory: "saas",
  taxMode: "exclusive",
});

export const proYearly = product({
  key: "pro-yearly",
  name: "Pro Plan (Annual)",
  description: "Everything you need — save 17%",
  price: 19990,
  currency: "USD",
  billingType: "recurring",
  billingPeriod: "every-year",
  taxCategory: "saas",
  taxMode: "exclusive",
});

export const proBundle = productBundle({
  key: "pro-bundle",
  name: "Pro",
  type: "subscription",
  products: [proMonthly, proYearly],
});

export const launchDiscount = discount({
  key: "launch-20",
  name: "Launch Offer",
  code: "LAUNCH20",
  type: "percentage",
  percentage: 20,
  duration: "once",
  appliesTo: [proMonthly, proYearly],
});

export default defineConfig({
  products: [proMonthly, proYearly],
  productBundles: [proBundle],
  discounts: [launchDiscount],
});
```

**Key principle: source config stores stable local keys, not remote IDs.**

Why:

- Test and production have different Creem entity IDs.
- The repo needs stable identifiers that survive pull, push, deploy, and merge
  operations.
- Remote IDs belong to environment state, not version-controlled source.

`.creem/state.json` stores the environment-specific bindings:

```json
{
  "entities": {
    "product:pro-monthly": {
      "test": {
        "remoteId": "prod_test_123",
        "lastSyncedAt": "2026-04-14T09:00:00Z"
      },
      "live": {
        "remoteId": "prod_live_456",
        "lastSyncedAt": "2026-04-14T09:05:00Z"
      }
    }
  }
}
```

`creem pull` should preserve existing keys where possible. When importing a new
remote-only entity, the CLI generates a suggested key from the entity’s
slug/name and lets the developer adjust it if needed.

### Pull Implementation: 3-Way Merge + File Regeneration

Analysis of Autumn’s `atmn pull` implementation reveals a pragmatic output
strategy: instead of AST manipulation, the file is **regenerated from scratch**
— build TypeScript code via string builders, format with Prettier, write the
entire file. No partial file editing, no AST transforms.

**Creem adopts the same output strategy but NOT the same merge strategy.**
Autumn’s `atmn pull` overwrites the file with the remote state (no merge). This
works for Autumn’s single-environment model where `pull` means “give me what the
server has.” For Creem, `pull` must **merge**, because:

- **`creem pull` (from test)**: The developer may have local changes not yet
  pushed. Overwriting would destroy work.
- **`creem pull --env live` (from production)**: The developer has been evolving
  config with the test system. Production is a different branch. Overwriting
  would destroy the entire test-evolved state.

The correct flow for `creem pull`:

```
1. Load LOCAL  — creem.config.ts via jiti (developer's current state)
2. Load BASE   — .creem/state.json snapshots (last sync point)
3. Fetch REMOTE — Creem API (test or production depending on --env)
4. Run 3-way merge (§5.5) — produce merged entity set
5. Regenerate creem.config.ts from merged entities (string builders + Prettier)
6. Update .creem/state.json with new key → remoteId bindings + timestamps
```

The **only case** where pull is a simple overwrite (no merge) is the initial
`creem pull` on a fresh project with no existing config — there is no LOCAL or
BASE yet, so REMOTE is the sole input.

**Trade-offs of full file regeneration (output step 5):**

- ✅ No AST complexity — string builders + Prettier formatting is simple and
  reliable
- ✅ Consistent output — every pull produces identically formatted code
- ❌ Developer comments are NOT preserved across pulls (documented trade-off)
- ❌ Custom formatting is NOT preserved (Prettier standardizes)
- **`jiti`** (or similar) handles runtime TypeScript config loading (input
  step 1)

See Appendix A for concrete merge scenarios that validate this approach.

### Authoring Constraints

`creem.config.ts` is executable TypeScript, but **sync only remains reliable if
the file stays within a constrained declarative shape**.

Allowed / encouraged:

- `product()`, `productBundle()`, `discount()` helper calls
- Literal values and simple references between config entities
- A predictable `defineConfig({ ... })` export shape

Discouraged for code-managed sync mode:

- Arbitrary control flow that generates entities dynamically
- Fetching remote data during config evaluation
- Complex helper abstractions that obscure entity definitions

The contract: **config is authored code, but within a declarative envelope**.
That is the only realistic way to support `pull` (full regeneration), `dev`
(live sync), and conflict-aware updates without turning the sync engine into a
fragile TypeScript code transformer.

**What should be code-managed:**

| Entity              | Code-Managed? | Reasoning                                       |
| ------------------- | ------------- | ----------------------------------------------- |
| Products            | ✅            | Core billing config, version-controlled         |
| Product Bundles     | ✅            | Defines upgrade paths and plan tiers            |
| Discounts           | ✅            | Promotional campaigns, reproducible across envs |
| Webhook endpoints   | ❌            | Infrastructure concern, env-specific            |
| Storefront settings | ❌            | Marketing concern, dashboard-managed            |
| Affiliate programs  | ❌            | Operational, relationship-driven                |
| Revenue splits      | ❌            | Operational, contract-driven                    |
| License settings    | ⚠️ Maybe      | If tied to products, could be in config         |

### 5.2 — Push / Pull / Deploy Workflow

```bash
# Pull remote state into local config + state mapping
creem pull                    # Pull from test environment (default)
creem pull --env test         # Explicit test
creem pull --env live         # Pull from production (read-only snapshot)

# Validate config locally
creem validate                # Schema validation + drift detection

# Push config to test
creem push                    # Push to test environment (default, safe)

# Diff before push
creem diff                    # Show what would change on test

# Deploy to production
creem deploy                  # Promote test → production (with drift check + confirmation)
creem deploy --dry-run        # Show what would change without executing
```

> **Important**: There is no `creem push --env live`. Production changes go
> through `creem deploy` which is an explicit promotion from test, not a direct
> push. If production has drifted (dashboard edits since last deploy), the CLI
> blocks and requires `creem pull --env live` first — same as Git requiring you
> to pull main before merging. See §5.3 for the full sync model.

**State tracking**: `.creem/state.json` records last-synced snapshots, sync
cursors, and per-environment `key → remoteId` mappings.

### 5.3 — The Git Workflow Mental Model

The config sync problem maps directly to a Git branching workflow:

```
creem.config.ts + .creem/state.json  ←→ test env = feature branch
                      ↓ creem deploy
                 production env       = main branch
                      ↑ dashboard edits
                 (direct commits to main)
```

| Git Concept              | Creem Equivalent                                                      |
| ------------------------ | --------------------------------------------------------------------- |
| Feature branch           | test env + local files (`creem.config.ts` + `.creem/state.json`)      |
| Main branch              | production env                                                        |
| Direct commit on main    | Dashboard edit on production                                          |
| Commit on feature branch | `creem push` or dashboard edit on test                                |
| `git pull origin main`   | `creem pull --env live` (fetch production drift)                      |
| Merge to main            | `creem deploy` (promote test → production)                            |
| Merge base               | `.creem/state.json` (last synced snapshots + key/ID bindings per env) |
| Merge conflict           | Same entity changed in both test and production since last sync       |

**Why this model works:**

- Instantly familiar to every developer
- Gives clear terminology for every operation
- Defines a resolution path for every scenario (including the hard case:
  production drift)
- `.creem/state.json` naturally serves as the merge base / common ancestor

### How it differs from Git

|                      | Git                             | Creem Config Sync                                                                                                                                                                                                                         |
| -------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| Conflict granularity | Line-level text diffs           | Entity-level semantic diffs (simpler to detect, easier to display)                                                                                                                                                                        |
| Merge atomicity      | Atomic — all-or-nothing         | **Non-atomic** — N API calls to update N entities. Partial deploy possible. See D6 for resolution strategy (Option C could make this atomic if Creem supports ACID batch mutations).                                                      |
| Ordering             | No semantic ordering            | Bundles reference products → deploy order matters                                                                                                                                                                                         |
| Reversibility        | `git revert` is always safe     | **All config-as-code operations are reversible.** Archiving a product does NOT cancel existing subscriptions — unarchiving restores it. Deleting a discount doesn’t affect existing redemptions — you can recreate it with the same code. |
| Branching            | Unlimited branches              | Exactly two environments (test + production)                                                                                                                                                                                              |
| Change tracking      | All changes tracked via commits | Without Change History API: snapshot-based diffing via `updatedAt` fields detects changes but not attribution. With Change History API (FR-6, nice-to-have): every mutation records source (`"dashboard"`                                 | `"api"` | `"cli"` | `"sdk"`), actor, timestamp, and field-level diff — enabling full audit trail and efficient cursor-based polling. |

### Deploy with production drift

When production has drifted via dashboard edits, `creem deploy` blocks and
requires explicit resolution — just like Git blocks a merge when `main` has
diverged:

```
1. Developer works on test via `creem dev`
2. Meanwhile, teammate edits production via dashboard (direct commit to main)
3. Developer runs `creem deploy`
4. CLI detects production has changes since last deploy (main has diverged)
5. CLI blocks: "Production has 3 changes since your last deploy.
   Run `creem pull --env live` first."
6. Developer runs `creem pull --env live`
7. CLI fetches production state, diffs against `.creem/state.json` (merge base)
8. If no conflicts → auto-merge into `creem.config.ts`, update `.creem/state.json`
   If conflicts → show entity-level diff, pause for resolution
9. Developer resolves conflicts, commits to Git
10. Developer re-runs `creem deploy` — now clean, deploys successfully
```

**Key rule: `creem deploy` never silently overwrites production drift.** This is
the equivalent of Git refusing to push when the remote has diverged — you must
pull and resolve first.

### What about teams that routinely edit production?

This is the honest tension. Many Creem users today edit production directly in
the dashboard — it’s quick, it works, no tooling needed. The Git workflow model
says: that’s fine, but those changes must be pulled before the next deploy, just
like direct commits to main must be pulled before merging a feature branch.

Teams that don’t use the CLI at all are unaffected. Teams that adopt
config-as-code learn the discipline: **production edits are escape hatches, not
the primary workflow**. The CLI makes them visible (audit log) and mergeable
(pull), not forbidden.

### Feature Requests

See D4 for the full consolidated list. Key hard blockers: FR-1 (product update),
FR-2 (product archive), FR-3 (bundle CRUD), FR-4 (discount update), FR-7
(`updatedAt` fields). Nice-to-have enhancements: FR-6 (Change History API), FR-8
(ACID batch endpoint).

### 5.4 — Change History API Spec (FR-6, Nice-to-Have)

If the Creem platform implements the Change History API, every config mutation
(product create/update/archive, discount change, etc.) would produce a
timestamped changelog entry with:

- `changeId` (monotonic or UUID)
- `entityType` (product, discount, bundle)
- `entityId`
- `action` (created, updated, archived)
- `source` (“dashboard” | “api” | “cli” | “sdk”)
- `diff` (field-level before/after)
- `timestamp`
- `actor` (user email or API key ID)

This enables:

- **Efficient `creem dev` polling** — cursor-based instead of full snapshot
  comparison
- **Enterprise audit trail** — who changed what, when, from where
- **Attribution-aware conflict resolution** — show whether a change came from
  dashboard or API

**Without the Change History API**, Stage 5 still works: `updatedAt`-based
snapshot diffing detects changes, but without attribution or efficient
incremental polling. `creem dev` would poll via full entity listing +
`updatedAt` comparison instead of cursor-based change streaming.

### 5.5 — Reconciliation Algorithm (3-Way Merge)

The algorithm is a 3-way merge using `.creem/state.json` as the merge base:

```
Inputs:
  - BASE:   .creem/state.json (snapshots + key/ID bindings at last sync — the "common ancestor")
  - LOCAL:  creem.config.ts (developer's working copy, keyed by stable local keys)
  - REMOTE: Creem API state (test env during `creem dev`, production during `creem deploy`)

For each entity (product, discount, bundle):
  0. Match entities via `.creem/state.json` key/remoteId bindings
  1. Compare LOCAL vs BASE → local diff (what the developer changed)
  2. Compare REMOTE vs BASE → remote diff (what the dashboard/API changed)
  3. Categorize:
     - Unchanged in both        → skip
     - LOCAL-only new           → create on remote
     - REMOTE-only new          → import into `creem.config.ts` with a generated local key
     - LOCAL-only changed       → push to remote
     - REMOTE-only changed      → update `creem.config.ts`
     - Both changed, same value → skip (convergent edit)
     - Both changed, different  → CONFLICT: show entity-level diff, pause for resolution
     - LOCAL removed            → archive on remote (with confirmation)
     - REMOTE archived          → remove from config (with notification)
  4. Update `.creem/state.json` to the new merged state (advance the merge base and refresh key/ID bindings)
```

**Entity-level conflicts are simpler than line-level:** A conflict is “Product X
price: $20 in test, $25 in production.” No ambiguity about what’s in conflict.
The CLI shows both values and asks which to keep (or allows manual edit).

Because source config is keyed by stable local keys, the merge engine does not
rely on test/live sharing the same remote IDs. That separation is what makes
cross-environment promotion viable.

**Non-atomic deploy risk:** See D6 for the full strategy discussion. Summary:
dry-run is cheap (CLI-side only), rollback is medium complexity, resume handles
partial failures. The chosen strategy (D6) determines whether partial deploys
are accepted or automatically rolled back.

### 5.6 — `creem dev` Command

```bash
creem dev                     # Start bidirectional sync toTEST env only
```

This command automates the reconciliation algorithm from §5.5 on a watch loop —
no new merge logic beyond what `creem push` and `creem pull` already use. It’s
the live equivalent of manually running push/pull after every edit.

Behavior:

- Watches `creem.config.ts` for local changes (via chokidar)
- Polls for remote changes on test every ~5s:
- **With Change History API (FR-6)**: cursor-based polling — efficient,
  incremental, includes attribution
- **Without Change History API**: full entity listing + `updatedAt` comparison —
  functional but slower, no attribution
- On each cycle: runs the 3-way merge (§5.5) with test env as REMOTE
- On conflict: pauses, shows entity-level diff in terminal, waits for user
  resolution
- Writes sync log to `.creem/sync.log`

### 5.7 — `creem deploy` Command (Merge to Main)

```bash
creem deploy                  # Promote test → production (with drift check)
creem deploy --dry-run        # Show what would change, don't execute
creem deploy --resume         # Resume a partially failed deploy
```

Deploy workflow:

1. Detect production drift (with Change History API: cursor-based; without:
   snapshot all entities and compare `updatedAt` against `.creem/state.json`)
2. If production has drifted → **block**: “Production has N changes since your
   last deploy. Run `creem pull --env live` to merge.”
3. If clean → run 3-way merge (§5.5) with production as REMOTE, show diff, ask
   for confirmation
4. Execute changes in dependency order (products → bundles → discounts)
5. On success → update `.creem/state.json` production cursor
6. On partial failure → log progress, suggest `--resume`

### 5.8 — Enterprise Synergy: Audit Log

The change history API doubles as a full audit trail:

- Who changed what, when, from where (dashboard vs CLI vs API)
- Every entity change is a “commit” with actor, source, timestamp, and
  field-level diff
- Git history + Creem change history together = complete compliance trail
- The `source` field makes dashboard drift instantly visible in audits

**Deliverables**: `creem.config.ts` schema + helpers. `.creem/state.json` state
file. Push/pull/diff/deploy/validate CLI commands. Full file regeneration for
`creem pull` (Autumn-inspired, string builders + Prettier). 3-way merge engine.
`creem dev` live sync command. `creem deploy` with drift detection + dry-run
(per D6) + resume. Conflict resolution UX.

**Hard blockers**: Product update (FR-1), product archive (FR-2), bundle CRUD
(FR-3), discount update (FR-4), `updatedAt` fields (FR-7), D6 resolution.

**Nice-to-have enhancements**: Change History API (FR-6) for efficient polling +
audit trail, ACID batch endpoint (FR-8) for atomic deploys. See D4 for the full
feature request list.

## Stage 6 — Additional UI Frameworks

**Goal**: Expand UI widgets to Vue, Solid, Angular, React Native. (Order per
decision D3.)

### Open Inputs

- **React/Svelte implementation patterns proven**: new framework packages should
  reuse the same component architecture, design tokens, and provider contract
  instead of inventing a second system.
- **D3 — Framework priority**: expansion order should follow real user demand
  and ecosystem leverage.
- **Headless UI feasibility**: Vue and Solid can likely follow Ark UI; Angular
  and React Native need separate investigation.

### 6.1 — Framework Support Matrix

| Framework    | Headless UI               | Status   | Complexity                            |
| ------------ | ------------------------- | -------- | ------------------------------------- |
| React        | Ark UI (`@ark-ui/react`)  | ✅ Done  | —                                     |
| Svelte 5     | Ark UI (`@ark-ui/svelte`) | ✅ Done  | —                                     |
| Vue 3        | Ark UI (`@ark-ui/vue`)    | 🔜 Next  | Low — Ark UI has Vue support          |
| Solid        | Ark UI (`@ark-ui/solid`)  | 🔜 Next  | Low — Ark UI has Solid support        |
| Angular      | **No Ark UI**             | ⏳ Later | High — need CDK or custom headless    |
| React Native | **No Ark UI**             | ⏳ Later | High — completely different rendering |

### 6.2 — Expansion Order

1. **Vue** (`@creem/ui-vue`) — Ark UI supports it, large market (Nuxt ecosystem)
2. **Solid** (`@creem/ui-solid`) — Ark UI supports it, growing ecosystem
   (TanStack Start)
3. **Angular** (`@creem/ui-angular`) — Needs Angular CDK for headless.
   Significant rewrite.
4. **React Native** (`@creem/ui-react-native`) — Completely different paradigm.
   Possibly share logic with React but rebuild rendering.

### 6.3 — Additional Integration Packages

| Integration       | Pairs With             | Priority                         |
| ----------------- | ---------------------- | -------------------------------- |
| `@creem/nuxt`     | Vue, Supabase/Drizzle  | With Vue widgets                 |
| `@creem/drizzle`  | Next.js/SvelteKit/Nuxt | After Supabase validates pattern |
| `@creem/prisma`   | Next.js/SvelteKit/Nuxt | After Drizzle                    |
| `@creem/firebase` | React/Vue/Angular      | Community demand                 |
| `@creem/appwrite` | React/Vue/Svelte       | Community demand                 |
| `@creem/mongodb`  | Next.js/SvelteKit      | Community demand                 |

**Deliverables**: `@creem/ui-vue`, `@creem/ui-solid` packages. Additional
integration packages as market demands.

---

## Stage 7 — Templates + Docs Overhaul

**Goal**: Create fast-start templates for every supported combination, plus an
AI-readable integration path for existing projects. Overhaul docs with
stack-aware Getting Started.

### Open Inputs

- **Template design can start immediately**: folder structure, manifest schema,
  docs IA, and verification strategy do not need to wait for packages.
- **Runnable templates need the relevant package set**: each canonical template
  becomes executable once its UI package and integration packages exist.
- **Provider ownership matrix**: each template must encode the correct backend
  owner for its stack combination.

### 7.1 — Template Architecture

Since every supported combination already has a template project (E2E tests live
there — see Stage 1.5), the scaffolding CLI is a **router, not a code
generator**. Each template is a complete, tested, correctly-wired project. The
ownership-aware wiring (e.g., Convex HTTP actions vs Next.js API routes for
webhooks) is already baked into each template — no generation logic needed.

The CLI takes two flags: `--ui` for the UI framework and `--integration` for one
or more integration packages. This keeps the CLI language consistent with the
plan: server runtimes (Next.js, SvelteKit) and data/full-stack integrations
(Supabase, Convex) are all modeled as Creem integrations.

```bash
npx create-creem-app --ui react --integration nextjs supabase      # Next.js SSR + Supabase DB
npx create-creem-app --ui svelte --integration sveltekit supabase  # SvelteKit + Supabase DB
npx create-creem-app --ui react --integration convex               # Vite SPA + Convex (owns everything)
npx create-creem-app --ui react --integration nextjs convex        # Next.js SSR + Convex backend
```

**What the CLI does:**

1. **Route** — map `-ui` + `-integration` flags → the matching template in
   `templates/`
2. **Clone** — degit or copy the template into the target directory
3. **Personalize** — project name, replace `workspace:^` dependencies with real
   npm versions, seed `.env.example` with placeholder API keys
4. **Prune** (optional) — strip E2E test files from the scaffold, or keep them
   as starter tests
5. **Reject** — if the combination has no template, list available combinations
   instead of trying to assemble something untested

Each template contains:

- Correct packages pre-installed (`@creem/ui-*`, integration package, core)
- **Before Stage 5**: `planCatalog` with example product definitions (typed
  product references without requiring config-as-code)
- **After Stage 5**: `creem.config.ts` with example products +
  `.creem/state.json` setup instructions (config-as-code is the primary DX)
- Webhook route in the right place (per overlap matrix)
- Example billing page with `<Subscription>` and `<Product>` widgets
- E2E test suite (doubles as integration tests in CI)

### 7.1.1 — Brownfield Integration via Existing Skill Bundle + Template Manifest

`create-creem-app` is the right DX for **greenfield** projects. Existing apps
need a different entry point: an AI-readable integration guide that can inspect
the host codebase, look up the nearest canonical template, and apply the minimal
set of changes needed to integrate Creem without replacing the app’s
architecture.

The model:

- **Templates remain the source of truth** for fully working combinations.
- **The existing docs skill bundle becomes the brownfield playbook** for agents
  working inside an existing repo.
- **A machine-readable template manifest** tells the agent where the canonical
  example lives for each supported combination (monorepo path), plus what
  integration surfaces matter.

The skill should reference **template repo/path**, not embed large code dumps.
That keeps the guidance maintainable: update the template, update the manifest,
and agents always compare against the current canonical implementation.

**Recommended assets:**

- `packages/docs/skills/creem-api/Skill.md` — top-level skill entry point for
  agents
- `packages/docs/skills/creem-api/WORKFLOWS.md` — integration sequencing and
  end-to-end flows
- `packages/docs/skills/creem-api/WEBHOOKS.md` — event handling and signature
  verification
- `packages/docs/skills/creem-api/REFERENCE.md` — endpoint-level reference
  material
- `creem.io/templates.json` (or similar) — machine-readable manifest of
  supported combinations
- Optional future stack-specific skill modules, such as
  `packages/docs/skills/nextjs-supabase/Skill.md`, if a combination needs deeper
  framework-specific guidance

**What the manifest should contain per combination:**

- Combination id (`react + nextjs + supabase`)
- Canonical template location (`templates/nextjs-supabase/` or external repo
  URL)
- Required packages
- Required environment variables
- Required integration surfaces:
- webhook endpoint
- server actions / route handlers
- database schema or migrations
- billing model/query helpers
- example billing page / widget mounting points
- Verification steps (build, typecheck, happy-path checkout, webhook test)

**Expected agent workflow in an existing app:**

1. Detect the host stack (framework, router/runtime, database/auth choices)
2. Select the nearest supported Creem template from the manifest
3. Diff the host app against the template’s integration surfaces, not the whole
   repo
4. Port the minimal required wiring into the existing architecture
5. Preserve project conventions (routing, styling, auth, env loading, linting)
6. Verify the integration locally and report any unresolved gaps

**Important boundary**: the agent should treat the template as a **canonical
reference implementation**, not as something to copy wholesale. Brownfield
success depends on integrating Creem into the host app’s structure, not turning
the host app into a partial scaffold.

This extends the existing skill system rather than replacing it. Today the
`creem-api` bundle is API-centric; Stage 7 should add template-aware,
stack-aware integration guidance so agents can move from “how to call Creem” to
“how to integrate Creem cleanly into this existing codebase.”

The same integration surfaces documented in the manifest (webhook route,
provider setup, billing page, env vars, verification steps) are rendered as
human-readable integration guides in the docs. A developer who doesn’t use AI
agents follows the same steps manually — the manifest is a structured projection
of the docs, not a separate body of knowledge.

### 7.2 — Priority Templates

| Template             | UI          | Server             | Database | Priority |
| -------------------- | ----------- | ------------------ | -------- | -------- |
| `nextjs-supabase`    | React       | Next.js            | Supabase | 🔴 P0    |
| `sveltekit-supabase` | Svelte      | SvelteKit          | Supabase | 🔴 P0    |
| `nextjs-convex`      | React       | Next.js + Convex   | Convex   | 🟡 P1    |
| `sveltekit-convex`   | Svelte      | SvelteKit + Convex | Convex   | 🟡 P1    |
| `nuxt-supabase`      | Vue         | Nuxt               | Supabase | 🟢 P2    |
| `tanstack-start`     | React/Solid | TanStack           | Supabase | 🟢 P2    |

### 7.3 — Docs Architecture

**Challenge**: Combinatorial explosion of frontend × backend × database guides.

**Solution**: Two approaches simultaneously:

### A) Interactive Getting Started (good UX, one URL)

Single page at `docs.creem.io/getting-started/quickstart` with progressive
selectors:

```
Step 1: Choose your frontend framework
  [ React ] [ Svelte ] [ Vue ] [ Solid ] [ Angular ]

Step 2: Choose your server runtime
  [ Next.js ] [ SvelteKit ] [ Nuxt ] [ Remix ] [ None (SPA) ]

Step 3: Choose your database
  [ Convex ] [ Supabase ] [ Drizzle ] [ Prisma ] [ Firebase ]

→ Shows tailored installation + configuration + code snippets
```

### B) SEO-Optimized Individual Pages (good discoverability)

Auto-generated from a template for each valid combination:

```
docs/getting-started/react/nextjs-supabase.mdx
docs/getting-started/react/nextjs-convex.mdx
docs/getting-started/react/nextjs-drizzle.mdx
docs/getting-started/svelte/sveltekit-supabase.mdx
docs/getting-started/svelte/sveltekit-convex.mdx
...
```

Each page is generated from:

1. A shared “universal steps” template (install packages/CLI, define products
   via `planCatalog` or `creem.config.ts` depending on which capability has
   shipped, etc.)
2. Framework-specific snippets (provider setup, component imports)
3. Integration-specific snippets (webhook route, database setup)

### C) Docs Navigation — Component-Based with Framework Tabs

```
Documentation
├── Get Started
│   ├── Introduction
│   ├── Quick Start (interactive selector)
│   ├── Test Mode
│   └── Dashboard Overview
├── UI Widgets
│   ├── Overview + Design System
│   ├── Subscription           ← code tabs: React | Svelte | Vue | Solid
│   ├── Product                ← code tabs: React | Svelte | Vue | Solid
│   ├── BillingHistory         ← ...
│   ├── Credits                ← Experimental
│   ├── PaymentMethods
│   ├── Preferences
│   ├── BillingGate
│   └── Primitives (PricingCard, CheckoutButton, etc.)
├── Integrations
│   ├── Overview (architecture diagram + overlap matrix)
│   ├── Convex
│   ├── Supabase
│   ├── Next.js
│   ├── SvelteKit
│   ├── Drizzle
│   └── Prisma
├── CLI
│   ├── Installation
│   ├── Commands Reference
│   └── Config-as-Code + Sync Engine
├── SDK
│   ├── TypeScript Core
│   └── Standalone Functions
├── Guides
│   ├── [framework]/[integration] (SEO pages)
│   └── Migration (Stripe / Polar / Lemon Squeezy)
└── API Reference
```

> **Rationale**: Component-based structure with framework tabs is better than
> framework-based sections because: (1) users think “I need a subscription
> widget” not “I need the Svelte docs”, (2) Mintlify supports code tabs
> natively, (3) it avoids duplicating conceptual docs per framework, (4) the
> Integrations section is already technology-based which creates a natural
> split: “what” (widgets) vs “how” (integration wiring).

**Deliverables**: Scaffolding router CLI (`create-creem-app`) for greenfield
apps. Priority templates with E2E tests. Template-aware extensions to the
existing docs skill bundle (`packages/docs/skills/creem-api/*`) plus a template
manifest for existing apps. Interactive docs quickstart. Component-based widget
docs with framework tabs. SEO-optimized individual guide pages.

## MVP Validation Stream

The first real validation pass should build **the integration domain, UI widget
domain, Convex migration, and the first templates/docs in parallel** for the
initial stack set:

- UI: React, Svelte
- Runtime integrations: Next.js, SvelteKit
- Data/full-stack integrations: Supabase, Convex

Why this parallel stream matters:

- Integration packages alone cannot prove the contract without real UI
  consumers.
- UI widgets alone cannot prove the provider shape without real integrations.
- Convex pressure-tests the abstraction against the most opinionated backend
  ownership model.
- Templates expose hidden integration seams that package-only work can miss.

### Initial Validation Scope

This is the only place where first-pass scope is defined. The domain chapters
above describe the target ecosystem; this section defines the first slice that
proves the architecture.

**Included in the first validation pass:**

- `@creem/core` draft contract: billing model, provider contract, webhook
  normalization
- `@creem/supabase`, `@creem/nextjs`, `@creem/sveltekit` enough to support
  checkout, webhooks, subscription state, portal links, and billing history
- `@creem/ui-react` and `@creem/ui-svelte` with Subscription, Product,
  BillingGate, BillingHistory, PaymentMethods portal wrapper, and Preferences
  portal wrapper
- `@creem/convex` migrated onto the shared contract for React and Svelte
- First templates: `nextjs-supabase`, `sveltekit-supabase`, `nextjs-convex`,
  `sveltekit-convex`
- Docs and skill/manifest guidance for greenfield scaffolding and brownfield
  integration against those templates

**Validated later, after the first architecture loop teaches us more:**

- Credits widgets and the optional `credits` capability on `BillingContextValue`
- Vue and Solid UI packages
- Additional integrations such as Nuxt, Drizzle, Prisma, Firebase, Appwrite,
  MongoDB, Remix, and TanStack Start
- Config-as-code + sync engine once the required Creem API capabilities exist
- Fully dynamic product grouping and one-time upgrade flows once the
  product/bundle API model supports them

**Validation graph**:

![image.png](image%202.png)

`Config-as-Code + Sync Engine — platform-dependent, independent track`

Note: CLI parity can run truly in parallel once any shared CLI/core types it
wants to reuse are stable. First templates should begin as soon as the initial
React/Svelte + Supabase/Convex + Next.js/SvelteKit path is runnable. Users need
strong docs for the first supported stacks before they need broader framework
coverage.

## Cross-Cutting Concerns

These items cut across multiple stages and need to be addressed as design
principles during implementation, not as afterthoughts.

### 1. Operational Logging + Debugging DX

The plan focuses on the happy path (checkout → webhook → UI update) but
production debugging is where support load lives. Every integration package and
UI widget should ship with structured operational logging so developers can
trace billing state through the full pipeline.

**Integration packages** must log:

- Webhook receipt, signature verification result, and event type
- Entity upsert/update operations with before/after state
- Checkout session creation and redirect URLs
- Subscription lifecycle transitions (active → canceled → expired)
- Errors with enough context to diagnose without reproducing (request IDs,
  entity IDs, timestamps)

**UI widgets** must surface:

- Provider connection state (connected / loading / error / disconnected)
- Data freshness (last sync timestamp, polling interval for non-reactive
  integrations)
- Action failures with user-facing error messages distinct from developer-facing
  diagnostics

**Design principle**: Every operation that crosses a boundary (client → server,
server → Creem API, Creem webhook → app) should produce a structured log entry.
Debug mode (e.g., `CREEM_DEBUG=true`) should enable verbose tracing without code
changes.

### 2. Continuous Integration + Development Workflow

The monorepo’s test chain is the enforcement mechanism for cross-package
consistency: a breaking change in `@creem/core` fails tests in
`@creem/ui-svelte` and `@creem/convex`, which then fails E2E tests in template
projects like `template-sveltekit-convex`. This cascade is by design — it
ensures that no package publishes in a broken state.

**CI pipeline** (runs on every PR and before publish):

1. `pnpm check` — TypeScript type checking across all packages
2. `pnpm lint` — Linting (ESLint/Biome) across all packages
3. `pnpm format --check` — Formatting consistency
4. `pnpm test` — Unit tests in packages, E2E tests in templates
5. `pnpm build` — Build all packages
6. Template E2E tests must pass before any package publish — template breakage
   blocks the release

**Development workflow** (for agents and humans working in this repo):

- Every implementation change must pass the full CI pipeline locally before
  committing
- If a change in one package breaks downstream tests, the fix must include the
  downstream package updates and a changeset entry for each affected package
- When a package change affects templates, the same PR must update the templates
  and include changeset entries for each affected package. The agent workflow
  (documented in `AGENTS.md` and equivalents) enforces this: run
  `pnpm check && pnpm lint && pnpm format --check && pnpm test && pnpm build`
  across the full monorepo, trace failures to the root cause, fix downstream
  packages, and prepare changesets — all before committing

This workflow should be documented in tool-specific agent configuration files so
every major AI coding tool understands the repo conventions out of the box. For
an open-source repo, this means supporting the ecosystem:

| Tool               | Config file                       | Format                      |
| ------------------ | --------------------------------- | --------------------------- |
| OpenAI Codex       | `AGENTS.md`                       | Markdown                    |
| Claude Code        | `CLAUDE.md`                       | Markdown                    |
| Windsurf / Cascade | `.windsurf/rules/*.md`            | YAML frontmatter + Markdown |
| Cursor             | `.cursor/rules/*.mdc`             | MDC (Markdown Components)   |
| GitHub Copilot     | `.github/copilot-instructions.md` | Markdown                    |

All files share the same canonical content (repo structure, CI pipeline,
development workflow, changeset discipline). The source of truth is one file
(e.g., `AGENTS.md`); the others can reference or mirror it. Which tools the
Creem team uses internally can be decided separately, but the repo should be
contributor-friendly for all major tools from day one.

### 3. Documentation as Product

The plan’s brownfield integration path (§7.1.1) relies on template manifests and
skill bundles for AI-assisted integration. The human-readable docs serve the
same function for manual integration. The key insight: **great documentation for
humans is great documentation for AI, and vice versa**. The differences are
presentation, not content — compressed `.md` and structured `.json` for agents,
polished HTML pages with interactive examples for humans.

This means the docs strategy is not “write docs, then add AI artifacts” — it’s
“write one canonical description of each integration surface (SDK, CLI,
webhooks, provider setup, widget usage), then render it in both formats.” The
template manifest and skill bundle are structured projections of the same
knowledge that lives in the docs.

**Design principle**: Every integration package ships with both human-readable
documentation and a machine-readable integration surface description. Neither is
an afterthought of the other — they’re two views of the same source of truth.

---

## CLI vs SDK vs Dashboard Parity Table

| Operation                   | CLI | SDK | Dashboard   | Notes                                                       |
| --------------------------- | --- | --- | ----------- | ----------------------------------------------------------- |
| **Products**                |     |     |             |                                                             |
| Create product              | ✅  | ✅  | ✅          |                                                             |
| Get product                 | ✅  | ✅  | ✅          |                                                             |
| List/search products        | ✅  | ✅  | ✅          |                                                             |
| Update product              | ❌  | ❌  | ✅          | **API missing**                                             |
| Archive product             | ❌  | ❌  | ✅          | **API missing** (products cannot be deleted, only archived) |
| **Product Bundles**         |     |     |             |                                                             |
| CRUD (subscription bundles) | ❌  | ❌  | ✅          | **API missing**                                             |
| CRUD (one-time bundles)     | ❌  | ❌  | ❌          | **Not supported anywhere**                                  |
| **Checkouts**               |     |     |             |                                                             |
| Create checkout             | ✅  | ✅  | ✅          |                                                             |
| Get checkout                | ✅  | ✅  | ✅          |                                                             |
| **Customers**               |     |     |             |                                                             |
| Get customer                | ✅  | ✅  | ✅          |                                                             |
| List customers              | ✅  | ✅  | ✅          |                                                             |
| Generate portal link        | ✅  | ✅  | ✅          |                                                             |
| Create customer             | ❌  | ❌  | ✅          | **API missing**                                             |
| Update customer             | ❌  | ❌  | ✅          | **API missing**                                             |
| **Subscriptions**           |     |     |             |                                                             |
| Get subscription            | ✅  | ✅  | ✅          |                                                             |
| List subscriptions          | ✅  | ✅  | ✅          |                                                             |
| Update subscription         | ❌  | ✅  | ✅          | **CLI missing** (API exists)                                |
| Upgrade subscription        | ❌  | ✅  | ✅          | **CLI missing** (API exists)                                |
| Cancel subscription         | ✅  | ✅  | ✅          |                                                             |
| Pause subscription          | ✅  | ✅  | ✅          |                                                             |
| Resume subscription         | ✅  | ✅  | ✅          |                                                             |
| **Transactions**            |     |     |             |                                                             |
| Get transaction             | ✅  | ✅  | ✅          |                                                             |
| List transactions           | ✅  | ✅  | ✅          |                                                             |
| **Licenses**                |     |     |             |                                                             |
| Activate license            | ❌  | ✅  | ✅          | **CLI missing**                                             |
| Validate license            | ❌  | ✅  | ✅          | **CLI missing**                                             |
| Deactivate license          | ❌  | ✅  | ✅          | **CLI missing**                                             |
| **Discounts**               |     |     |             |                                                             |
| Create discount             | ✅  | ✅  | ✅          |                                                             |
| Get discount                | ✅  | ✅  | ✅          |                                                             |
| Delete discount             | ✅  | ✅  | ✅          |                                                             |
| Update discount             | ❌  | ❌  | ✅          | **API missing**                                             |
| List discounts              | ❌  | ✅  | ✅          | **CLI missing**                                             |
| **Stats**                   |     |     |             |                                                             |
| Get metrics summary         | ❌  | ✅  | ✅          | **CLI missing**                                             |
| **Payment Methods**         | ❌  | ❌  | ✅ (portal) | **No API** — Stripe-hosted via customer portal              |
| **Customer Preferences**    | ❌  | ❌  | ✅ (portal) | **No API** — portal only                                    |
| **Customer Credits**        |     |     |             |                                                             |
| Create account              | ❌  | ✅  | ✅          | **CLI missing**                                             |
| Get account                 | ❌  | ✅  | ✅          | **CLI missing**                                             |
| Get balance                 | ❌  | ✅  | ✅          | **CLI missing**                                             |
| List accounts               | ❌  | ✅  | ✅          | **CLI missing**                                             |
| List entries                | ❌  | ✅  | ✅          | **CLI missing**                                             |
| Credit account              | ❌  | ✅  | ✅          | **CLI missing**                                             |
| Debit account               | ❌  | ✅  | ✅          | **CLI missing**                                             |
| Reverse transaction         | ❌  | ✅  | ✅          | **CLI missing**                                             |
| Freeze/unfreeze account     | ❌  | ✅  | ✅          | **CLI missing**                                             |
| Close account               | ❌  | ✅  | ✅          | **CLI missing**                                             |
| **Change History**          | ❌  | ❌  | ❌          | **Does not exist anywhere**                                 |

### Feature Requests — See D4

The full prioritized feature request list is in D4. This parity table shows the
current state; D4 shows what needs to change.

**Quick CLI Wins (API exists, CLI command missing — no Creem platform changes
needed):**

- `subscriptions update/upgrade`
- `licenses activate/validate/deactivate`
- `discounts list`
- `credits accounts create/get/list/balance/freeze/unfreeze/close`
- `credits credit/debit/reverse/entries`
- `stats summary`

## Appendix A — Sync Engine Merge Scenarios

These scenarios validate that the 3-way merge algorithm (§5.5) produces correct
results using only `state.json` as merge base + `updatedAt` diffing — **without
requiring a server-side Change History API (FR-6)**.

Referenced from: §5.1 (Pull Implementation), §5.4 (FR-6 reclassification), §5.5
(Reconciliation Algorithm).

### The Core Model

The 3-way merge uses three inputs, same as Git:

| Input      | Git Equivalent               | Creem Equivalent                                            |
| ---------- | ---------------------------- | ----------------------------------------------------------- |
| **BASE**   | Common ancestor (merge base) | `.creem/state.json` — snapshot of every entity at last sync |
| **LOCAL**  | Your working tree            | `creem.config.ts` — what the developer has now              |
| **REMOTE** | `origin/main`                | Creem API — what the server has now                         |

Git doesn’t need a “server changelog” to merge. It needs the merge base + two
tips. The diff is computed from the merge base, not streamed from a log.

### Scenario 1: Product deleted locally while dev server offline

```
Timeline:
1. Last sync: state.json records product "pro-monthly" (price $20, remoteId: prod_123)
2. Dev server stops
3. Developer deletes "pro-monthly" from creem.config.ts
4. Dev server starts
```

| Input             | “pro-monthly”                                 |
| ----------------- | --------------------------------------------- |
| BASE (state.json) | exists, price $20                             |
| LOCAL (config.ts) | **gone**                                      |
| REMOTE (API)      | exists, price $20, `updatedAt` = same as BASE |

**Merge decision**: LOCAL removed, REMOTE unchanged → archive on remote (with
confirmation).

**Without Change History API**: ✅ Works. We compare REMOTE’s `updatedAt`
against BASE’s `lastSyncedAt`. They match → REMOTE unchanged. Entity missing
from LOCAL → developer deleted it. Clear action.

### Scenario 2: Product deleted locally + someone edited it on dashboard

```
Timeline:
1. Last sync: state.json records "pro-monthly" (price $20)
2. Dev server stops
3. Developer deletes "pro-monthly" from config
4. Marketing team changes price to $25 on dashboard
5. Dev server starts
```

| Input             | “pro-monthly”                         |
| ----------------- | ------------------------------------- |
| BASE (state.json) | exists, price $20                     |
| LOCAL (config.ts) | **gone**                              |
| REMOTE (API)      | exists, price $25, `updatedAt` > BASE |

**Merge decision**: LOCAL removed, REMOTE changed → **CONFLICT**. CLI shows:
“You deleted ‘pro-monthly’, but someone changed its price from $20 to $25. Keep
or archive?”

**Without Change History API**: ✅ Works. `updatedAt` > BASE tells us REMOTE
changed. Entity missing from LOCAL tells us developer deleted it. Conflict
detected correctly.

### Scenario 3: Both sides add different new entities

```
Timeline:
1. Last sync: only "pro-monthly" exists
2. Dev server stops
3. Developer adds "pro-yearly" to config
4. Marketing adds "enterprise" on dashboard
5. Dev server starts
```

| Input  | pro-monthly | pro-yearly | enterprise                     |
| ------ | ----------- | ---------- | ------------------------------ |
| BASE   | exists      | —          | —                              |
| LOCAL  | exists      | **new**    | —                              |
| REMOTE | exists      | —          | **new** (no key in state.json) |

**Merge decision**: “pro-yearly” is LOCAL-only new → create on remote.
“enterprise” is REMOTE-only new → import into config with generated key.

**Without Change History API**: ✅ Works. New remote entities are detected by
listing all entities and finding IDs not in state.json. New local entities are
detected by finding keys in config not in state.json.

### Scenario 4: Same entity modified on different fields by both sides

```
Timeline:
1. Last sync: "pro-monthly" price $20, description "Basic"
2. Dev server stops
3. Developer changes price to $25
4. Marketing changes description to "Premium" on dashboard
5. Dev server starts
```

| Input  | pro-monthly                                       |
| ------ | ------------------------------------------------- |
| BASE   | price $20, desc “Basic”                           |
| LOCAL  | price **$25**, desc “Basic”                       |
| REMOTE | price $20, desc **“Premium”**, `updatedAt` > BASE |

**Merge decision**: LOCAL changed price only. REMOTE changed description only.
Different fields → **auto-merge**: push price $25, pull description “Premium”.

**Without Change History API**: ✅ Works. Field-level diffing against BASE
determines which fields each side changed. No changelog needed.

### Scenario 5: Same field modified to different values by both sides

```
Timeline:
1. Last sync: "pro-monthly" price $20
2. Developer changes price to $25
3. Marketing changes price to $30 on dashboard
4. Dev server starts
```

| Input  | pro-monthly.price |
| ------ | ----------------- |
| BASE   | $20               |
| LOCAL  | $25               |
| REMOTE | $30               |

**Merge decision**: Both changed the same field to different values →
**CONFLICT**. CLI shows: “Price was $20, you set $25, server has $30. Which to
keep?”

**Without Change History API**: ✅ Works. Pure value comparison against BASE.

### Scenario 6: Round-trip change on dashboard (change and revert)

```
Timeline:
1. Last sync: "pro-monthly" price $20
2. Marketing changes price to $25 on dashboard
3. Marketing changes price back to $20 on dashboard
4. Dev server starts
```

| Input  | pro-monthly                       |
| ------ | --------------------------------- |
| BASE   | price $20, `lastSyncedAt`: T1     |
| LOCAL  | price $20                         |
| REMOTE | price $20, `updatedAt`: T3 (> T1) |

**With Change History API**: We’d see two changes ($20→$25, $25→$20). We know
activity happened but the end state matches. Skip and advance cursor.

**Without Change History API**: We see `updatedAt` > `lastSyncedAt`, which tells
us _something_ happened. But comparing field values: REMOTE matches BASE. LOCAL
matches BASE. → **Skip** (no changes needed). We update `lastSyncedAt` in
state.json. ✅ Correct result.

**Difference**: We don’t know about the intermediate state. But that doesn’t
affect the merge outcome.

### Scenario 7: Product archived on dashboard while developer has it in config

```
Timeline:
1. Last sync: "pro-monthly" active
2. Someone archives "pro-monthly" on dashboard
3. Dev server starts
```

| Input  | pro-monthly                                      |
| ------ | ------------------------------------------------ |
| BASE   | exists, status: active                           |
| LOCAL  | exists (unchanged)                               |
| REMOTE | exists, status: **archived**, `updatedAt` > BASE |

**Merge decision**: REMOTE changed (archived), LOCAL unchanged → notify
developer, remove from config (or flag for review).

**Without Change History API**: ✅ Works. We detect the status change via field
comparison against BASE. Don’t need a changelog to see that `status` went from
`active` to `archived`.

### Scenario 8: `creem pull --env live` before deploy (the critical multi-environment case)

This is the scenario that proves `pull` must merge, not overwrite (see §5.1 Pull
Implementation).

```
Timeline:
1. Developer has been evolving config with test system for 2 weeks
   - Added "pro-yearly" product
   - Changed "pro-monthly" price from $20 to $25
   - All pushed to test, state.json reflects test state
2. Meanwhile, operations team changed "pro-monthly" description on production dashboard
3. Developer runs `creem pull --env live` before `creem deploy`
```

| Input                                | pro-monthly                   | pro-yearly                     |
| ------------------------------------ | ----------------------------- | ------------------------------ |
| BASE (state.json, production cursor) | price $20, desc “Basic”       | — (doesn’t exist in prod)      |
| LOCAL (config.ts)                    | price **$25**, desc “Basic”   | **exists** (new, only in test) |
| REMOTE (production API)              | price $20, desc **“Premium”** | —                              |

**If pull overwrites (Autumn-style)**: Config becomes { pro-monthly: price $20,
desc “Premium” }. **Developer loses his work** — price change gone, pro-yearly
gone. ❌ Catastrophic.

**If pull merges (Creem approach)**:

- pro-monthly: LOCAL changed price (LOCAL-only), REMOTE changed description
  (REMOTE-only) → auto-merge: price $25, desc “Premium”
- pro-yearly: LOCAL-only new → keep in config, will be created on production
  during deploy

**Without Change History API**: ✅ Works. The merge base (state.json’s
production cursor) + field-level diffing handles this correctly.

**This scenario is why Creem cannot use Autumn’s overwrite strategy for pull.**

### Scenario 9: `creem dev` live polling efficiency comparison

**Without Change History API** — every ~5 seconds:

```
1. GET /v1/products/search     (paginated — all products)
2. GET /v1/discounts/search    (paginated — all discounts)
3. (future: GET bundles)
4. For each entity: compare updatedAt against state.json
5. If any changed → run 3-way merge for affected entities
```

For ~20 entities: ~3 API calls per cycle. Fine. For ~200 entities: ~10-20 API
calls per cycle. Getting slow.

**With Change History API** — every ~5 seconds:

```
1. GET /v1/changes?since=<cursor>   (single call)
2. If changes returned → run 3-way merge for affected entities only
3. Advance cursor
```

Always 1 API call regardless of entity count. Much more efficient.

**Verdict**: Efficiency difference, not correctness difference. For most billing
setups (< 50 entities), the polling approach is fine.

### Scenario 10: state.json corruption (disaster recovery)

```
Timeline:
1. .creem/state.json accidentally deleted or corrupted
2. Developer runs creem dev or creem push
```

**Without Change History API**: No merge base → cannot do 3-way merge. CLI must
detect this and require re-initialization: “State file missing. Running
`creem pull` to re-initialize from test.” This resets BASE to current REMOTE
(like a fresh clone). Any unpushed local changes require manual review.

**With Change History API**: Same problem. Even with a changelog, we don’t know
_which sync cursor_ was our last merge base. Recovery requires the same re-pull.

**Verdict**: Neither approach fully solves this. Both need the same recovery
path. Recommended direction: `state.json` should be committed to the repo (it’s
not sensitive — contains only key→ID mappings and timestamps) so it can be
recovered via `git checkout`.

### Summary

| Scenario                             | Without FR-6                             | With FR-6                    | Difference                                   |
| ------------------------------------ | ---------------------------------------- | ---------------------------- | -------------------------------------------- |
| 1. Delete locally while offline      | ✅ Correct                               | ✅ Correct                   | None                                         |
| 2. Delete locally + dashboard edit   | ✅ Conflict detected                     | ✅ Conflict detected         | None                                         |
| 3. Both sides add different entities | ✅ Correct                               | ✅ Correct                   | None                                         |
| 4. Same entity, different fields     | ✅ Auto-merge                            | ✅ Auto-merge                | None                                         |
| 5. Same field, different values      | ✅ Conflict                              | ✅ Conflict                  | None                                         |
| 6. Round-trip dashboard change       | ✅ Correct (no-op)                       | ✅ Sees intermediate states  | FR-6 adds visibility, not correctness        |
| 7. Archived on dashboard             | ✅ Detected via status field             | ✅ Detected                  | None                                         |
| 8. Pull –env live before deploy      | ✅ Merge preserves local work            | ✅ Same                      | None (proves pull must merge, not overwrite) |
| 9. `creem dev` live polling          | ⚠️ Full entity listing (~3-20 API calls) | ✅ Cursor-based (1 API call) | FR-6 is more efficient                       |
| 10. state.json corrupted             | ❌ Must re-pull                          | ❌ Same                      | Neither helps                                |

**Conclusion**: The Change History API (FR-6) is a **DX enhancement** (polling
efficiency + attribution), not a **correctness requirement**. The 3-way merge
algorithm produces correct results in all scenarios using only `state.json` as
merge base and `updatedAt` for remote change detection.
