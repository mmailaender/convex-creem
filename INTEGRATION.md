# Integration Guide - `@mmailaender/convex-creem`

This guide walks through a complete Convex Creem integration for React or
Svelte. The Svelte example in `example-svelte/src/App.svelte` is a single-page
Vite app: it does not define SvelteKit routes. Its navigation links are anchor
paths to in-page billing variants, such as `#sub-one-plan` and
`#onetime-single`.

Use this order:

1. Set up the Convex component and webhook route.
2. Export the connected Convex billing API.
3. Define the browser-side billing catalog.
4. Wrap your billing UI in `CreemConvexProvider`.
5. Choose the billing path you need: subscriptions, one-time products, credits,
   account tools, or usage gates.

For brownfield projects, first inventory the billing integration you are
replacing. Agent automation can add the Convex Creem component, routes, and
catalog wiring, but it cannot know which old provider settings are still safe to
remove from your deployment or payment dashboard. Before switching traffic,
check:

- Existing webhook paths in your app and payment provider dashboard, such as
  `/api/stripe/webhook`, `/api/billing/webhook`, `/webhooks/lemonsqueezy`, or
  other custom billing endpoints. Keep them only if another live billing flow
  still depends on them.
- Public client env vars for the old billing UI, such as product, price, plan,
  checkout, or publishable-key variables in `VITE_*`, `NEXT_PUBLIC_*`, or
  `PUBLIC_*` namespaces.
- Server env vars for the old billing system, such as API keys, webhook signing
  secrets, customer portal configuration, price IDs used by server actions, or
  framework route secrets.
- Background jobs, scheduled syncs, or server functions that still read the old
  billing env vars or process the old webhook events.

Clean up the old webhook registrations and env vars manually after confirming
the Convex Creem webhook is receiving events and any necessary historical data
has been migrated or retained. Do not delete old secrets before rollback and
data-retention requirements are clear.

---

## 1. Install

Install the package plus the peer dependencies for the frontend framework you
use.

```bash
npm install @mmailaender/convex-creem convex creem
```

For Svelte widgets:

```bash
npm install svelte @mmailaender/convex-svelte @ark-ui/svelte
```

For React widgets:

```bash
npm install react react-dom @ark-ui/react
```

---

## 2. Register the Convex component

Create or update `convex/convex.config.ts`:

```ts
import { defineApp } from "convex/server";
import creem from "@mmailaender/convex-creem/convex.config";

const app = defineApp();
app.use(creem);

export default app;
```

Set Creem secrets in Convex:

```bash
npx convex env set CREEM_API_KEY <your_creem_api_key>
npx convex env set CREEM_WEBHOOK_SECRET <your_creem_webhook_signing_secret>
```

If you use credit packs, also set a server-side product ID. Do not trust a
browser-exposed product ID for webhook fulfillment:

```bash
npx convex env set CREEM_ONETIME_CREDITS prod_...
```

---

## 3. Export the Convex billing API

Create `convex/billing.ts`. Replace the resolver with your real auth and entity
logic. `entityId` is the billing owner; use the user ID for user billing or the
org/team ID for organization billing. The repo's demo resolver reads the first
row from a `users` table via `getUserInfo`; that is only demo auth, not the
recommended production boundary.

