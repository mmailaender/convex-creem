# Convex Creem Component

Add subscriptions, one-time purchases, and billing to your Convex app with
[Creem](https://www.creem.io).

**Check out the [Svelte example](example-svelte) and
[React example](example-react) for complete integrations.**

## Table of Contents

- [Quick Start — Backend](#quick-start--backend)
  - [1. Install](#1-install)
  - [2. Register component](#2-register-component)
  - [3. Set environment variables](#3-set-environment-variables)
  - [4. Configure billing](#4-configure-billing)
  - [5. Register webhooks](#5-register-webhooks)
  - [6. Sync products](#6-sync-products)
- [Quick Start — Frontend (UI Widgets)](#quick-start--frontend-ui-widgets)
  - [7. Install Tailwind CSS](#7-Install-UI-primitives)
  - [8. Install Tailwind CSS](#8-install-tailwind-css)
  - [9. Import styles](#9-import-styles)
- [Entity Model](#entity-model)
- [Scenarios](#scenarios)
  - [Wire the billing API](#wire-the-billing-api)
  - [1. Subscriptions](#1-subscriptions)
  - [2. Products](#2-products)
  - [3. Billing Portal](#3-billing-portal)
  - [4. Feature Gating](#4-feature-gating)
  - [5. Checkout Success](#5-checkout-success)
- [Advanced](#advanced)
  - [Webhook event middleware](#webhook-event-middleware)
  - [Security & Access Control](#security--access-control)
  - [Custom billing UI model](#custom-billing-ui-model)
  - [Creem server](#creem-server)
- [API Reference](#api-reference)
  - [Resource namespaces](#resource-namespaces--creemnamespace)
  - [`creem.api({ resolve })` — convenience exports](#creemapi-resolve---convenience-exports)
  - [Infrastructure](#infrastructure)
  - [Direct API access — `creem.sdk.*`](#direct-api-access--creemsdk)
- [Component Reference](#component-reference)
  - [Widgets](#widgets)
  - [Presentational components](#presentational-components)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)

---

## Quick Start — Backend

Complete these steps to use the billing API from your Convex functions. No
frontend framework required.

### 1. Install

```bash
npm install @mmailaender/convex-creem
```

### 2. Register component

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import creem from "@mmailaender/convex-creem/convex.config";

const app = defineApp();
app.use(creem);

export default app;
```

### 3. Set environment variables

```bash
npx convex env set CREEM_API_KEY <your_creem_api_key>
npx convex env set CREEM_WEBHOOK_SECRET <your_creem_webhook_signing_secret>
npx convex env set CREEM_SERVER test
```

### 4. Configure billing

```ts
// convex/billing.ts
import { Creem, type ApiResolver } from "@mmailaender/convex-creem";
import { api, components } from "./_generated/api";
import { query, internalAction } from "./_generated/server";

export const creem = new Creem(components.creem);

// Auth resolver — replace with your own auth logic
const resolve: ApiResolver = async (ctx) => {
  const user = await ctx.runQuery(api.users.currentUser);
  return {
    userId: user._id,
    email: user.email,
    entityId: user._id, // For org billing: user.activeOrgId ?? user._id
  };
};

// Generate Convex function exports — each calls resolve(), then delegates
const {
  uiModel,
  snapshot,
  checkouts,
  subscriptions,
  products,
  customers,
  orders,
} = creem.api({ resolve });

export { uiModel, snapshot };
export const checkoutsCreate = checkouts.create;
export const subscriptionsUpdate = subscriptions.update;
export const subscriptionsCancel = subscriptions.cancel;
export const subscriptionsResume = subscriptions.resume;
export const subscriptionsPause = subscriptions.pause;
export const subscriptionsList = subscriptions.list;
export const subscriptionsListAll = subscriptions.listAll;
export const productsList = products.list;
export const productsGet = products.get;
export const customersRetrieve = customers.retrieve;
export const customersPortalUrl = customers.portalUrl;
export const ordersList = orders.list;

// Sync products from Creem (CLI / dashboard only)
export const syncBillingProducts = internalAction({
  args: {},
  handler: async (ctx) => {
    await creem.syncProducts(ctx);
  },
});
```

### 5. Register webhooks

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { creem } from "./billing";

const http = httpRouter();

creem.registerRoutes(http);

export default http;
```

Use your **Convex site URL** + `/creem/events` as the webhook endpoint in your
Creem dashboard. The component automatically handles `checkout.completed`, Creem
subscription lifecycle events, `refund.created`, and `dispute.created`.

> For custom event handlers (e.g. sending emails on checkout), see
> [Webhook event middleware](#webhook-event-middleware).

### 6. Sync products

After configuring webhooks, pull your Creem products into the Convex database:

```bash
npx convex run billing:syncBillingProducts
```

> This is an `internalAction` — it can only be triggered from the CLI or the
> Convex dashboard.

**You're done with the backend.** You can now call `api.billing.*` from your
frontend or other Convex functions. If you only need the API (no UI widgets),
skip ahead to the [API Reference](#api-reference).

---

## Quick Start — Frontend (UI Widgets)

The component ships pre-built Svelte and React widgets that handle checkout,
plan switching, cancellation, unit management, and billing state — all connected
to Convex. Complete these three extra steps to use them.

### 7. Install UI primitives

The widgets are built on [Ark UI](https://ark-ui.com) headless primitives.
Install the adapter for your framework:

**React**

```sh
npm install @ark-ui/react
```

**Svelte**

```sh
npm install @ark-ui/svelte
```

### 8. Install Tailwind CSS

The widgets use [Tailwind CSS v4](https://tailwindcss.com/docs/installation). If
your project doesn't have Tailwind yet, install it following the
[official guide](https://tailwindcss.com/docs/installation).

### 9. Import styles

Add the component's design system import to your CSS entry point, **after** the
Tailwind import:

```css
@import "tailwindcss";
@import "@mmailaender/convex-creem/styles";
```

This registers the component's design tokens, base styles, and `@source`
directives so Tailwind scans the library's component files automatically.

**You're ready to use the UI widgets.** Continue with the scenarios below.

---

## Entity Model

By default, billing is scoped to the **authenticated user** — the `entityId`
returned from your resolver is used as the billing entity. All
`creem.api({ resolve })` functions, checkout metadata, and webhook resolution
automatically use this entity.

For **organization or team billing**, return the org ID as `entityId`:

```ts
const resolve: ApiResolver = async (ctx) => {
  const user = await ctx.runQuery(api.users.currentUser);
  const org = await ctx.runQuery(api.orgs.getActiveOrg);
  return {
    userId: user._id,
    email: user.email,
    entityId: org?._id ?? user._id, // org billing or personal billing
  };
};
```

All billing operations scope to the `entityId`. Webhooks resolve
`convexBillingEntityId` from checkout metadata (falls back to `convexUserId`).
No other code changes needed.

For access control details, see
[Security & Access Control](#security--access-control).

---

## Scenarios

Both Svelte and React widgets share **identical props and APIs** — only the
import path and framework boilerplate differ.

> **Convention:** Where the markup is identical in both frameworks, examples are
> shown once. The only recurring difference is `class=` (Svelte) vs `className=`
> (React) when passing CSS classes. Where Svelte and React syntax diverges (e.g.
> children rendering), both versions are shown.

### Wire the billing API

Every widget needs a `ConnectedBillingApi` object. Create it once in your layout
or page component:

**Svelte**

```svelte
<script lang="ts">
  import { setupConvex } from "convex-svelte";
  import {
    Subscription, Product, BillingPortal,
    type ConnectedBillingApi,
  } from "@mmailaender/convex-creem/svelte";
  import { api } from "../convex/_generated/api.js";

  setupConvex(import.meta.env.VITE_CONVEX_URL);

  const billingApi: ConnectedBillingApi = {
    uiModel: api.billing.uiModel,
    checkouts: { create: api.billing.checkoutsCreate },
    subscriptions: {
      update: api.billing.subscriptionsUpdate,
      cancel: api.billing.subscriptionsCancel,
      resume: api.billing.subscriptionsResume,
    },
    customers: { portalUrl: api.billing.customersPortalUrl },
  };
</script>
```

**React**

```tsx
import {
  Subscription,
  Product,
  BillingPortal,
  type ConnectedBillingApi,
} from "@mmailaender/convex-creem/react";
import { api } from "../convex/_generated/api";

const billingApi: ConnectedBillingApi = {
  uiModel: api.billing.uiModel,
  checkouts: { create: api.billing.checkoutsCreate },
  subscriptions: {
    update: api.billing.subscriptionsUpdate,
    cancel: api.billing.subscriptionsCancel,
    resume: api.billing.subscriptionsResume,
  },
  customers: { portalUrl: api.billing.customersPortalUrl },
};
```

Wrap your billing UI once with `CreemConvexProvider`; widgets read the connected
API and optional catalog from context.

```svelte
<CreemConvexProvider api={billingApi} catalog={billingCatalog}>
  <Subscription.Root plans={["pro"]} />
  <BillingPortal />
</CreemConvexProvider>
```

Convex-Creem distinguishes two trial paths:

- Creem-managed paid subscription trials are configured on paid Creem products.
  In the catalog they remain `category: "paid"` recurring plans, and Creem owns
  checkout, card collection, subscription state, and `subscription.trialing`.
- App-owned no-card trials use `category: "trial"` with `billingType: "custom"`.
  They do not create a Creem subscription. Convex-Creem records activation
  history and the current app-plan assignment so the billing UI can show,
  activate, and hide the offer.

App-owned catalog plans such as `category: "free"` and `category: "trial"` are
rendered by `Subscription.Root` alongside paid plans. Default styled pricing
cards treat app-owned trials as a secondary full-width offer below the main
comparison grid, because no-card trials are usually an entry path rather than a
long-term destination plan. If users can actively pick one, expose
`api.plans.activate` with an app mutation that accepts `{ planId: string }`. Use
`onBeforePlanActivation` for sign-in or consent gates.

App-owned no-card trials can be limited to once per billing entity from the
catalog. If the trial is an entry path for a specific plan line, add an
`eligibilityScopeId` to the trial and the plans that replace it, then enable
`expiresWhenScopeHasNonTrialPlan`. The scope is separate from `groupId`: use
`groupId` for pricing layout/audience tabs and `eligibilityScopeId` for mutually
exclusive entitlement alternatives.

```ts
{
  planId: "trial",
  category: "trial",
  billingType: "custom",
  eligibilityScopeId: "base",
  eligibility: {
    oncePerEntity: true,
    hideWhenIneligible: true,
    expiresWhenScopeHasNonTrialPlan: true,
  },
},
{
  planId: "free",
  category: "free",
  billingType: "custom",
  eligibilityScopeId: "base",
},
{
  planId: "premium",
  category: "paid",
  billingType: "recurring",
  eligibilityScopeId: "base",
}
```

Scoped trial expiry only looks at active or scheduled non-trial plans in the
same `eligibilityScopeId`. This keeps addon trials available when a customer
chooses a base subscription, as long as the addon plans use a different scope.

In the app mutation, activate the plan through the component:

```ts
await creem.appPlans.activate(ctx, {
  entityId,
  planId: "trial",
  activatedByUserId,
});
```

The component enforces the once-per-entity rule and the default widget hides an
ineligible trial card when `hideWhenIneligible` is enabled. Scoped expiry uses
explicit active/scheduled billing state, not the widget's implicit first-free
fallback, so public or pre-choice pricing pages can still show the trial. Your
app still owns quota enforcement and lock states; Convex-Creem owns the app-plan
assignment row used by the billing UI and snapshot.

You can also pass `i18n` at the provider level to replace default UI labels and
format dates/currency. This covers default cards, dialogs, billing history,
portal buttons, recovery banners, credits, and accessibility labels. Product
names and descriptions are still merchant-owned content; localize them in your
catalog or with composition slots.

```svelte
<CreemConvexProvider
  api={billingApi}
  catalog={billingCatalog}
  i18n={{
    locale: "de-DE",
    labels: {
      subscription: {
        currentPlan: "Aktueller Tarif",
        subscribe: "Abonnieren",
        switchPlan: "Tarif wechseln",
        cancelSubscription: "Abo beenden",
        unitCount: (units) => `${units} Einheit${units === 1 ? "" : "en"}`,
      },
      priceInterval: {
        "every-month": "/Monat",
        "every-year": "/Jahr",
      },
      billingHistory: {
        title: "Rechnungsverlauf",
      },
    },
  }}
>
  <Subscription.Root plans={["pro"]} />
</CreemConvexProvider>
```

> The `ConnectedBillingApi` object is the same shape in both frameworks. Only
> the Convex client setup differs: `setupConvex()` in Svelte vs
> `<ConvexProvider>` in React (see
> [convex-svelte](https://github.com/mmailaender/convex-svelte) and
> [convex/react](https://docs.convex.dev/client/react) docs).

### 1. Subscriptions

#### 1.1 Standard subscription plans

A typical pricing page with Free / Basic / Premium / Enterprise tiers. The
billing toggle auto-derives from the cycles present in registered plans.

```svelte
<Subscription.Root>
  <Subscription.Item type="free" title="Free" description="Up to 3 users" />
  <Subscription.Item
    planId="basic"
    type="single"
    productIds={{
      "every-month": "prod_basic_monthly",
      "every-year": "prod_basic_yearly",
    }}
  />
  <Subscription.Item
    planId="premium"
    type="single"
    recommended
    productIds={{
      "every-month": "prod_premium_monthly",
      "every-year": "prod_premium_yearly",
    }}
  />
  <Subscription.Item
    type="enterprise"
    title="Enterprise"
    contactUrl="https://example.com/sales"
  />
</Subscription.Root>
<BillingPortal />
```

**What you get:**

- Pricing cards with auto-resolved titles, descriptions (rendered as Markdown),
  and prices from Creem product data
- Billing cycle toggle (monthly/yearly) — hidden when all plans share a single
  cycle
- "Current plan" badge on the active subscription
- Plan switching with confirmation dialog
- Trial countdown badge
- Cancel / resume subscription (with confirmation dialog)
- Scheduled cancellation banner with "Undo" button

#### 1.2 Unit-based subscriptions

Two workflows for unit-based pricing:

**User-selectable units** — the customer picks a quantity before checkout:

```svelte
<Subscription.Root
  plans={["team", "business"]}
  showUnitPicker
/>
```

**Auto-derived units** — pass a fixed count (e.g. org member count) to checkout:

```svelte
<Subscription.Root
  plans={["team"]}
  units={orgMemberCount}
/>
```

When `subscriptions.update` is provided in the API, active unit-based plans show
a "Change units" control.

> **Tip:** For auto-derived units, keep the subscription in sync with your data.
> When your member count changes, call `subscriptions.update` with the new
> `units` so the billing reflects the current quantity.

**Individual vs Teams** — define stable plan IDs in a catalog, then render those
IDs from `groups`. The root renders an internal selector and computes billing
intervals from only the active group:

```svelte
<script lang="ts">
  const billingCatalog = defineBillingCatalog({
    version: "2026-05-01",
    plans: [
      {
        planId: "basic-individual",
        category: "paid",
        billingType: "recurring",
        creemProductIds: { "every-month": env.CREEM_BASIC_INDIVIDUAL_MONTHLY },
      },
      {
        planId: "basic-team",
        category: "paid",
        billingType: "recurring",
        pricingModel: "unit",
        creemProductIds: { "every-month": env.CREEM_BASIC_TEAM_MONTHLY },
      },
    ],
  } as const);
</script>

<Subscription.Root
  showUnitPicker
  groups={[
    {
      value: "individual",
      label: "Individual",
      plans: plansOf(billingCatalog, ["basic-individual"]),
    },
    {
      value: "teams",
      label: "Teams",
      plans: plansOf(billingCatalog, ["basic-team"]),
    },
  ]}
/>
```

### 2. Products

#### 2.1 Single one-time product

A standalone product purchased once. Shows "Owned" after purchase:

```svelte
<Product.Root>
  <Product.Item type="one-time" productId="prod_license" />
</Product.Root>
```

#### 2.2 Repeating product (consumable)

Can be purchased multiple times — no "Owned" badge:

```svelte
<Product.Root>
  <Product.Item type="recurring" productId="prod_credits" title="100 Credits" />
</Product.Root>
```

For credit packs, keep the credit amount in your server-owned billing catalog
and let the webhook derive the grant from the purchased Creem product ID:

```ts
const billingCatalog = defineBillingCatalog({
  version: "2026-05-11",
  plans: [
    {
      planId: "ai-credits-100",
      category: "paid",
      billingType: "onetime",
      creemProductIds: { custom: process.env.CREEM_ONETIME_CREDITS! },
      creditGrant: {
        amount: "100",
        accountName: "credits",
        refundBehavior: "revoke_on_full_refund",
      },
    },
  ],
} as const);

export const creem = new Creem(components.creem, { billingCatalog });
```

`refundBehavior` answers one question: what should happen to credits that were
granted when this product is refunded?

`"revoke_on_full_refund"` is the default. If the customer gets a full refund,
the full granted credit amount is removed. If the customer gets a partial
refund, nothing happens to the credits.

Example: the customer bought 100 credits.

- 100% refund removes 100 credits.
- 50% refund removes 0 credits.

This is the safest default for most apps because a purchase is only treated as
fully undone when the full order is refunded.

`"prorate"` removes credits proportional to the refund amount.

Example: the customer bought 100 credits.

- 100% refund removes 100 credits.
- 50% refund removes 50 credits.
- 25% refund removes 25 credits.

This is useful when the product is clearly divisible, like credit packs.

`"debit"` removes the full granted amount for any successful refund.

Example: the customer bought 100 credits.

- 100% refund removes 100 credits.
- 50% refund removes 100 credits.
- A tiny refund still removes 100 credits.

This is useful when any refund should invalidate the whole grant.

`"none"` means the library does not touch credits on refunds.

Example: the customer bought 100 credits.

- 100% refund removes 0 credits.
- 50% refund removes 0 credits.

Use this when your app wants to handle refund reversals manually, or when
granted credits should never be revoked automatically.

For deployed Convex functions, set the server-side product ID with Convex, for
example `npx convex env set CREEM_ONETIME_CREDITS prod_...`. Vite `VITE_*`
variables are for the browser demo and should not be the trusted source for
webhook fulfillment.

#### 2.3 Credit balance composition

`Credits.Root` renders a default balance card, or you can compose the slots and
call `credits.refresh()` after app-owned backend actions debit credits:

```svelte
<Credits.Root unitLabel="credits">
  {#snippet children(credits)}
    <Credits.Title />
    <Credits.Amount />
    <Credits.Error />

    <button
      onclick={async () => {
        await convexClient.action(api.billing.generateImage, {});
        await credits.refresh();
      }}
    >
      Generate image
    </button>
  {/snippet}
</Credits.Root>
```

The spend amount should live in the backend action, not in the credit widget.

#### 2.4 Mutually exclusive product group

Use the `transition` prop to define upgrade paths between products. When the
user owns a lower-tier product, only valid upgrade paths are shown:

```svelte
<Product.Root
  transition={[
    {
      from: "prod_basic_license",
      to: "prod_premium_license",
      kind: "via_product",
      viaProductId: "prod_basic_to_premium_upgrade",
    },
  ]}
>
  <Product.Item type="one-time" productId="prod_basic_license" />
  <Product.Item type="one-time" productId="prod_premium_license" />
</Product.Root>
```

**Transition kinds:**

- **`via_product`** — checkout uses a dedicated upgrade product (delta pricing)
- **`direct`** — checkout uses the target product directly

### 3. Billing Portal

`<BillingPortal>` opens the Creem customer billing portal. It auto-hides when
the billing entity has no Creem customer record.

Pass `permissions` to control who can access the portal (e.g. only admins):

```svelte
<BillingPortal permissions={{ canAccessPortal: isAdmin }} />
```

```svelte
<!-- After a subscription group -->
<BillingPortal />

<!-- Standalone with custom label -->
<BillingPortal>Manage billing & invoices</BillingPortal>
```

### 4. Feature Gating

Use `BillingGate` to conditionally render UI based on available billing actions
from the billing snapshot:

**Svelte**

```svelte
<BillingGate snapshot={snapshot} requiredActions="portal">
  {#snippet children()}
    <p>You have portal access.</p>
  {/snippet}
  {#snippet fallback()}
    <p>Upgrade to access the billing portal.</p>
  {/snippet}
</BillingGate>
```

**React**

```tsx
<BillingGate
  snapshot={snapshot}
  requiredActions="portal"
  fallback={<p>Upgrade to access the billing portal.</p>}
>
  <p>You have portal access.</p>
</BillingGate>
```

Available actions: `checkout`, `portal`, `cancel`, `reactivate`,
`switch_interval`, `update_units`, `contact_sales`.

### 5. Checkout Success

Show a confirmation banner when the user returns from checkout. The component
parses Creem's query parameters automatically:

```svelte
<CheckoutSuccessSummary />
```

---

## Advanced

### Webhook event middleware

`registerRoutes` accepts an optional `events` object to run app-specific logic
alongside the component's automatic handling:

```ts
creem.registerRoutes(http, {
  path: "/creem/events", // default
  events: {
    "checkout.completed": async (ctx, event) => {
      // ctx is a Convex mutation context
      // event is the typed Creem webhook entity
      // Example: send confirmation email, grant entitlements, log analytics
    },
    "subscription.update": async (ctx, event) => {
      const subscription = event.object;
      console.log("Subscription updated:", subscription.id);
    },
  },
});
```

Your handlers run **after** the component's built-in processing
(customer/subscription/order upserts). The `ctx` is a Convex mutation context —
you can read/write to your own tables.

**Supported events:**

`registerRoutes` verifies and dispatches these event names to custom `events`
handlers. Built-in Convex sync runs for checkout, subscription, and refund
events where applicable; dispute events are available to custom handlers.

**Checkout**

- `checkout.completed`

**Subscriptions**

- `subscription.active`
- `subscription.paid`
- `subscription.canceled`
- `subscription.scheduled_cancel`
- `subscription.past_due`
- `subscription.expired`
- `subscription.trialing`
- `subscription.paused`
- `subscription.unpaid`
- `subscription.update`

**Refunds and disputes**

- `refund.created`
- `dispute.created`

### Security & Access Control

**Auth is the app's responsibility.** The component is a sync engine — it reads
from Convex DB and writes to the Creem API. Every class method takes explicit
args; there is no hidden auth layer.

**Choose your approach:**

- **Quick start** — use [`creem.api({ resolve })`](#4-configure-billing) to
  generate ready-to-export Convex functions. Each one calls your `resolve`
  callback to authenticate and determine the `entityId`. The billing entity is
  derived from the authenticated session, never from client input. See
  [Step 4: Configure billing](#4-configure-billing) and the
  [`creem.api({ resolve })` reference](#creemapi-resolve---convenience-exports).

- **Full control** — use the
  [resource namespaces](#resource-namespaces--creemnamespace)
  (`creem.subscriptions.*`, `creem.checkouts.*`, etc.) directly in your own
  Convex functions. You handle auth, entity resolution, and permission checks
  yourself.

  The library exports **shared arg validators** that match exactly what the
  connected widgets send. Use them to keep your custom functions in sync:

  | Export                   | Used by                                          |
  | ------------------------ | ------------------------------------------------ |
  | `checkoutCreateArgs`     | `<Subscription.Root>`, `<Product.Root>`          |
  | `subscriptionUpdateArgs` | `<Subscription.Root>` (plan switch, unit update) |
  | `transactionsSearchArgs` | `<BillingHistory>`                               |
  | `subscriptionCancelArgs` | `<Subscription.Root>` (cancel button)            |
  | `subscriptionResumeArgs` | `<Subscription.Root>` (resume button)            |
  | `subscriptionPauseArgs`  | `<Subscription.Root>` (pause button)             |

  Example:

```ts
// convex/billing.ts
import {
  Creem,
  checkoutCreateArgs,
  subscriptionCancelArgs,
} from "@mmailaender/convex-creem";
import { ConvexError } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api, components } from "./_generated/api";

const creem = new Creem(components.creem);

async function resolveAuth(ctx) {
  const session = await ctx.runQuery(api.auth.getSession);
  if (!session) throw new ConvexError("Not authenticated");
  const org = await ctx.runQuery(api.orgs.getActiveOrg);
  return {
    userId: session.userId,
    email: session.user.email,
    entityId: org?._id ?? session.userId,
    role: session.user.role,
  };
}

// Admin-only: create checkout
export const checkoutsCreate = action({
  args: checkoutCreateArgs,
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx);
    if (auth.role !== "admin") throw new ConvexError("Forbidden");
    return await creem.checkouts.create(ctx, {
      entityId: auth.entityId,
      userId: auth.userId,
      email: auth.email,
      ...args,
    });
  },
});

// Admin-only: cancel subscription
export const subscriptionsCancel = mutation({
  args: subscriptionCancelArgs,
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx);
    if (auth.role !== "admin") throw new ConvexError("Forbidden");
    await creem.subscriptions.cancel(ctx, { entityId: auth.entityId, ...args });
  },
});
```

**UI-side permissions** — `BillingPermissions` controls which buttons are
enabled in the widgets. This is cosmetic gating only; enforce real permissions
server-side.

```ts
type BillingPermissions = {
  canCheckout?: boolean;
  canChangeSubscription?: boolean;
  canCancelSubscription?: boolean;
  canResumeSubscription?: boolean;
  canUpdateUnits?: boolean;
  canAccessPortal?: boolean;
};
```

```svelte
<script lang="ts">
  const isAdmin = $derived(currentUser?.role === "admin" || currentUser?.role === "owner");
  const permissions = $derived({
    canCheckout: isAdmin,
    canChangeSubscription: isAdmin,
    canCancelSubscription: isAdmin,
    canResumeSubscription: isAdmin,
    canUpdateUnits: isAdmin,
  });
</script>

<CreemConvexProvider api={billingApi} {permissions}>
  <Subscription.Root>
    ...
  </Subscription.Root>
</CreemConvexProvider>
```

When a permission is `false`, the button renders as disabled (greyed out). When
omitted or `undefined`, all actions default to enabled.

### Pre-checkout gate — `onBeforeCheckout`

Both `<Subscription.Root>` and `<Product.Root>` accept an `onBeforeCheckout`
callback that fires **before** the widget calls `checkouts.create`. Return
`true` to proceed, `false` to abort silently.

This is a generic hook — use it for authentication gates, terms acceptance,
confirmation dialogs, analytics, or any logic that must run before checkout.

```svelte
<CreemConvexProvider
  api={billingApi}
  onBeforeCheckout={(intent) => {
    if (!currentUser) {
      pendingCheckout.save(intent);
      openSignInDialog();
      return false;
    }
    return true;
  }}
>
  <Subscription.Root>
    ...
  </Subscription.Root>
</CreemConvexProvider>
```

**`CheckoutIntent`** — the object passed to the callback:

```ts
type CheckoutIntent = {
  productId: string;
  units?: number;
};
```

#### Auto-resume after sign-in

The widget automatically resumes a pending checkout when the user becomes
authenticated. The full flow:

1. Unauthenticated user clicks "Subscribe" → `onBeforeCheckout` fires
2. Your callback saves the intent via `pendingCheckout.save(intent)`, opens your
   sign-in dialog/redirect, and returns `false`
3. After sign-in, the Convex query re-fires → `model.user` becomes non-null
4. The widget detects the pending checkout and auto-triggers `checkouts.create`

This works for both **modal auth** (Clerk, Auth0 popup) and **redirect auth**
(OAuth) — no manual resume code needed.

**Safety:** The widget skips auto-resume if the user already has an active
subscription (`<Subscription.Root>`) or already owns the product
(`<Product.Root>`), preventing duplicate purchases after sign-in.

`pendingCheckout` is a tiny sessionStorage-based helper exported from the
library:

```ts
import { pendingCheckout } from "@mmailaender/convex-creem/svelte";

pendingCheckout.save(intent); // store before sign-in
pendingCheckout.load(); // read + auto-clear (used internally by widgets)
pendingCheckout.clear(); // manual clear if needed
```

### Custom billing UI model

`uiModel` (from `creem.api({ resolve })`) returns everything the connected
widgets need. If you need app-specific fields, write your own query using
`creem.getBillingModel()`:

```ts
import { query } from "./_generated/server";

export const getCustomBillingModel = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    const billingData = await creem.getBillingModel(ctx, {
      entityId: user?._id ?? null,
      user: user ? { _id: user._id, email: user.email } : null,
    });
    return {
      ...billingData,
      teamSize: user?.teamSize,
      featureFlags: user?.featureFlags,
    };
  },
});
```

### Creem server

The SDK uses the production API by default. The examples pass `server: "test"`
unless `CREEM_SERVER=prod` is set in Convex env. For your own app, set the
server explicitly:

```bash
npx convex env set CREEM_SERVER test
```

Use `CREEM_SERVER=prod` or omit `server` to use the default Creem production
endpoint.

---

## API Reference

### Resource namespaces — `creem.<namespace>.*`

All methods take explicit arguments. Use them directly in your own Convex
functions, or let `creem.api({ resolve })` generate ready-to-export wrappers.

**`creem.subscriptions.*`**

| Method                                                                                          | Data source                  | Description                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.getCurrent(ctx, { entityId })`                                                                | Convex DB                    | Current active subscription with product join                                                                                                                                                                                                      |
| `.list(ctx, { entityId })`                                                                      | Convex DB                    | Active subscriptions (excludes ended + expired trials)                                                                                                                                                                                             |
| `.listAll(ctx, { entityId })`                                                                   | Convex DB                    | All subscriptions including ended                                                                                                                                                                                                                  |
| `.update(ctx, { entityId, subscriptionId?, productId?, freePlanId?, units?, updateBehavior? })` | Creem API / Convex scheduler | Unified plan switch (`productId`), paid-to-free switch (`freePlanId`), or unit update (`units`). Pass `subscriptionId` for multiple active subscriptions. Paid-to-free defaults to `updateBehavior: "period-end"` and also supports `"immediate"`. |
| `.cancelScheduledUpdate(ctx, { entityId, subscriptionId? })`                                    | Convex DB / Creem API        | Undo a pending app-side period-end update. If the pending update was a paid-to-free switch, the Creem scheduled cancellation is resumed.                                                                                                           |
| `.cancel(ctx, { entityId, revokeImmediately? })`                                                | Creem API                    | Cancel subscription                                                                                                                                                                                                                                |
| `.pause(ctx, { entityId })`                                                                     | Creem API                    | Pause an active subscription                                                                                                                                                                                                                       |
| `.resume(ctx, { entityId })`                                                                    | Creem API                    | Resume a paused or scheduled-cancel subscription                                                                                                                                                                                                   |

Set `new Creem(components.creem, { cancelMode: "scheduled" })` to make normal
cancel actions end at the paid period boundary and surface
`subscription.scheduled_cancel`. Pass `revokeImmediately` on an individual
cancel call when you need to override that default.

**`creem.checkouts.*`**

| Method                                                                                                              | Data source | Description                                                                  |
| ------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| `.create(ctx, { entityId, userId, email, productId, successUrl?, fallbackSuccessUrl?, units?, metadata?, theme? })` | Creem API   | Create checkout URL with 3-tier `successUrl` resolution and optional `theme` |

**`creem.products.*`**

| Method                     | Data source | Description                                         |
| -------------------------- | ----------- | --------------------------------------------------- |
| `.list(ctx, options?)`     | Convex DB   | All synced products (public — no `entityId` needed) |
| `.get(ctx, { productId })` | Convex DB   | Single product by ID (public)                       |

**`creem.customers.*`**

| Method                          | Data source | Description                 |
| ------------------------------- | ----------- | --------------------------- |
| `.retrieve(ctx, { entityId })`  | Convex DB   | Customer record by entity   |
| `.portalUrl(ctx, { entityId })` | Creem API   | Customer billing portal URL |

**`creem.orders.*`**

| Method                     | Data source | Description     |
| -------------------------- | ----------- | --------------- |
| `.list(ctx, { entityId })` | Convex DB   | One-time orders |

**Composite helpers (top-level methods)**

| Method                                            | Description                                                                                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `creem.getBillingModel(ctx, { entityId, user? })` | Aggregates the widget model into a single object for connected UI. Graceful when `entityId` is null (returns public catalog only).                   |
| `creem.getBillingSnapshot(ctx, { entityId })`     | Billing state with `subscriptions[]`, `orders[]`, `appPlanAssignments[]`, derived `access[]`, `paymentRecoveryState`, and `availableBillingActions`. |

### `creem.api({ resolve })` — convenience exports

Generates ready-to-export Convex function definitions. Each function calls your
`resolve` callback, then delegates to the corresponding namespace method.

| Export                  | Wraps                   | Type   | Description                                                                        |
| ----------------------- | ----------------------- | ------ | ---------------------------------------------------------------------------------- |
| `uiModel`               | `getBillingModel`       | query  | Calls `resolve()`, then `getBillingModel`. Graceful when unauthenticated.          |
| `snapshot`              | `getBillingSnapshot`    | query  | Calls `resolve()`, then `getBillingSnapshot`. Returns `null` when unauthenticated. |
| `checkouts.create`      | `checkouts.create`      | action | Auto-resolves auth                                                                 |
| `subscriptions.update`  | `subscriptions.update`  | action | Auto-resolves auth                                                                 |
| `subscriptions.cancel`  | `subscriptions.cancel`  | action | Auto-resolves auth                                                                 |
| `subscriptions.resume`  | `subscriptions.resume`  | action | Auto-resolves auth                                                                 |
| `subscriptions.pause`   | `subscriptions.pause`   | action | Auto-resolves auth                                                                 |
| `subscriptions.list`    | `subscriptions.list`    | query  | Auto-resolves auth                                                                 |
| `subscriptions.listAll` | `subscriptions.listAll` | query  | Auto-resolves auth                                                                 |
| `products.list`         | `products.list`         | query  | Public, no auth needed                                                             |
| `products.get`          | `products.get`          | query  | Public, no auth needed                                                             |
| `customers.retrieve`    | `customers.retrieve`    | query  | Auto-resolves auth                                                                 |
| `customers.portalUrl`   | `customers.portalUrl`   | action | Auto-resolves auth                                                                 |
| `transactions.search`   | `transactions.search`   | action | Auto-resolves auth and returns paginated transaction history                       |
| `orders.list`           | `orders.list`           | query  | Auto-resolves auth                                                                 |

`snapshot` and `creem.getBillingSnapshot(...)` return the backend billing
snapshot:

```ts
{
  entityId: "org_123",
  catalogVersion: "2026-05",
  subscriptions: [
    {
      planId: "private",
      productId: "prod_20GpOqRYWpSpU1pv1KCPet",
      subscriptionId: "sub_123",
      status: "active",
      recurringCycle: "every-year",
      kind: "base",
      units: 3,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2026-06-18T00:00:00.000Z",
    },
  ],
  orders: [
    {
      planId: "lifetime-export",
      orderId: "ord_123",
      productId: "prod_7kP3mAqR9xT2vB6nLwY8Cs",
      status: "paid",
    },
  ],
  appPlanAssignments: [
    {
      entityId: "org_123",
      planId: "free",
      status: "scheduled",
      startsAt: "2026-06-18T00:00:00.000Z",
      source: "paid_to_free",
      subscriptionId: "sub_123",
      createdAt: "2026-05-18T00:00:00.000Z",
      updatedAt: "2026-05-18T00:00:00.000Z",
    },
  ],
  access: [
    {
      source: "creem_subscription",
      kind: "subscription",
      planId: "private",
      productId: "prod_20GpOqRYWpSpU1pv1KCPet",
      subscriptionId: "sub_123",
      status: "active",
      recurringCycle: "every-year",
    },
    {
      source: "creem_order",
      kind: "one_time",
      planId: "lifetime-export",
      productId: "prod_7kP3mAqR9xT2vB6nLwY8Cs",
      orderId: "ord_123",
      status: "paid",
    },
  ],
  paymentRecoveryState: "none",
  availableBillingActions: ["portal", "cancel"],
  resolvedAt: "2026-05-18T00:00:00.000Z",
}
```

Mental model:

- `subscriptions` mirrors Creem recurring subscriptions and supports multiple
  simultaneous rows, such as a base subscription plus add-ons.
- `orders` mirrors Creem orders. Subscription checkouts also create orders, but
  the snapshot only exposes one-time orders as owned one-time access.
- `appPlanAssignments` stores Convex-Creem-owned current or scheduled app-owned
  plans such as free plans, no-card trials, and custom internal plans.
- `access` is a derived read model that combines active subscriptions, paid
  one-time orders, and active app-plan assignments. It is not a separate table
  and should not be treated as the source of truth.

### Infrastructure

| Method                                           | Description                                 |
| ------------------------------------------------ | ------------------------------------------- |
| `creem.syncProducts(ctx)`                        | Pull products from Creem API into Convex DB |
| `creem.registerRoutes(http, { path?, events? })` | Register webhook HTTP routes                |

### Direct API access — `creem.sdk.*`

The resource namespaces above cover all **billing features that stay in sync**
with Convex via webhooks. Some Creem API resources have no webhook support, so
the component cannot mirror them in Convex DB. For these, use `creem.sdk.*`
directly inside your own Convex actions — it's the same Creem SDK client,
already configured with your API key:

| Resource         | Synced to Convex?    | Access                     |
| ---------------- | -------------------- | -------------------------- |
| Subscriptions    | Yes (webhook)        | `creem.subscriptions.*`    |
| Checkouts        | Yes (webhook)        | `creem.checkouts.*`        |
| Products         | Yes (webhook + sync) | `creem.products.*`         |
| Customers        | Yes (webhook)        | `creem.customers.*`        |
| Orders           | Yes (webhook)        | `creem.orders.*`           |
| **Licenses**     | No webhook           | `creem.sdk.licenses.*`     |
| **Discounts**    | No webhook           | `creem.sdk.discounts.*`    |
| **Transactions** | No webhook           | `creem.sdk.transactions.*` |

```ts
import { action } from "./_generated/server";
import { v } from "convex/values";

// Example: create a discount (not synced — Creem has no webhook for discounts)
export const createDiscount = action({
  args: { code: v.string(), percentage: v.number() },
  handler: async (ctx, args) => {
    return await creem.sdk.discounts.create({
      name: args.code,
      code: args.code,
      type: "percentage",
      percentage: args.percentage,
      duration: "forever",
      appliesTo: [],
    });
  },
});
```

---

## Component Reference

All components share **identical props** across Svelte and React.

- **Import:** `@mmailaender/convex-creem/svelte` or
  `@mmailaender/convex-creem/react`
- **CSS class prop:** `class` in Svelte, `className` in React
- **Children:** Svelte `Snippet` / React `ReactNode`
- **Svelte** components use Svelte 5 runes and snippet rendering
  (`{@render ...}`)

See the [Svelte example](example-svelte) and [React example](example-react) for
complete integrations.

### Widgets

These query Convex directly and manage billing state end-to-end.

#### `<CreemConvexProvider>`

Required context boundary for connected widgets. Render it around any
`Subscription`, `Product`, `BillingPortal`, `BillingHistory`, or `Credits`
widgets.

| Prop                     | Type                                                          | Default | Description                                                                |
| ------------------------ | ------------------------------------------------------------- | ------- | -------------------------------------------------------------------------- |
| `api`                    | `ConnectedBillingApi`                                         | —       | **Required.** Connected Convex function references                         |
| `catalog`                | `PlanCatalog`                                                 | —       | App-owned billing catalog used by subscription widgets and plan helpers    |
| `defaultCycle`           | `RecurringCycle`                                              | —       | Default billing cycle for subscription widgets                             |
| `permissions`            | `BillingPermissions`                                          | enabled | Provider-level UI permission flags. Enforce real authorization server-side |
| `onBeforeCheckout`       | `(intent: CheckoutIntent) => Promise<boolean> \| boolean`     | —       | Provider-level checkout guard. Return `false` to abort                     |
| `onBeforePlanChange`     | `(intent: PlanChangeIntent) => Promise<boolean> \| boolean`   | —       | Provider-level paid plan switch/unit update guard. Return `false` to abort |
| `onBeforePlanActivation` | `(intent: { planId: string }) => Promise<boolean> \| boolean` | —       | Provider-level app-owned plan activation guard. Return `false` to abort    |
| `i18n`                   | `BillingI18n`                                                 | default | Locale, label, date, and currency formatter overrides                      |
| `children`               | `Snippet` / `ReactNode`                                       | —       | Connected billing UI                                                       |

Connected widgets no longer accept direct `api={...}` props. Pass the API to
`CreemConvexProvider` once.

#### `<Subscription.Root>`

Container for subscription plan cards. Handles billing cycle toggle, checkout,
plan switching, cancellation, and unit management.

| Prop                     | Type                                                                                           | Default                                      | Description                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog`                | `PlanCatalog`                                                                                  | provider catalog                             | Local catalog override                                                                                                                                    |
| `plans`                  | `readonly string[]`                                                                            | —                                            | Catalog plan IDs rendered by the default pricing layout                                                                                                   |
| `groups`                 | `SubscriptionGroupRegistration[]`                                                              | —                                            | Grouped plan definitions for audience selectors, e.g. Individual vs Teams                                                                                 |
| `defaultGroup`           | `string`                                                                                       | first group                                  | Initial uncontrolled group value                                                                                                                          |
| `group`                  | `string`                                                                                       | —                                            | Controlled group value                                                                                                                                    |
| `onGroupChange`          | `(group: string) => void`                                                                      | —                                            | Called when the active group changes                                                                                                                      |
| `groupSelector`          | `"auto" \| "hidden" \| "external"`                                                             | `"auto"`                                     | Group selector placement                                                                                                                                  |
| `defaultCycle`           | `RecurringCycle`                                                                               | provider default → `"every-month"`           | Initial uncontrolled billing cycle                                                                                                                        |
| `cycle`                  | `RecurringCycle`                                                                               | —                                            | Controlled billing cycle                                                                                                                                  |
| `onCycleChange`          | `(cycle: RecurringCycle) => void`                                                              | —                                            | Called when the active billing cycle changes                                                                                                              |
| `intervalSelector`       | `"auto" \| "hidden" \| "external"`                                                             | `"auto"`                                     | Interval selector placement                                                                                                                               |
| `cycleBadges`            | `Partial<Record<SupportedRecurringCycle, string>>`                                             | —                                            | Optional badges next to billing interval labels, e.g. `{ "every-year": "-20%" }`                                                                          |
| `permissions`            | `BillingPermissions`                                                                           | provider permissions                         | Local UI permission overrides                                                                                                                             |
| `class`/`className`      | `string`                                                                                       | `""`                                         | Wrapper CSS class                                                                                                                                         |
| `successUrl`             | `string`                                                                                       | product's `defaultSuccessUrl` → current page | Override redirect after checkout. When omitted, uses the product's `defaultSuccessUrl` from Creem; if that is also unset, falls back to the current page. |
| `units`                  | `number`                                                                                       | —                                            | Auto-derived unit count for unit-based plans                                                                                                              |
| `showUnitPicker`         | `boolean`                                                                                      | `false`                                      | Show quantity picker on unit-based cards                                                                                                                  |
| `columns`                | `"auto" \| 1 \| 2 \| 3 \| 4`                                                                   | `"auto"`                                     | Preferred pricing card columns. `"auto"` derives the layout from visible plan count and plan type.                                                        |
| `updateBehavior`         | `UpdateBehavior \| ((intent: UpdateBehaviorIntent) => UpdateBehavior)`                         | `"proration-charge-immediately"`             | Paid subscription update behavior for paid-to-paid plan switches and unit changes.                                                                        |
| `freePlanUpdateBehavior` | `FreePlanUpdateBehavior \| ((intent: FreePlanUpdateBehaviorIntent) => FreePlanUpdateBehavior)` | `"period-end"`                               | Cancellation behavior for paid-to-free or paid-to-app-owned plan switches.                                                                                |
| `unstyled`               | `boolean`                                                                                      | `false`                                      | Remove built-in visual classes from compound subscription pieces so custom children own their styling.                                                    |
| `onBeforeCheckout`       | `(intent: CheckoutIntent) => Promise<boolean> \| boolean`                                      | provider guard                               | Local checkout guard. Return `false` to abort                                                                                                             |
| `onBeforePlanChange`     | `(intent: PlanChangeIntent) => Promise<boolean> \| boolean`                                    | provider guard                               | Local paid plan switch/unit update guard. Return `false` to abort                                                                                         |
| `onBeforePlanActivation` | `(intent: { planId: string }) => Promise<boolean> \| boolean`                                  | provider guard                               | Local app-owned plan activation guard. Return `false` to abort                                                                                            |
| `labels`                 | `BillingLabelOverrides`                                                                        | provider labels                              | Override subscription labels locally for this root                                                                                                        |
| `i18n`                   | `BillingI18n`                                                                                  | provider i18n                                | Override locale, labels, or formatters locally for this root                                                                                              |
| `children`               | `Snippet` / `ReactNode`                                                                        | default cards                                | Compound subscription markup. When omitted, default pricing cards render                                                                                  |

Use `unstyled` when composing your own pricing cards with `Subscription.Grid`,
`Subscription.ItemTitle`, `Subscription.ItemPrice`,
`Subscription.ItemDescription`, `Subscription.ItemBadge`,
`Subscription.ItemCTA`, `Subscription.ItemPriceCaption`,
`Subscription.UnitPicker`, `Subscription.Cancel`, `Subscription.GroupSelector`,
or `Subscription.IntervalSelector`. The default generated pricing cards remain
the fast styled path.

Styled compound defaults use the package's `creem-base:` Tailwind variant, which
places library defaults in the base cascade layer. Consumer `class`/`className`
utilities like `font-bold`, `text-xl`, or `bg-emerald-600` therefore override
the built-in defaults without `tailwind-merge`.

**`UpdateBehavior`** controls paid subscription updates:

- `"proration-charge-immediately"` — prorate and charge the difference now
  (default)
- `"proration-charge"` — prorate, charge on next invoice
- `"proration-none"` — no proration, change takes effect on next billing cycle
- `"period-end"` — keep the current subscription active until
  `currentPeriodEnd`, then apply the target plan or unit count from a scheduled
  Convex job

The first three values map directly to Creem's paid subscription update
behavior. `updateBehavior` intentionally does not include `"immediate"` because
Creem paid-to-paid switches cannot be immediate cancellation.

**`FreePlanUpdateBehavior`** controls paid-to-free/app-owned target switches:

- `"period-end"` — schedule Creem cancellation for the billing period boundary,
  then activate the app-owned target plan at that time (default)
- `"immediate"` — call Creem cancellation with `mode: "immediate"` and assign
  the app-owned plan immediately

Paid-to-free is a cancellation flow because Creem does not have native free
subscriptions yet. Use `freePlanUpdateBehavior`, not `updateBehavior`, when you
want to choose between period-end and immediate cancellation.

Until Creem supports native scheduled subscription updates, the Creem customer
portal will still show the current subscription as active and will not know
about pending app-side paid-to-free assignment.

Use a resolver function when upgrades and downgrades should behave differently:

```tsx
<Subscription.Root
  updateBehavior={(intent) => {
    if (
      intent.fromPrice != null &&
      intent.toPrice != null &&
      intent.toPrice < intent.fromPrice
    ) {
      return "period-end";
    }
    return "proration-charge";
  }}
  freePlanUpdateBehavior="period-end"
/>
```

#### `<Subscription.Item>`

Registers a plan inside `<Subscription.Root>`. Renders nothing on its own — the
root component renders the pricing cards.

| Prop          | Type                                                 | Default                    | Description                                                                                   |
| ------------- | ---------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| `type`        | `"free" \| "single" \| "unit-based" \| "enterprise"` | —                          | **Required.** Plan type                                                                       |
| `planId`      | `string`                                             | first product ID or `type` | Unique plan identifier                                                                        |
| `groupId`     | `string`                                             | —                          | Optional pricing audience/group such as `"individual"` or `"teams"`                           |
| `groupTitle`  | `string`                                             | formatted `groupId`        | Optional label for the root group selector                                                    |
| `title`       | `string`                                             | from Creem product data    | Plan display title                                                                            |
| `description` | `string`                                             | from Creem product data    | Plan subtitle (rendered as Markdown)                                                          |
| `contactUrl`  | `string`                                             | —                          | "Contact sales" link. **Required when `type="enterprise"`**.                                  |
| `recommended` | `boolean`                                            | `false`                    | Highlight as recommended plan                                                                 |
| `productIds`  | `Partial<Record<RecurringCycle, string>>`            | —                          | Creem product IDs keyed by billing cycle. Migration escape hatch when no catalog is provided. |

**Supported billing cycles:** `every-month`, `every-three-months`,
`every-six-months`, `every-year`.

`Subscription` and `Subscription.Item` are aliases — use whichever reads better
in your markup.

#### `<Subscription.Grid>`

Layout wrapper for custom composed subscription cards.

| Prop                | Type                    | Default | Description        |
| ------------------- | ----------------------- | ------- | ------------------ |
| `class`/`className` | `string`                | `""`    | Grid CSS class     |
| `children`          | `Snippet` / `ReactNode` | —       | Subscription items |

#### `<Subscription.Group>`

Conditional group wrapper for custom composed subscription sections.

| Prop       | Type                    | Default | Description                        |
| ---------- | ----------------------- | ------- | ---------------------------------- |
| `value`    | `string`                | —       | Group ID this block renders for    |
| `label`    | `string`                | —       | Group label, retained for symmetry |
| `children` | `Snippet` / `ReactNode` | —       | Rendered when this group is active |

#### `<Subscription.GroupSelector>`

Group selector for `groupSelector="external"` composition.

| Prop                | Type                                 | Default           | Description               |
| ------------------- | ------------------------------------ | ----------------- | ------------------------- |
| `items`             | `{ value: string; label: string }[]` | root groups       | Selector items            |
| `value`             | `string \| null`                     | root active group | Controlled selected group |
| `onValueChange`     | `(value: string) => void`            | root group setter | Group change handler      |
| `class`/`className` | `string`                             | `""`              | Wrapper CSS class         |

#### `<Subscription.IntervalSelector>`

Billing-cycle selector for `intervalSelector="external"` composition.

| Prop                | Type                                               | Default             | Description                             |
| ------------------- | -------------------------------------------------- | ------------------- | --------------------------------------- |
| `cycles`            | `RecurringCycle[]`                                 | root active cycles  | Available billing cycles                |
| `value`             | `RecurringCycle`                                   | root selected cycle | Controlled selected cycle               |
| `onValueChange`     | `(cycle: RecurringCycle) => void`                  | root cycle setter   | Cycle change handler                    |
| `cycleBadges`       | `Partial<Record<SupportedRecurringCycle, string>>` | root badges         | Optional badges next to interval labels |
| `class`/`className` | `string`                                           | `""`                | Wrapper CSS class                       |

#### `<Subscription.ItemPriceCaption>`

Secondary price text for inherited unit quantities, such as `$30/mo × 3 units`.
Pair it with `<Subscription.ItemPrice>` when a custom card should show the total
bill as the primary price and the unit calculation as supporting text.

#### `<Subscription.ItemTitle>`, `<Subscription.ItemPrice>`, and `<Subscription.ItemDescription>`

Text slots for custom subscription cards. Each resolves its value from the
current `Subscription.Item` context.

| Prop                | Type     | Default | Description    |
| ------------------- | -------- | ------- | -------------- |
| `class`/`className` | `string` | `""`    | Text CSS class |

`Subscription.ItemPriceCaption` accepts the same `class`/`className` prop.

#### `<Subscription.UnitPicker>`

Composable quantity control for unit-based plans. Use it inside a custom
`<Subscription.Item>` when your card owns the markup. For inactive unit plans it
updates the checkout quantity; for the active unit plan it renders the
change/update flow when subscription unit updates are available. Pass `detailed`
to also show the current subscribed quantity above the change button. It returns
`null` on switch-plan cards so the current subscribed quantity is not mistaken
for a target quantity.

In `unstyled` mode, pass `class`/`className` plus slot classes such as
`rowClass`, `labelClass`, `actionsClass`, `secondaryClass`, `primaryClass`, and
`numberInputClass` in Svelte. React uses the same names with `Name` suffixes,
for example `rowClassName` and `primaryClassName`.

| Prop                                      | Type      | Default | Description                                     |
| ----------------------------------------- | --------- | ------- | ----------------------------------------------- |
| `class`/`className`                       | `string`  | `""`    | Wrapper CSS class                               |
| `rowClass`/`rowClassName`                 | `string`  | `""`    | Label/input row class                           |
| `labelClass`/`labelClassName`             | `string`  | `""`    | Unit label class                                |
| `actionsClass`/`actionsClassName`         | `string`  | `""`    | Edit action row class                           |
| `secondaryClass`/`secondaryClassName`     | `string`  | `""`    | Secondary button class                          |
| `primaryClass`/`primaryClassName`         | `string`  | `""`    | Primary update button class                     |
| `numberInputClass`/`numberInputClassName` | `string`  | `""`    | Number input class                              |
| `label`                                   | `string`  | i18n    | Unit label override                             |
| `changeLabel`                             | `string`  | i18n    | Change button label override                    |
| `updateLabel`                             | `string`  | i18n    | Update button label override                    |
| `cancelLabel`                             | `string`  | i18n    | Cancel button label override                    |
| `detailed`                                | `boolean` | `false` | Show current subscribed quantity before editing |

#### `<Subscription.ItemCTA>`

Composable subscription action button.

| Prop                | Type     | Default | Description                 |
| ------------------- | -------- | ------- | --------------------------- |
| `class`/`className` | `string` | `""`    | Button CSS class            |
| `activeLabel`       | `string` | i18n    | Current-plan label override |
| `checkoutLabel`     | `string` | i18n    | Checkout label override     |
| `switchLabel`       | `string` | i18n    | Switch-plan label override  |

#### `<Subscription.ItemBadge>`

Composable badge for current/recommended/custom plan labels.

| Prop                | Type                    | Default             | Description          |
| ------------------- | ----------------------- | ------------------- | -------------------- |
| `label`             | `string`                | current/recommended | Badge label override |
| `class`/`className` | `string`                | `""`                | Badge CSS class      |
| `children`          | `Snippet` / `ReactNode` | —                   | Custom badge content |

#### `<Subscription.Cancel>`

Composable cancel button for the active subscription card. It opens the same
root-owned confirmation dialog as the default pricing card, and renders nothing
when the card is not active or cancellation is unavailable.

| Prop                | Type     | Default | Description                  |
| ------------------- | -------- | ------- | ---------------------------- |
| `class`/`className` | `string` | `""`    | Button CSS class             |
| `label`             | `string` | i18n    | Cancel button label override |

#### `<Product.Root>`

Container for one-time or repeating product cards. Handles ownership tracking,
upgrade transitions, and checkout.

| Prop                | Type                                                      | Default                                      | Description                                                                                                                                               |
| ------------------- | --------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `permissions`       | `BillingPermissions`                                      | provider permissions                         | Local UI permission overrides                                                                                                                             |
| `transition`        | `Transition[]`                                            | `[]`                                         | Upgrade path rules between products                                                                                                                       |
| `class`/`className` | `string`                                                  | `""`                                         | Wrapper CSS class                                                                                                                                         |
| `layout`            | `"default" \| "single"`                                   | `"default"`                                  | Card layout mode                                                                                                                                          |
| `styleVariant`      | `"legacy" \| "pricing"`                                   | `"legacy"`                                   | Visual style variant                                                                                                                                      |
| `showImages`        | `boolean`                                                 | `false`                                      | Show product images on cards                                                                                                                              |
| `pricingCtaVariant` | `"filled" \| "faded"`                                     | `"faded"`                                    | Call-to-action button style                                                                                                                               |
| `successUrl`        | `string`                                                  | product's `defaultSuccessUrl` → current page | Override redirect after checkout. When omitted, uses the product's `defaultSuccessUrl` from Creem; if that is also unset, falls back to the current page. |
| `onBeforeCheckout`  | `(intent: CheckoutIntent) => Promise<boolean> \| boolean` | —                                            | Gate checkout (auth, terms, etc.). Return `false` to abort.                                                                                               |
| `children`          | `Snippet` / `ReactNode`                                   | —                                            | `<Product.Item>` children                                                                                                                                 |

**Transition types:**

```ts
type Transition =
  | { from: string; to: string; kind: "direct" }
  | { from: string; to: string; kind: "via_product"; viaProductId: string };
```

#### `<Product.Item>`

Registers a product inside `<Product.Root>`.

| Prop          | Type                        | Default                 | Description                                               |
| ------------- | --------------------------- | ----------------------- | --------------------------------------------------------- |
| `productId`   | `string`                    | —                       | **Required.** Creem product ID                            |
| `type`        | `"one-time" \| "recurring"` | —                       | **Required.** One-time shows "Owned" badge after purchase |
| `title`       | `string`                    | from Creem product data | Card display title                                        |
| `description` | `string`                    | from Creem product data | Card subtitle (rendered as Markdown)                      |

`Product` and `Product.Item` are aliases.

#### `<BillingPortal>`

Button that opens the Creem customer billing portal. Auto-hides when the billing
entity has no Creem customer record, or when `canAccessPortal` is `false`.

| Prop                | Type                    | Default              | Description                                               |
| ------------------- | ----------------------- | -------------------- | --------------------------------------------------------- |
| `permissions`       | `BillingPermissions`    | provider permissions | Control portal access (e.g. `{ canAccessPortal: false }`) |
| `class`/`className` | `string`                | `""`                 | Button CSS class                                          |
| `children`          | `Snippet` / `ReactNode` | `"Manage billing"`   | Custom button label                                       |

#### `<BillingHistory>`

Paginated transaction history backed by Creem's transaction search endpoint.
This renders transaction rows only. Invoice and receipt documents are not
included in this component.

| Prop                | Type     | Default | Description             |
| ------------------- | -------- | ------- | ----------------------- |
| `pageSize`          | `number` | `10`    | Transactions per page   |
| `productId`         | `string` | —       | Optional product filter |
| `orderId`           | `string` | —       | Optional order filter   |
| `class`/`className` | `string` | `""`    | Wrapper CSS class       |

Add the generated transaction action to your connected API:

```ts
const billingApi: ConnectedBillingApi = {
  uiModel: api.billing.uiModel,
  checkouts: { create: api.billing.checkoutsCreate },
  transactions: { search: api.billing.transactionsSearch },
};
```

#### `<Credits.Root>`

Credit balance widget backed by the provider's `credits.getBalance` action.

| Prop                | Type                                    | Default     | Description                           |
| ------------------- | --------------------------------------- | ----------- | ------------------------------------- |
| `unitLabel`         | `string`                                | `"credits"` | Unit label shown next to the balance  |
| `class`/`className` | `string`                                | `""`        | Wrapper CSS class                     |
| `children`          | `(credits: CreditsContextValue) => ...` | default UI  | Custom balance UI snippet/render prop |

#### `<Credits.Title>`

| Prop                | Type                    | Default            | Description          |
| ------------------- | ----------------------- | ------------------ | -------------------- |
| `class`/`className` | `string`                | title classes      | Title CSS class      |
| `children`          | `Snippet` / `ReactNode` | `"Credit Balance"` | Custom title content |

#### `<Credits.Amount>`

| Prop                            | Type     | Default | Description          |
| ------------------------------- | -------- | ------- | -------------------- |
| `class`/`className`             | `string` | layout  | Amount wrapper class |
| `amountClass`/`amountClassName` | `string` | amount  | Numeric amount class |
| `unitClass`/`unitClassName`     | `string` | unit    | Unit label class     |

#### `<Credits.Refresh>`

| Prop                | Type     | Default     | Description              |
| ------------------- | -------- | ----------- | ------------------------ |
| `class`/`className` | `string` | icon button | Button CSS class         |
| `label`             | `string` | i18n        | Accessible refresh label |

#### `<Credits.Error>` and `<Credits.Status>`

Display credit API errors or loading/status text. Both accept
`class`/`className`.

| Component        | Extra props                                   |
| ---------------- | --------------------------------------------- |
| `Credits.Error`  | none                                          |
| `Credits.Status` | `loadingLabel?: string`, `idleLabel?: string` |

### Presentational components

Lower-level building blocks for custom layouts. These do **not** call Convex
directly — pass data and callbacks as props.

#### `<PricingSection>`

Renders a grid of pricing cards with an optional billing cycle toggle.

| Prop                    | Type                 | Description                           |
| ----------------------- | -------------------- | ------------------------------------- |
| `plans`                 | `UIPlanEntry[]`      | Plan definitions                      |
| `activePlanId`          | `string \| null`     | Currently active plan ID              |
| `selectedCycle`         | `RecurringCycle`     | Active billing cycle                  |
| `products`              | `ConnectedProduct[]` | Product data for price resolution     |
| `subscriptionProductId` | `string \| null`     | Currently subscribed product          |
| `subscriptionStatus`    | `string \| null`     | Subscription status                   |
| `units`                 | `number`             | Checkout unit count                   |
| `showUnitPicker`        | `boolean`            | Show quantity picker                  |
| `subscribedUnits`       | `number \| null`     | Current unit count                    |
| `isGroupSubscribed`     | `boolean`            | Whether group has active subscription |
| `disableCheckout`       | `boolean`            | Disable checkout buttons              |
| `disableSwitch`         | `boolean`            | Disable plan switch buttons           |
| `disableUnits`          | `boolean`            | Disable unit controls                 |
| `onCycleChange`         | `(cycle) => void`    | Billing cycle change handler          |
| `onCheckout`            | `(payload) => void`  | Checkout handler                      |
| `onSwitchPlan`          | `(payload) => void`  | Plan switch handler                   |
| `onUpdateUnits`         | `(payload) => void`  | Unit update handler                   |

#### `<PricingCard>`

A single plan card with price, description, and action button. Same props as
`<PricingSection>` for a single plan (see source for full list).

#### `<BillingToggle>`

Billing cycle segment control (e.g. Monthly / Yearly).

| Prop            | Type                                               | Description                             |
| --------------- | -------------------------------------------------- | --------------------------------------- |
| `cycles`        | `RecurringCycle[]`                                 | Available cycles                        |
| `value`         | `RecurringCycle`                                   | Selected cycle                          |
| `onValueChange` | `(cycle) => void`                                  | Change handler                          |
| `cycleBadges`   | `Partial<Record<SupportedRecurringCycle, string>>` | Optional badges next to interval labels |
| `className`     | `string`                                           | CSS class                               |

#### `<CheckoutButton>`

Styled checkout button. Supports both `onCheckout` callback and `href` link
modes.

| Prop         | Type                    | Description                        |
| ------------ | ----------------------- | ---------------------------------- |
| `productId`  | `string`                | Product ID                         |
| `href`       | `string`                | Link mode: direct URL              |
| `disabled`   | `boolean`               | Disable button                     |
| `className`  | `string`                | CSS class                          |
| `onCheckout` | `(payload) => void`     | Callback mode: `{ productId }`     |
| `children`   | `Snippet` / `ReactNode` | Button label (default: "Checkout") |

#### `<OneTimeCheckoutButton>`

Same as `<CheckoutButton>` with default label "Buy now".

#### `<CustomerPortalButton>`

Styled button for opening the customer billing portal.

| Prop           | Type                    | Description                              |
| -------------- | ----------------------- | ---------------------------------------- |
| `href`         | `string`                | Link mode: direct URL                    |
| `disabled`     | `boolean`               | Disable button                           |
| `className`    | `string`                | CSS class                                |
| `onOpenPortal` | `() => void`            | Callback mode                            |
| `children`     | `Snippet` / `ReactNode` | Button label (default: "Manage billing") |

#### `<BillingGate>`

Conditionally renders children based on available billing actions.

| Prop              | Type                                   | Description                             |
| ----------------- | -------------------------------------- | --------------------------------------- |
| `snapshot`        | `BillingSnapshot \| null`              | Current billing state                   |
| `requiredActions` | `AvailableAction \| AvailableAction[]` | Actions that must be available          |
| `children`        | `Snippet` / `ReactNode`                | Rendered when all actions are available |
| `fallback`        | `Snippet` / `ReactNode`                | Rendered otherwise                      |

#### `<CheckoutSuccessSummary>`

Displays a success banner after checkout. Parses Creem query params
automatically.

| Prop        | Type                    | Description                                                  |
| ----------- | ----------------------- | ------------------------------------------------------------ |
| `params`    | `CheckoutSuccessParams` | Manual params (overrides URL parsing)                        |
| `search`    | `string`                | Query string to parse (defaults to `window.location.search`) |
| `className` | `string`                | CSS class                                                    |

React also exports a `useCheckoutSuccessParams()` hook that returns the parsed
params directly.

#### `<TrialLimitBanner>`

Shows a trial expiration notice.

| Prop          | Type                      | Description             |
| ------------- | ------------------------- | ----------------------- |
| `snapshot`    | `BillingSnapshot \| null` | Current billing state   |
| `trialEndsAt` | `string \| null`          | Override trial end date |
| `className`   | `string`                  | CSS class               |

#### `<ScheduledChangeBanner>`

Shows a scheduled cancellation or app-side period-end update notice. In a
connected provider, pass `subscriptionId` and the widget derives the current
period, scheduled update, target label, undo/resume handlers, and i18n from the
billing model.

| Prop                   | Type                                | Description                                    |
| ---------------------- | ----------------------------------- | ---------------------------------------------- |
| `subscriptionId`       | `string`                            | Subscription to derive banner state for        |
| `cancelAtPeriodEnd`    | `boolean`                           | Override whether cancellation is scheduled     |
| `currentPeriodEnd`     | `string \| null`                    | Override current billing period end            |
| `scheduledUpdate`      | `{ effectiveAt?: unknown } \| null` | Override app-side period-end update intent     |
| `isLoading`            | `boolean`                           | Override loading state for resume/undo buttons |
| `onResume`             | `() => void`                        | Override resume handler                        |
| `onUndoUpdate`         | `() => void`                        | Override undo handler for app-side updates     |
| `scheduledUpdateLabel` | `string \| null`                    | Override target plan, price, or unit label     |
| `className`            | `string`                            | CSS class                                      |

#### `<PaymentWarningBanner>`

Shows a warning for pending, refunded, or partially refunded payments.

| Prop        | Type                      | Description  |
| ----------- | ------------------------- | ------------ |
| `payment`   | `PaymentSnapshot \| null` | Payment data |
| `className` | `string`                  | CSS class    |

#### `<OneTimePaymentStatusBadge>`

Inline status badge for one-time payments.

| Prop        | Type                                                        | Description    |
| ----------- | ----------------------------------------------------------- | -------------- |
| `status`    | `"pending" \| "paid" \| "refunded" \| "partially_refunded"` | Payment status |
| `className` | `string`                                                    | CSS class      |

---

## Migration 0.3.0 to 0.4.0

### Provider-based widget API

Connected widgets no longer accept direct `api={billingApi}` props. Wrap the
area that renders billing UI with `CreemConvexProvider` and pass the API,
catalog, permissions, and consent hooks there.

| Previous API                                      | New API                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| `<Subscription.Root api={billingApi} ... />`      | `<CreemConvexProvider api={billingApi}><Subscription.Root ... />`   |
| `<Product.Root api={billingApi} ... />`           | `<CreemConvexProvider api={billingApi}><Product.Root ... />`        |
| `<BillingPortal api={billingApi} />`              | `<CreemConvexProvider api={billingApi}><BillingPortal />`           |
| `<BillingHistory api={billingApi} />`             | `<CreemConvexProvider api={billingApi}><BillingHistory />`          |
| Widget-level `catalog`, `permissions`, gate hooks | Provider-level defaults, with widget props only for local overrides |

This is intentionally breaking so apps have one billing integration boundary
instead of repeating Convex function references throughout the UI.

### Unit-based billing rename

The UI widget API now follows Creem's unit-based pricing language. There are no
backward-compatible aliases for the previous seat-specific names.

| Previous API                              | New API                                   |
| ----------------------------------------- | ----------------------------------------- |
| `<Subscription.Item type="seat-based" />` | `<Subscription.Item type="unit-based" />` |
| `<Subscription.Root showSeatPicker />`    | `<Subscription.Root showUnitPicker />`    |
| `BillingPermissions.canUpdateSeats`       | `BillingPermissions.canUpdateUnits`       |
| `AvailableAction` value `"update_seats"`  | `AvailableAction` value `"update_units"`  |
| `subscribedSeats`                         | `subscribedUnits`                         |
| `disableSeats`                            | `disableUnits`                            |
| `onUpdateSeats`                           | `onUpdateUnits`                           |

The `units` prop remains the quantity passed to checkout and subscription
updates. A unit can still represent a seat, but the public API no longer assumes
that seats are the only unit-based pricing use case.

### Pricing columns

`twoColumnLayout` was removed. Use `columns={2}` for a fixed two-column pricing
grid, or omit it for automatic layout.

### Product namespace cleanup

`Product.Group` was removed. It was only a compatibility alias for
`Product.Root`, not a real grouping primitive. Render `Product.Root` directly.
`Subscription.Group` remains because it is a distinct component for grouping
subscription plans.

| Previous API      | New API          |
| ----------------- | ---------------- |
| `<Product.Group>` | `<Product.Root>` |

### App-owned plans and i18n

`freePlans.activate` and `onBeforeFreePlanActivation` were removed:

| Previous API                                 | New API                                 |
| -------------------------------------------- | --------------------------------------- |
| `freePlans.activate({ freePlanId })`         | `plans.activate({ planId })`            |
| `onBeforeFreePlanActivation({ freePlanId })` | `onBeforePlanActivation({ planId })`    |
| `api.freePlans.activate` in provider config  | `api.plans.activate` in provider config |

Use the new plan-based API for free, trial, or other app-owned catalog plans.
Convex-Creem writes `snapshot.appPlanAssignments` for the current app-owned
plan; host apps only need a custom `activePlanId` projection when they
intentionally want to override the component-managed assignment. Price interval
suffixes now come from `labels.priceInterval`, so override those labels instead
of formatting `/mo` or `/yr` in application code.

### App-plan eligibility helpers

`isAppPlanEligible` and `shouldShowPlan` now take an eligibility context object
as their third argument. Pass `activePlanId`, `activeOrScheduledPlanIds`, and
`catalogPlans` explicitly so once-per-entity and scoped trial rules evaluate
against the same billing state as the widgets.

| Previous helper call                              | Current helper call                                              |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| `shouldShowPlan(plan, activations, activePlanId)` | `shouldShowPlan(plan, activations, { activePlanId })`            |
| `isAppPlanEligible(plan, activations, planId)`    | `isAppPlanEligible(plan, activations, { activePlanId: planId })` |

For scoped trials, include `activeOrScheduledPlanIds` and `catalogPlans`:

```ts
shouldShowPlan(trialPlan, activations, {
  activePlanId,
  activeOrScheduledPlanIds,
  catalogPlans,
});
```

### Billing Snapshot Contract

`creem.getBillingSnapshot(...)` and the generated
`creem.api({ resolve }).snapshot` query return the canonical `BillingSnapshot`
shape with explicit arrays for subscriptions, one-time orders, and app-owned
plan assignments, plus a derived `access` projection.

| Previous flat field         | Current source                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `activePlanId`              | Derive from `snapshot.access` or the relevant row in `snapshot.subscriptions` / `snapshot.appPlanAssignments` |
| `subscriptionProductId`     | `snapshot.subscriptions[n].productId`                                                                         |
| `subscriptionState`         | `snapshot.subscriptions[n].status`                                                                            |
| `recurringCycle`            | `snapshot.subscriptions[n].recurringCycle`                                                                    |
| `availableActions`          | `snapshot.availableBillingActions`                                                                            |
| `payment`                   | Use payment/order-specific queries or `snapshot.orders` for paid orders                                       |
| `ownedProductIds`           | Derive from paid rows in `snapshot.orders`                                                                    |
| primary subscription fields | Derive from the relevant `snapshot.subscriptions` row                                                         |

The generated `uiModel` used by connected widgets exposes the same canonical
snapshot as `uiModel.snapshot`.

### Product credit grants

`Product.Item` no longer accepts checkout metadata for credit grants. Put
purchase-to-credit mappings in the server-owned billing catalog with
`creditGrant` so webhook fulfillment derives the amount from trusted app code.

| Previous API                                                              | New API                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------- |
| `<Product.Item checkoutMetadata={{ convexCreemCreditsAmount: "100" }} />` | Catalog entry with `creditGrant: { amount: "100" }`     |
| Client-supplied metadata deciding the credits granted after checkout      | Server-side `billingCatalog` passed to `new Creem(...)` |
| App code manually deciding whether refunds should reverse granted credits | `creditGrant.refundBehavior` on the catalog entry       |

By default, catalog-granted credits are reversed only on full refunds. Configure
`refundBehavior` per product when your app needs proportional (`"prorate"`),
eager (`"debit"`), or manual (`"none"`) refund handling.

---

## Troubleshooting

**Webhooks not receiving events** Verify your Creem dashboard webhook URL
matches `<CONVEX_SITE_URL>/creem/events`. Check that `CREEM_WEBHOOK_SECRET`
matches the signing secret in Creem. Check the Convex dashboard logs for
verification errors.

**Products not syncing** Run `npx convex run billing:syncBillingProducts` after
setting up webhooks. Ensure `CREEM_API_KEY` is set and the key has read access
to products.

**Widgets rendering without package styles** Ensure both Tailwind CSS v4 and
`@import "@mmailaender/convex-creem/styles"` are in your CSS entry point. The
styles import must come after the Tailwind import.

**Checkout URL missing from response** The Creem API returned no checkout URL.
Verify the product ID exists and is active in your Creem dashboard. Check the
Convex dashboard logs for the full error.

**Entity/org billing not scoping correctly** Ensure `billingEntityId` is
returned from `getUserInfo`. If omitted, `userId` is used as the billing entity.
Verify that checkout metadata includes `convexBillingEntityId` by checking
webhook logs.

**"Customer not found" when opening billing portal** The customer record is
created on first checkout. If the user hasn't completed a checkout yet, there's
no customer to link to the portal.