```ts
import {
  Creem,
  defineBillingCatalog,
  type ApiResolver,
} from "@mmailaender/convex-creem";
import { api, components } from "./_generated/api";
import { action, internalAction, query } from "./_generated/server";

const creditsProductId = process.env.CREEM_ONETIME_CREDITS;
const serverBillingCatalog = creditsProductId
  ? defineBillingCatalog({
      version: "server",
      plans: [
        {
          planId: "ai-credits-100",
          category: "paid",
          billingType: "onetime",
          creemProductIds: {
            custom: creditsProductId,
          },
          creditGrant: {
            amount: "100",
            accountName: "credits",
            unitLabel: "credits",
            refundBehavior: "revoke_on_full_refund",
          },
        },
      ],
    } as const)
  : undefined;

export const creem = new Creem(components.creem, {
  ...(serverBillingCatalog ? { billingCatalog: serverBillingCatalog } : {}),
  cancelMode: "scheduled",
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return {
      id: identity.subject,
      email: identity.email!,
    };
  },
});

const resolve: ApiResolver = async (ctx) => {
  const user = await ctx.runQuery(api.billing.currentUser);
  return {
    userId: user.id,
    email: user.email,
    entityId: user.id,
  };
};

const {
  uiModel,
  snapshot,
  checkouts,
  subscriptions,
  products,
  customers,
  transactions,
  orders,
  credits,
} = creem.api({ resolve });

export { uiModel, snapshot };
export const checkoutsCreate = checkouts.create;
export const subscriptionsUpdate = subscriptions.update;
export const subscriptionsCancel = subscriptions.cancel;
export const subscriptionsResume = subscriptions.resume;
export const subscriptionsCancelScheduledUpdate =
  subscriptions.cancelScheduledUpdate;
export const subscriptionsPause = subscriptions.pause;
export const subscriptionsList = subscriptions.list;
export const subscriptionsListAll = subscriptions.listAll;
export const productsList = products.list;
export const productsGet = products.get;
export const customersRetrieve = customers.retrieve;
export const customersPortalUrl = customers.portalUrl;
export const transactionsSearch = transactions.search;
export const ordersList = orders.list;
export const creditsCreateAccount = credits.createAccount;
export const creditsGetBalance = credits.getBalance;
export const creditsCredit = credits.credit;
export const creditsDebit = credits.debit;
export const creditsListEntries = credits.listEntries;

export const generateImage = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runAction(api.billing.creditsDebit, {
      amount: "10",
      reference: "generate_image",
      idempotencyKey: `generate_image_${Date.now()}`,
    });
    return { creditsConsumed: "10" };
  },
});

export const syncBillingProducts = internalAction({
  args: {},
  handler: async (ctx) => {
    await creem.syncProducts(ctx);
    return { synced: true };
  },
});
```

What to consider:

- Export only capabilities your UI needs. If you omit `subscriptions.cancel`,
  cancel buttons disappear.
- Use `cancelMode: "scheduled"` when canceling should keep access until the
  current period ends. Use `"immediate"` when cancellation should end access
  immediately.
- Put credit grants in the server catalog because webhooks run on the server.
- `syncBillingProducts` is intentionally an `internalAction`, matching the
  example app. Trigger it from the Convex CLI, dashboard, or another trusted
  internal function, not from browser UI.
- App-owned credit spending, such as `generateImage`, should call `creditsDebit`
  on the server. The credits widget only displays and refreshes balance state.

---

## 4. Register the webhook route

Create or update `convex/http.ts`:

```ts
import { httpRouter } from "convex/server";
import { creem } from "./billing";

const http = httpRouter();

creem.registerRoutes(http, {
  path: "/creem/events",
  events: {
    "checkout.completed": async (_ctx, event) => {
      console.log("Checkout completed", event);
    },
    "subscription.update": async (_ctx, event) => {
      console.log("Subscription updated", event);
    },
  },
});

export default http;
```

In Creem, set the webhook endpoint to:

```text
https://<your-convex-site-url>/creem/events
```

The component stores customers, subscriptions, orders, refunds, disputes, and
credit grants from supported Creem events.

After products exist in Creem, sync them into Convex:

```bash
npx convex run billing:syncBillingProducts
```

This works with the internal action in the example. If you expose your own
admin-only public action instead, protect it server-side and keep it out of
client-facing billing pages.

---

## 5. Add CSS

Import the package CSS in your app CSS entry point:

```css
@import "tailwindcss";
@import "@mmailaender/convex-creem/styles";
```

The Svelte example uses this in `example-svelte/src/app.css`.

---

## 6. Define the browser billing catalog

Create a shared catalog file in your frontend. Import from the framework entry
you are using (`/svelte` or `/react`).

```ts
import { defineBillingCatalog } from "@mmailaender/convex-creem/svelte";

export const billingCatalog = defineBillingCatalog({
  version: "1",
  defaultPlanId: "free",
  plans: [
    {
      planId: "free",
      category: "free",
      title: "Free",
      description: "For individuals getting started",
      limits: { projects: 1, aiMessages: 50 },
    },
    {
      planId: "basic",
      category: "paid",
      billingType: "recurring",
      title: "Basic",
      creemProductIds: {
        "every-month": import.meta.env.VITE_CREEM_SUB_BASIC_MONTHLY,
      },
      limits: { projects: 5, aiMessages: 250 },
    },
    {
      planId: "premium",
      category: "paid",
      billingType: "recurring",
      title: "Premium",
      recommended: true,
      creemProductIds: {
        "every-month": import.meta.env.VITE_CREEM_SUB_PREMIUM_MONTHLY,
        "every-year": import.meta.env.VITE_CREEM_SUB_PREMIUM_ANNUAL,
      },
      limits: { projects: 100, aiMessages: 2500 },
    },
    {
      planId: "enterprise",
      category: "enterprise",
      title: "Enterprise",
      contactUrl: "https://example.com/contact",
    },
  ],
} as const);
```

What to consider:

- `creemProductIds` maps billing cycles to Creem product IDs.
- Supported recurring cycles are `every-month`, `every-three-months`,
  `every-six-months`, and `every-year`.
- If a plan has multiple cycles, the interval selector appears automatically.
- Product IDs used only by frontend widgets may live in your framework's public
  client env namespace, such as Vite `VITE_*`, Next.js `NEXT_PUBLIC_*`, or
  SvelteKit `PUBLIC_*`. Trusted webhook fulfillment data must live in Convex env
  vars.

---

## 7. Connect Svelte

In Svelte, initialize Convex once with `setupConvex`, create a
`ConnectedBillingApi`, and wrap widgets in `CreemConvexProvider`. The provider
is the required integration boundary. `ConvexCreemProvider` is not an exported
component name; the package exports `CreemConvexProvider`.

```svelte
<script lang="ts">
  import { setupConvex } from "@mmailaender/convex-svelte";
  import {
    CreemConvexProvider,
    Subscription,
    BillingPortal,
    plansOf,
    type ConnectedBillingApi,
  } from "@mmailaender/convex-creem/svelte";
  import { api } from "../convex/_generated/api.js";
  import { billingCatalog } from "./billingCatalog";

  const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!convexUrl) throw new Error("VITE_CONVEX_URL is required");
  setupConvex(convexUrl);

  const connectedApi: ConnectedBillingApi = {
    uiModel: api.billing.uiModel,
    checkouts: { create: api.billing.checkoutsCreate },
    subscriptions: {
      update: api.billing.subscriptionsUpdate,
      cancel: api.billing.subscriptionsCancel,
      resume: api.billing.subscriptionsResume,
      cancelScheduledUpdate: api.billing.subscriptionsCancelScheduledUpdate,
    },
    customers: { portalUrl: api.billing.customersPortalUrl },
    transactions: { search: api.billing.transactionsSearch },
    credits: {
      createAccount: api.billing.creditsCreateAccount,
      getBalance: api.billing.creditsGetBalance,
      credit: api.billing.creditsCredit,
      debit: api.billing.creditsDebit,
      listEntries: api.billing.creditsListEntries,
    },
  };
</script>

<CreemConvexProvider api={connectedApi} catalog={billingCatalog}>
  <Subscription.Root plans={plansOf(billingCatalog, ["free", "premium"])} />
  <BillingPortal />
</CreemConvexProvider>
```

Important: connected widgets must be rendered inside `CreemConvexProvider`. Do
not pass `api={...}` directly to `Subscription.Root`, `Product.Root`,
`BillingPortal`, or `BillingHistory`.

The provider-level `ConnectedBillingApi` decides which paths are available:

| API field                             | Used by                                         | If omitted                                             |
| ------------------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| `uiModel`                             | All connected widgets                           | Widgets cannot load billing state.                     |
| `checkouts.create`                    | `Subscription.Root`, `Product.Root`             | Subscribe/buy buttons cannot create checkout sessions. |
| `subscriptions.update`                | Plan switches, unit changes, period-end updates | Switch and unit update controls are unavailable.       |
| `subscriptions.cancel`                | Subscription cancel buttons                     | Cancel controls are unavailable.                       |
| `subscriptions.resume`                | Scheduled-cancel resume controls                | Resume/undo cancel controls are unavailable.           |
| `subscriptions.cancelScheduledUpdate` | App-side period-end update undo                 | Pending period-end update undo is unavailable.         |
| `customers.portalUrl`                 | `BillingPortal`, `PaymentRecoveryButton`        | Portal buttons cannot open the Creem customer portal.  |
| `transactions.search`                 | `BillingHistory`                                | Billing history cannot render.                         |
| `credits.*`                           | `Credits.Root` and app credit actions           | Credit balance and ledger UI cannot work.              |

Use `createCreemSvelte` when you want one typed binding object, as shown in the
example's `#sub-typed-binding` section:

```svelte
<script lang="ts">
  import {
    CreemConvexProvider,
    Subscription,
    BillingPortal,
    createCreemSvelte,
  } from "@mmailaender/convex-creem/svelte";

  const billing = createCreemSvelte({
    catalog: billingCatalog,
    api: connectedApi,
    defaultCycle: "every-month",
  });
</script>

<CreemConvexProvider
  api={billing.api}
  catalog={billing.catalog}
  defaultCycle={billing.defaultCycle}
>
  <Subscription.Root plans={billing.planIds} />
  <BillingPortal />
</CreemConvexProvider>
```

The example also reads `uiModel` directly once for account-level UI such as
payment recovery and usage gates:

```svelte
<script lang="ts">
  import { useQuery } from "@mmailaender/convex-svelte";
  import { CheckoutSuccessSummary } from "@mmailaender/convex-creem/svelte";
  import { api } from "../convex/_generated/api.js";

  const billingModelQuery = useQuery(api.billing.uiModel, {});
  const snapshot = $derived(billingModelQuery.data?.snapshot ?? null);
  const checkoutSearch =
    typeof window === "undefined" ? "" : window.location.search;
</script>

<CheckoutSuccessSummary search={checkoutSearch} />
```

---

## 8. Connect React

React uses the same `ConnectedBillingApi` shape. The difference is your normal
Convex React client setup.

```tsx
import {
  CreemConvexProvider,
  Subscription,
  BillingPortal,
  createCreemReact,
  plansOf,
  type ConnectedBillingApi,
} from "@mmailaender/convex-creem/react";
import { api } from "../convex/_generated/api";
import { billingCatalog } from "./billingCatalog";

const connectedApi: ConnectedBillingApi = {
  uiModel: api.billing.uiModel,
  checkouts: { create: api.billing.checkoutsCreate },
  subscriptions: {
    update: api.billing.subscriptionsUpdate,
    cancel: api.billing.subscriptionsCancel,
    resume: api.billing.subscriptionsResume,
    cancelScheduledUpdate: api.billing.subscriptionsCancelScheduledUpdate,
  },
  customers: { portalUrl: api.billing.customersPortalUrl },
  transactions: { search: api.billing.transactionsSearch },
  credits: {
    createAccount: api.billing.creditsCreateAccount,
    getBalance: api.billing.creditsGetBalance,
    credit: api.billing.creditsCredit,
    debit: api.billing.creditsDebit,
    listEntries: api.billing.creditsListEntries,
  },
};

const billing = createCreemReact({
  catalog: billingCatalog,
  api: connectedApi,
  defaultCycle: "every-month",
});

export function PricingPage() {
  return (
    <CreemConvexProvider
      api={billing.api}
      catalog={billing.catalog}
      defaultCycle={billing.defaultCycle}
    >
      <Subscription.Root
        plans={plansOf(billing.catalog, ["free", "premium"])}
      />
      <BillingPortal />
    </CreemConvexProvider>
  );
}
```

---

## 9. Choose your billing path

The Svelte example exposes these paths as in-page anchors. Use the closest path
as your starting point.

| Example anchor            | Use this when                                    | Main API to configure                                              | Considerations                                                                                                 |
| ------------------------- | ------------------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `#sub-one-plan`           | You have one paid plan                           | `Subscription.Root plans={["pro"]}`                                | Smallest catalog-driven subscription setup.                                                                    |
| `#sub-two-plans`          | You have a simple upgrade choice                 | `plans={["basic", "premium"]}`                                     | Good default for most SaaS pricing pages.                                                                      |
| `#sub-multi-cycle`        | Plans support monthly/yearly or more cycles      | `creemProductIds` with several cycle keys                          | The interval selector appears only when multiple cycles exist.                                                 |
| `#sub-catalog-driven`     | You split plans by audience                      | `groups={[...]}`                                                   | Group selector controls visible plans; unit plans can show a picker.                                           |
| `#sub-unit-auto`          | Quantity comes from app state                    | `units={memberCount}`                                              | Keep Creem quantity synced when the app count changes.                                                         |
| `#sub-grouped-cycles`     | Groups also have different intervals             | `groups` plus multi-cycle products                                 | The active group controls available billing cycles.                                                            |
| `#sub-app-trial`          | No-card trial before choosing free or paid       | `category: "trial"` plus `plans.activate`                          | Component records once-per-entity history and can expire trials by `eligibilityScopeId`; your app owns quotas. |
| `#sub-consent-gates`      | Checkout requires terms, auth, or policy consent | `onBeforeCheckout`, `onBeforePlanChange`, `onBeforePlanActivation` | Return `false` to stop the billing action. Enforce real permissions server-side too.                           |
| `#sub-custom-composition` | You need app-owned card markup                   | `unstyled`, `Subscription.Grid`, `Subscription.Item`, slots        | The root still owns checkout, switch, cancel, units, and active state.                                         |
| `#sub-typed-binding`      | You want typed plan IDs and one binding object   | `createCreemSvelte` or `createCreemReact`                          | Recommended for production apps.                                                                               |
| `#sub-period-end`         | Downgrades should apply at period end            | `updateBehavior` resolver and `cancelScheduledUpdate` export       | App-side scheduled updates are tracked in Convex until applied.                                                |
| `#onetime-single`         | You sell a one-time product once                 | `Product.Root` with `Product.Item type="one-time"`                 | Shows "Owned" after purchase.                                                                                  |
| `#onetime-group`          | One-time products are mutually exclusive         | `Product.Root transition={[...]}`                                  | Use `via_product` for delta-priced upgrades.                                                                   |
| `#onetime-repeat`         | You sell repeatable packs or consumables         | `Product.Item type="recurring"` and optional `Credits.Root`        | Repeating products do not show "Owned"; credit grants should be server-owned.                                  |
| `#payment-recovery`       | You need past-due or failed-payment UI           | `PaymentRecoveryBanner`, `PaymentRecoveryButton`                   | Button needs `customers.portalUrl`; banners can derive from snapshot or accept an explicit state.              |
| `#billing-history`        | Users need transaction history                   | `BillingHistory` and `transactions.search`                         | This is transaction history, not full invoice rendering.                                                       |
| `#feature-usage-gate`     | Features depend on plan or payment state         | `BillingGate`, `evaluateUsageLimits`                               | Billing state gates access; your app still measures usage.                                                     |

The external paths are:

- `/creem/events` - Convex HTTP webhook endpoint for Creem.
- Creem checkout URL - opened by `checkouts.create`.
- Creem customer portal URL - opened by `customers.portalUrl`.
- Your checkout success URL - defaults to the current page path when
  `successUrl` is not passed.

---

## 10. Subscription widgets

Fast catalog-driven setup:

```svelte
<Subscription.Root plans={plansOf(billingCatalog, ["free", "basic", "premium"])} />
```

No-card app trial setup:

```ts
export const billingCatalog = defineBillingCatalog({
  plans: [
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
      limits: { aiMessages: 5 },
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
      creemProductIds: { "every-month": "prod_..." },
    },
  ],
});
```

```svelte
<Subscription.Root plans={plansOf(billingCatalog, ["trial", "free", "premium"])} />
```

Expose `plans.activate` with an app mutation that calls
`creem.appPlans.activate(ctx, { entityId, planId, activatedByUserId })`. The
component stores trial history, enforces `oncePerEntity`, and writes the current
app-plan assignment used by the widgets and snapshot; the app still owns feature
quotas and lock states.

Use `eligibilityScopeId` when the trial should disappear only after choosing an
alternative in the same product line. For example, put `trial`, `free`, and
`premium` in the `"base"` scope, but put an addon trial and its paid addon in an
`"analytics-addon"` scope. Choosing a base plan will not hide the addon trial;
choosing or scheduling the addon will.

Grouped setup:

```svelte
<Subscription.Root
  showUnitPicker
  groups={[
    {
      value: "individual",
      label: "Individual",
      plans: plansOf(billingCatalog, ["basic-individual", "premium-individual"]),
    },
    {
      value: "teams",
      label: "Teams",
      plans: plansOf(billingCatalog, ["basic-team", "premium-team"]),
    },
  ]}
/>
```

Period-end downgrade setup:

```svelte
<Subscription.Root
  plans={plansOf(billingCatalog, ["free", "basic", "premium"])}
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

What to consider:

- `subscriptions.update` enables plan switches and unit updates.
- Paid-to-free is a cancellation flow, not Creem proration. Configure it with
  `freePlanUpdateBehavior`, which defaults to `"period-end"` and also supports
  `"immediate"` when you want to cancel the paid subscription and assign the
  app-owned free plan right away.
- `subscriptions.cancel` enables cancel UI.
- `subscriptions.resume` enables undo/resume UI for scheduled cancellation.
- `subscriptions.cancelScheduledUpdate` enables undo for app-side period-end
  changes.
- UI permissions are cosmetic. Server functions must still check real access.

---

## 11. One-time products and credits

Single owned product:

```svelte
<Product.Root layout="single" styleVariant="pricing">
  <Product.Item
    type="one-time"
    title="Lifetime Access"
    productId={import.meta.env.VITE_CREEM_ONETIME_SINGLE}
  />
</Product.Root>
```

Mutually exclusive products with an upgrade product:

```svelte
<Product.Root
  transition={[
    {
      from: import.meta.env.VITE_CREEM_ONETIME_BASIC,
      to: import.meta.env.VITE_CREEM_ONETIME_PREMIUM,
      kind: "via_product",
      viaProductId: import.meta.env.VITE_CREEM_ONETIME_UPGRADE_DELTA,
    },
  ]}
>
  <Product.Item
    type="one-time"
    title="Basic"
    productId={import.meta.env.VITE_CREEM_ONETIME_BASIC}
  />
  <Product.Item
    type="one-time"
    title="Premium"
    productId={import.meta.env.VITE_CREEM_ONETIME_PREMIUM}
  />
</Product.Root>
```

Repeatable credit pack:

```svelte
<Product.Root layout="single" styleVariant="pricing">
  <Product.Item
    type="recurring"
    title="100 AI Credits"
    productId={import.meta.env.VITE_CREEM_ONETIME_CREDITS}
  />
</Product.Root>

<Credits.Root unitLabel="credits">
  {#snippet children(credits)}
    <Credits.Title />
    <Credits.Refresh />
    <Credits.Amount />
    <Credits.Error />
    <button onclick={() => credits.refresh()}>Refresh</button>
  {/snippet}
</Credits.Root>
```

What to consider:

- `type="one-time"` suppresses repeat checkout after ownership is detected.
- `type="recurring"` allows repeat purchases and is the right path for
  consumables.
- Credit spending should happen in your own Convex action; refresh the widget
  afterward.

---

## 12. Account widgets

Billing portal:

```svelte
<BillingPortal />
```

Billing history:

```svelte
<BillingHistory pageSize={5} />
```

Payment recovery:

```svelte
<PaymentRecoveryBanner snapshot={snapshot} />
<PaymentRecoveryButton portalUrl={connectedApi.customers!.portalUrl!} />
```

What to consider:

- `BillingPortal` requires `customers.portalUrl`.
- `BillingHistory` requires `transactions.search`.
- `PaymentRecoveryButton` opens the portal so the user can update payment
  methods.

---

## 13. Usage gates

Use catalog limits for app-owned usage decisions:

```ts
import { evaluateUsageLimits } from "@mmailaender/convex-creem/svelte";

const usageLimits = evaluateUsageLimits({
  catalog: billingCatalog,
  planId: "premium",
  usage: {
    projects: 3,
    aiMessages: 72,
  },
});
```

Use billing state for UI access:

```svelte
<BillingGate snapshot={snapshot} requiredActions="portal">
  <BillingSettings />
  {#snippet fallback()}
    <UpgradePrompt />
  {/snippet}
</BillingGate>
```

What to consider:

- The library can evaluate limits, but your app owns the actual usage counters.
- Do not rely on UI gates alone for protected backend actions.

---

## 14. Environment placement checklist

Use your app framework's public client env namespace only for values the browser
needs to render widgets or start checkout, such as product IDs referenced by the
frontend catalog. The exact prefix depends on the framework:

```text
Vite:       VITE_CREEM_SUB_BASIC_MONTHLY=prod_...
Next.js:    NEXT_PUBLIC_CREEM_SUB_BASIC_MONTHLY=prod_...
SvelteKit:  PUBLIC_CREEM_SUB_BASIC_MONTHLY=prod_...
```

Trusted server values are set with Convex, not in `.env.example`:

```bash
npx convex env set CREEM_API_KEY <your_creem_api_key>
npx convex env set CREEM_WEBHOOK_SECRET <your_creem_webhook_signing_secret>
npx convex env set CREEM_ONETIME_CREDITS prod_...
```

In brownfield projects, also remove stale billing env vars after the migration
is verified. The automation process may add the new Convex Creem variables, but
old provider values usually live in several places: local `.env*` files, hosting
provider env settings, CI secrets, Convex env, and the payment provider
dashboard. Search for the old provider name and old public prefixes so unused
webhook secrets, price IDs, product IDs, publishable keys, and API keys do not
linger.

---

## 15. Validation

Before shipping an integration:

```bash
pnpm check
pnpm test
pnpm lint
timeout 30 npx convex dev --once 2>&1 || true
```

For documentation-only edits, a targeted Markdown format check is usually
enough.
