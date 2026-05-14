# Convex Creem Billing Composition Plan

## Purpose

Turn `convex-creem` from a Convex-specific Creem sync component with connected
widgets into a composable SaaS billing integration kit:

- fast to integrate in greenfield apps
- predictable to migrate into brownfield apps
- flexible enough for real SaaS pricing flows
- careful about ownership boundaries between billing, auth, product policy, and
  app-specific usage

This plan captures the base direction for the component. App-specific migration
plans should reference this document rather than being embedded here.

## Design Principles

### 1. Creem billing state, not app authorization

`convex-creem` should answer:

- which Creem products are purchased
- which subscriptions exist
- which subscription states are active, scheduled, paid, past due, unpaid,
  expired, canceled, or paused
- which customer/order records exist
- which billing actions are available, such as checkout, portal, cancel, resume,
  switch interval, or update units

The app should answer:

- which users can manage billing
- which features are enabled
- which pages are locked
- which app-specific actions are allowed
- which organization/user records should receive auth roles or plans

This keeps the component aligned with single responsibility. The component may
produce a billing state snapshot, but it should not become the app's auth
system.

### 2. Raw event middleware as the app extension point

The existing webhook middleware already lets apps handle raw Creem events:

```ts
events: {
  "subscription.active": async (ctx, event) => {},
  "subscription.canceled": async (ctx, event) => {},
}
```

This should remain the supported app extension point for side effects such as
updating auth projections, sending emails, analytics, or app-specific
fulfillment.

Any repeated event-handling patterns should be documented in the README and
examples first. The component should avoid adding a second callback abstraction
over the same Creem events unless repeated integrations prove that a new layer
is needed.

### 3. Stable app plan IDs, environment-specific Creem product IDs

Apps should define stable plan IDs such as `trial`, `free`, `basic`, `private`,
or `enterprise`.

Creem product IDs differ between test and production. The catalog should make
that split explicit while keeping app code stable.

Example:

```ts
const catalog = defineBillingCatalog({
  plans: [
    {
      planId: "private",
      type: "paid",
      products: {
        "every-month": env.CREEM_PRIVATE_MONTHLY_PRODUCT_ID,
        "every-year": env.CREEM_PRIVATE_YEARLY_PRODUCT_ID,
      },
    },
  ],
});
```

Creem products remain the commerce source of truth for price, currency, status,
and checkout. The plan catalog describes how products compose into app-facing
plans.

Creem platform feature requests that could simplify this are documented in the
future Creem platform requests section at the bottom. Until then, app-level
stable plan IDs plus env-specific product IDs are the practical bridge.

### 4. App-owned usage and policy

The component should provide composition hooks for usage limits and policy
gates, but it should not own app-specific measurement or legal/policy storage.

Examples:

- An AI app counts generated messages.
- A project-management app counts projects.
- A team app counts units from organization members, where one unit may
  represent a seat.
- A usage-based app uses Creem Customer Credits for prepaid usage.

The component can provide helpers and UI states, but the app owns the counters
and app policy records.

## Current Support Matrix

| Capability                                | Current support | Notes                                                                                                              |
| ----------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------ |
| Component-owned billing tables            | Supported       | Customers, products, subscriptions, orders                                                                         |
| Webhook signature verification            | Supported       | Strong baseline improvement over custom app routes                                                                 |
| Product sync                              | Supported       | Products can be pulled from Creem into Convex                                                                      |
| Checkout creation                         | Supported       | Includes entity/user metadata                                                                                      |
| Customer portal URL                       | Supported       | Uses Creem hosted portal                                                                                           |
| Subscription update                       | Supported       | Product switch and unit update                                                                                     |
| Subscription cancel/resume/pause          | Supported       | Includes optimistic local state                                                                                    |
| One-time purchases                        | Supported       | Orders are synced and product ownership is modeled                                                                 |
| Unit-based subscriptions                  | Supported       | UI and backend support exist                                                                                       |
| Billing UI widgets                        | Supported       | React and Svelte connected widgets                                                                                 |
| Billing history widget                    | Supported       | Paginated transaction-history v1 from Creem transactions APIs; invoices/receipts are not included                  |
| Raw webhook middleware                    | Supported       | App can react to individual event types                                                                            |
| Stable plan catalog                       | Supported       | Catalog-backed subscription widgets can render stable plan IDs while product IDs stay in catalog/env configuration |
| Plan grouping / audience selection        | Supported       | Subscription root can render grouped pricing without nesting app tabs around registration-only items               |
| Payment recovery component                | Partial         | Need subscription-focused recovery primitive                                                                       |
| Temporary free plan transition workaround | Missing         | Needed only until Creem supports native free plans                                                                 |
| Usage limit composition                   | Missing         | Should be helper/pattern, not app-owned counter                                                                    |
| Consent/policy gates                      | Partial         | `onBeforeCheckout` exists; plan-change gates and policy examples needed                                            |
| Credits support                           | Partial         | Creem Customer Credits API exists; widget/API support exists, with app-side catalog-derived purchase grants        |
| Integration guide                         | Needs expansion | Current README is good quickstart, not a full migration/composition guide                                          |

## Proposed Component Extensions

### 1. Catalog v2

Make the catalog a first-class concept used by backend helpers and widgets.

Goals:

- stable app plan IDs
- environment-specific product mapping
- default/free/trial plan support
- paid recurring plan support
- one-time product grouping
- plan grouping for app-facing pricing audiences such as individual, teams, or
  enterprise
- unit-based plan metadata
- optional limits metadata

Draft shape:

```ts
const catalog = defineBillingCatalog({
  version: "2026-05-01",
  plans: [
    {
      planId: "trial",
      type: "trial",
      default: true,
      limits: {
        aiMessages: 5,
      },
    },
    {
      planId: "free",
      type: "free",
    },
    {
      planId: "basic-individual",
      groupId: "individual",
      type: "paid",
      products: {
        "every-month": process.env.CREEM_BASIC_INDIVIDUAL_MONTHLY_PRODUCT_ID!,
        "every-year": process.env.CREEM_BASIC_INDIVIDUAL_YEARLY_PRODUCT_ID!,
      },
    },
    {
      planId: "basic-teams",
      groupId: "teams",
      type: "paid",
      pricingModel: "unit",
      products: {
        "every-month": process.env.CREEM_BASIC_TEAMS_MONTHLY_PRODUCT_ID!,
        "every-year": process.env.CREEM_BASIC_TEAMS_YEARLY_PRODUCT_ID!,
      },
    },
    {
      planId: "private",
      type: "paid",
      products: {
        "every-month": process.env.CREEM_PRIVATE_MONTHLY_PRODUCT_ID!,
        "every-year": process.env.CREEM_PRIVATE_YEARLY_PRODUCT_ID!,
      },
    },
  ],
});
```

Decisions:

- Product IDs are the user's concern. The catalog should allow direct env var
  usage such as `"every-month": process.env.CREEM_PRIVATE_MONTHLY_PRODUCT_ID!`.
  The component should not hide environment configuration behind magic.
- The catalog lives in app code unless Creem provides first-class platform
  features for the same concept. Do not infer app billing architecture from
  user-defined Creem metadata fields.
- `convex-creem` should support Creem first-class concepts directly. For gaps in
  Creem's current platform model, the component may offer a clearly documented
  intermediate workaround when it meaningfully improves integration. Otherwise,
  app-specific behavior should stay in app code.
- Factual commerce display should come from first-class Creem product fields
  such as name, description, price, currency, billing period, status, and image.
  App-specific sales presentation remains app UI responsibility.
- `groupId` is an app-facing presentation and catalog concept. It should not be
  inferred from Creem product names or metadata. The same primitive can support
  `individual` vs `teams`, `personal` vs `business`, region-specific groups, or
  another product-line split.
- The catalog should preserve literal plan IDs for type safety. In TypeScript,
  `<Subscription.Root plans={["pro"]} />` can only produce a plan-ID type error
  if the component is bound to the app's catalog type. A globally imported
  `Subscription` cannot infer plan literals from a provider higher in the React
  or Svelte tree.

Typed catalog direction:

```ts
export const billingCatalog = defineBillingCatalog({
  plans: [
    { planId: "pro", type: "paid", products: { "every-month": "prod_..." } },
    { planId: "team", type: "paid", products: { "every-month": "prod_..." } },
  ],
} as const);

export type BillingPlanId = PlanId<typeof billingCatalog>; // "pro" | "team"
```

Recommended typed UI binding:

```tsx
const { CreemProvider, Subscription } = createCreemReact({
  catalog: billingCatalog,
  integration: convexIntegration,
});

<Subscription.Root plans={["pro"]} />; // ok
<Subscription.Root plans={["enterprise"]} />; // type error
```

For unbound imports such as `import { Subscription } from "@creem/ui-react"`,
`plans` must remain `string[]`. Apps can still get type safety with helper
functions such as `plansOf(billingCatalog, ["pro"])`, but the bound-component
factory is the cleanest default for strong typing.

### 2. Billing State Snapshot

The snapshot should stay billing-scoped:

```ts
{
  entityId: "org_123",
  catalogVersion: "2026-05-01",
  subscriptions: [
    {
      planId: "private",
      productId: "prod_20GpOqRYWpSpU1pv1KCPet",
      subscriptionId: "sub_123",
      status: "active",
      recurringCycle: "every-year",
      kind: "base",
    },
    {
      planId: "analytics-addon",
      productId: "prod_4vN8qHk2LmS7pR5tYcW9Za",
      subscriptionId: "sub_456",
      status: "active",
      recurringCycle: "every-month",
      kind: "addon",
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
  paymentRecoveryState: "none",
  availableBillingActions: ["portal", "cancel", "switch_interval"],
}
```

The snapshot must support:

- zero, one, or many active subscriptions
- optional `kind` values such as `base` and `addon` when the catalog defines
  them
- multiple subscriptions when an app uses paid add-ons
- one-time products and orders
- add-ons with different billing intervals from the base subscription
- payment recovery derived from subscription status

There should not be a separate top-level primary subscription field in the base
snapshot. The distinction is useful for some app UIs, but the catalog can mark a
subscription as `kind: "base"` when needed. A flat `subscriptions` list with
`planId`, Creem `productId`, and optional `kind` is simpler and more flexible.

For the same reason, there should not be a separate `ownedProductIds` field in
the base snapshot. Owned product IDs are derived from paid orders. Keep the base
state normalized, then expose selectors such as `selectOwnedProductIds(orders)`
for UI convenience.

Orders should include `planId` when the product maps to a catalog entry. This
keeps one-time products aligned with subscriptions and makes it possible to
group multiple Creem products or future pricing variants under one stable app
plan ID.

The example `productId` values should use real Creem-like IDs such as
`prod_20GpOqRYWpSpU1pv1KCPet`, not human-readable placeholders. Human-readable
labels belong in `planId`, not `productId`.

It is common for SaaS apps to have a yearly base subscription and monthly
add-ons, especially when add-ons represent units, usage, or optional modules.
Some businesses solve this through a single subscription with proration or plan
changes. Others use separate subscriptions. `convex-creem` should not assume
only one active subscription exists.

The app maps this into auth and features:

```ts
{
  canEdit: true,
  authPlans: ["private"],
}
```

### 3. UI Widget Extraction and Component Restructuring

Fold the Stage 2 UI-widget refinement from the monorepo evolution plan into this
component work. The widgets should move from Convex-coupled connected components
toward reusable React and Svelte UI packages with a provider contract.

Target packages:

```txt
packages/ui-react/
packages/ui-svelte/
packages/integration-convex/
```

Package structure copied from the monorepo Stage 2 direction:

```txt
packages/ui-react/
├── src/
│   ├── context.tsx
│   ├── primitives/
│   │   ├── BillingToggle.tsx
│   │   ├── PricingCard.tsx
│   │   ├── CheckoutButton.tsx
│   │   └── PortalButton.tsx
│   ├── widgets/
│   │   ├── Subscription.tsx
│   │   ├── Product.tsx
│   │   ├── BillingPortal.tsx
│   │   ├── BillingHistory.tsx
│   │   ├── Credits.tsx
│   │   └── BillingGate.tsx
│   └── index.tsx
├── package.json
└── tsconfig.json
```

`packages/ui-svelte/` should mirror this structure with Svelte components and
Svelte context helpers. Subpath exports such as `@creem/ui-react/Subscription`
and `@creem/ui-svelte/Subscription` should make per-widget imports possible.

The key architectural change is bigger than adding one grouping wrapper to the
current component. Today `Subscription.Item` is registration-only and
`Subscription.Root` renders the cards. Stage 2 should turn subscriptions into a
real compound widget family:

- `Subscription.Root` owns subscription state, selected audience group, selected
  interval, and actions.
- `Subscription.Group` scopes plans to an app-facing audience/product line such
  as `individual` or `teams`.
- `Subscription.GroupSelector` renders the audience selector when there is more
  than one group.
- `Subscription.IntervalSelector` renders the billing-cycle selector when the
  active group has more than one interval.
- `Subscription.Grid` provides the default responsive card layout.
- `Subscription.Item` becomes the plan-card container. If it has no children, it
  renders the default Creem card. If it has children, it becomes a headless card
  shell for custom composition.
- `Subscription.ItemTitle`, `Subscription.ItemPrice`,
  `Subscription.ItemDescription`, `Subscription.ItemCTA`, and
  `Subscription.ItemBadge` read item/root context and render granular pieces.

This gives users a gradient instead of forcing them to choose between a black
box widget and fully custom billing UI.

Progressive-disclosure levels:

| Level                    | User need                                                      | API shape                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Shortcut              | One plan or a complete default pricing section                 | `<Subscription.Root plans={["pro"]} />` or `<Subscription.Root groups={[...]} />`                                                              |
| 2. Default composition   | Choose ordering, grouping, and layout, but keep default cards  | `<Subscription.Root><Subscription.Group><Subscription.Grid><Subscription.Item /></Subscription.Grid></Subscription.Group></Subscription.Root>` |
| 3. Styled composition    | Keep Creem state/actions, customize card structure             | `<Subscription.Item><Subscription.ItemTitle /><Subscription.ItemPrice /><Subscription.ItemCTA /></Subscription.Item>`                          |
| 4. Headless escape hatch | Build app-specific visuals while using billing context/actions | `useCreemBilling()` / `getCreemBilling()` plus lower-level primitives                                                                          |

#### Simple default example

For a single-product subscription with no styling changes, the user should not
need to think about product IDs, tabs, or slots. The provider exposes the
catalog and resolves `planId` + selected interval to the environment-specific
Creem product ID.

```tsx
import { CreemConvexProvider } from "@creem/convex/react";
import { Subscription } from "@creem/ui-react";

<CreemConvexProvider api={connectedApi}>
  <Subscription.Root plans={["pro"]} />
</CreemConvexProvider>;
```

Equivalent explicit form:

```tsx
<CreemConvexProvider api={connectedApi}>
  <Subscription.Root>
    <Subscription.Grid>
      <Subscription.Item planId="pro" />
    </Subscription.Grid>
  </Subscription.Root>
</CreemConvexProvider>
```

Svelte should have the same progressive-disclosure shape:

```svelte
<CreemConvexProvider api={connectedApi}>
  <Subscription.Root plans={["pro"]} />
</CreemConvexProvider>
```

#### Multi-tier grouped default example

For a common SaaS pricing page with individual plans and team plans, users
should not wrap subscription items in third-party tabs. The subscription widget
should own the pricing dimensions that affect checkout: active audience group
and active interval.

```tsx
<CreemConvexProvider api={connectedApi}>
  <Subscription.Root
    groups={[
      {
        value: "individual",
        label: "Individual",
        plans: ["basic-individual", "premium-individual"],
      },
      {
        value: "teams",
        label: "Teams",
        plans: ["basic-teams", "premium-teams"],
      },
    ]}
    defaultGroup="individual"
    defaultCycle="every-year"
  />
</CreemConvexProvider>
```

Equivalent explicit form with default cards:

```tsx
<CreemConvexProvider api={connectedApi}>
  <Subscription.Root defaultGroup="individual" defaultCycle="every-year">
    <Subscription.GroupSelector />
    <Subscription.IntervalSelector />

    <Subscription.Group value="individual" label="Individual">
      <Subscription.Grid>
        <Subscription.Item planId="basic-individual" />
        <Subscription.Item planId="premium-individual" recommended />
      </Subscription.Grid>
    </Subscription.Group>

    <Subscription.Group value="teams" label="Teams">
      <Subscription.Grid>
        <Subscription.Item planId="basic-teams" pricingModel="unit" />
        <Subscription.Item
          planId="premium-teams"
          pricingModel="unit"
          recommended
        />
      </Subscription.Grid>
    </Subscription.Group>
  </Subscription.Root>
</CreemConvexProvider>
```

#### Fully customized grouped example

For users who want custom visual presentation, the same state and actions remain
available through slot components and item context. They can style the card and
feature list while still relying on Creem for price display, CTA state,
checkout, plan switches, interval switches, units, cancellation, and recovery.

```tsx
<CreemConvexProvider api={connectedApi}>
  <Subscription.Root
    group={audience}
    onGroupChange={setAudience}
    cycle={cycle}
    onCycleChange={setCycle}
    groupSelector="external"
    intervalSelector="external"
  >
    <div className="pricing-toolbar">
      <Subscription.GroupSelector className="audience-control" />
      <Subscription.IntervalSelector className="interval-control" />
    </div>

    <Subscription.Group value="individual" label="Individual">
      <Subscription.Grid className="pricing-grid">
        <Subscription.Item planId="basic-individual" className="plan-card">
          <Subscription.ItemBadge />
          <Subscription.ItemTitle className="plan-title" />
          <Subscription.ItemPrice className="plan-price" />
          <Subscription.ItemDescription className="plan-copy" />
          <ul className="feature-list">
            <li>Personal workspace</li>
            <li>Basic support</li>
          </ul>
          <Subscription.ItemCTA className="plan-cta" />
        </Subscription.Item>

        <Subscription.Item
          planId="premium-individual"
          recommended
          className="plan-card"
        >
          <Subscription.ItemBadge label="Popular" />
          <Subscription.ItemTitle />
          <Subscription.ItemPrice />
          <Subscription.ItemDescription />
          <ul className="feature-list">
            <li>Unlimited personal projects</li>
            <li>Priority support</li>
          </ul>
          <Subscription.ItemCTA />
        </Subscription.Item>
      </Subscription.Grid>
    </Subscription.Group>

    <Subscription.Group value="teams" label="Teams">
      <Subscription.Grid className="pricing-grid">
        <Subscription.Item
          planId="basic-teams"
          pricingModel="unit"
          className="plan-card"
        >
          <Subscription.ItemTitle />
          <Subscription.ItemPrice />
          <Subscription.UnitPicker />
          <Subscription.ItemDescription />
          <Subscription.ItemCTA />
        </Subscription.Item>

        <Subscription.Item
          planId="premium-teams"
          pricingModel="unit"
          recommended
          className="plan-card"
        >
          <Subscription.ItemBadge label="Best for teams" />
          <Subscription.ItemTitle />
          <Subscription.ItemPrice />
          <Subscription.UnitPicker />
          <Subscription.ItemDescription />
          <Subscription.ItemCTA />
        </Subscription.Item>
      </Subscription.Grid>
    </Subscription.Group>
  </Subscription.Root>
</CreemConvexProvider>
```

Needed root/group props:

```ts
type SubscriptionRootProps = {
  /** Shortcut: render default cards from catalog plan IDs. */
  plans?: string[];
  /** Shortcut: render grouped default cards from catalog plan IDs. */
  groups?: Array<{
    value: string;
    label: string;
    description?: string;
    plans: string[];
  }>;
  defaultGroup?: string;
  group?: string;
  onGroupChange?: (group: string) => void;
  defaultCycle?: RecurringCycle;
  cycle?: RecurringCycle;
  onCycleChange?: (cycle: RecurringCycle) => void;
  groupSelector?: "auto" | "hidden" | "external";
  intervalSelector?: "auto" | "hidden" | "external";
};

type SubscriptionGroupProps = {
  value: string;
  label: string;
  description?: string;
  children: React.ReactNode; // Svelte snippet equivalent
};

type SubscriptionItemProps = {
  /** Stable app-facing plan ID from the catalog. Preferred. */
  planId: string;
  /** Optional override when the catalog is not used yet. Migration escape hatch. */
  productIds?: Partial<Record<RecurringCycle, string>>;
  type?: "free" | "single" | "unit-based" | "enterprise";
  pricingModel?: "flat" | "unit";
  title?: string;
  description?: string;
  recommended?: boolean;
  contactUrl?: string;
  children?: React.ReactNode; // Omit for default card rendering
};
```

If `groups` is omitted, `Subscription.Root` may infer groups from catalog
`groupId` metadata. The explicit `groups` prop is for page-level ordering,
labels, and launch-safe examples where the app author wants the rendered pricing
surface to be obvious from the component markup.

Selector behavior:

- `groupSelector: "auto"` renders a first-class audience segmented control only
  when more than one group is registered.
- `intervalSelector: "auto"` renders the billing-cycle control only when the
  active group has more than one available cycle.
- `groupSelector: "external"` and `intervalSelector: "external"` allow apps to
  position/customize the built-in selector parts while keeping state in
  `Subscription.Root`.
- The controls may use Ark UI Tabs/Segment Group internally, but they should be
  named as audience and interval selectors in the public API. This prevents
  users from thinking they need to nest app tabs around subscription items.
- If `Subscription.Root` receives `plans` or `groups` and no children, it
  renders the complete default pricing section.
- If `Subscription.Item` has no children, it renders the default plan card.
- If `Subscription.Item` has children, only the user-provided children render.
  Slot components inside the item use item context.
- The active group filters plans before available intervals are computed. This
  avoids showing unavailable intervals for a group.
- Use one `<Subscription.Root>` for one mutually exclusive base-plan decision.
  Use additional roots only for independent billing decisions such as add-ons
  that can be purchased alongside the base subscription.

Accessibility guidance:

- If the group selector is implemented with tabs, each tablist needs a clear
  accessible label such as "Billing audience". The interval selector should use
  a separate label such as "Billing interval".
- Automatic activation is fine when all pricing data is already mounted and
  switching is instant. If panels are lazy-loaded or remote data is fetched on
  activation, use manual activation.
- Avoid nested tablists for the common pricing-page case. Two adjacent controls
  are easier to scan and reason about than one tablist containing another.

Stage 2 widget deliverables:

- Decouple React/Svelte widgets from Convex function references. Widgets consume
  a shared `BillingContextValue` from framework context.
- Move product-ID resolution out of normal UI usage. UI code should prefer
  stable `planId`; integration providers resolve `planId` + interval to Creem
  product IDs through the catalog. Inline `productIds` remain as a migration
  escape hatch.
- Keep the high-level compound API: `Subscription.Root`, `Subscription.Item`,
  `Product.Root`, `Product.Item`, and `BillingPortal`.
- Add `Subscription.Group`, `Subscription.GroupSelector`,
  `Subscription.IntervalSelector`, `Subscription.Grid`, and
  `Subscription.UnitPicker`.
- Add granular headless slots for customized plan cards:
  `Subscription.ItemTitle`, `Subscription.ItemPrice`,
  `Subscription.ItemDescription`, `Subscription.ItemCTA`, and
  `Subscription.ItemBadge`.
- Define immediately supportable additional widget families from the monorepo
  plan: `BillingHistory`, `Credits`, and `BillingGate`.
- Implement `BillingHistory` v1 from Creem transactions. The SDK exposes
  `creem.transactions.getById(transactionId)` and
  `creem.transactions.search(customerId?, orderId?, productId?, pageNumber?, pageSize?)`,
  returning `TransactionListEntity` with `items` and `pagination`. The widget
  should be explicitly transaction-based at first and support pagination through
  `pagination.currentPage`, `nextPage`, `prevPage`, `totalPages`, and
  `totalRecords`.
- Do not ship `PaymentMethods` or `Preferences` widgets yet. They are blocked
  until Creem exposes direct API/SDK support for payment methods and customer
  billing preferences. Avoid placeholder portal-wrapper components for these
  names because they imply native embeddable functionality that does not exist
  yet.
- Invoice/receipt links or PDFs are not part of the transaction-history v1.
- Add optional `credits` capability to the provider contract instead of adding a
  second credit-specific provider.
- Model purchasable credit packs as app-side catalog entries with `creditGrant`,
  for example an onetime/repeatable `ai-credits-100` entry that resolves to an
  environment-specific Creem product ID and grants 100 credits from webhook
  fulfillment.
- Do not trust checkout metadata for entitlement values. Checkout metadata may
  identify the Convex user/entity and correlate events, but credit amounts,
  account names, and refund behavior should be derived from the server-owned
  billing catalog or app code.
- When a Creem refund event references a product with `creditGrant`, debit the
  granted credits according to the catalog refund policy. The default policy
  should deduct the full grant only for full refunds. Apps can opt into
  proportional partial-refund debits with `refundBehavior: "prorate"`, eager
  full debits with `"debit"`, or manual handling with `"none"`.
- `Credits` should follow the same progressive-disclosure model as
  `Subscription`: a simple default widget for balance + refresh, plus composable
  slots such as `Credits.Title`, `Credits.Amount`, `Credits.Refresh`,
  `Credits.Error`, and `Credits.Status`. Credit consumption should stay
  app-owned: production feature buttons should call backend actions, such as
  `generateImage()`, that own the debit amount and feature-side idempotency.
- Preserve framework parity across React and Svelte for props and examples.

Example coverage requirement:

- Every new widget or composition primitive must be added to both
  `example-react` and `example-svelte`.
- Both examples should include a canonical Individual vs Teams subscription
  group with multiple billing intervals.
- Examples should also show the external-control path for advanced apps, using
  controlled `group`/`cycle` props rather than wrapping `Subscription.Item`
  inside third-party tabs.
- The example apps are regression targets for the extraction: checkout, interval
  switching, group switching, unit updates, cancellation/resume, portal, payment
  recovery, and one-time products should keep working.

### 4. Temporary Free Plan Transition Workaround

Creem cancellation already supports the "cancel to no paid plan at period end"
case through normal subscription cancellation and
`subscription.scheduled_cancel` events. `convex-creem` should not add a custom
transition API for that.

The only workaround needed for now is "paid subscription ends at period end,
then the app should activate its app-owned free plan." This is an intermediate
bridge until Creem supports native free plans.

Possible shape:

```ts
await creem.subscriptions.cancelToFreePlan(ctx, {
  entityId,
  subscriptionId,
  freePlanId: "free",
});
```

Important constraints:

- This is not a general plan-change API.
- Normal paid plan changes should use Creem subscription update/upgrade APIs.
- Normal cancellation should use the existing subscription cancel API.
- The workaround should be documented as temporary and migrate cleanly to native
  Creem free plans later.

### 5. Payment Recovery UI and State

Add subscription-focused payment recovery primitives.

Backend helper:

```ts
paymentRecoveryState:
  | "none"
  | "warning"
  | "blocked"
```

This should be derived from the current subscription status, not stored as a
separate source of truth.

UI primitives:

```svelte
<CreemConvexProvider api={billingApi}>
  <PaymentRecoveryBanner />
  <PaymentRecoveryButton>Update payment method</PaymentRecoveryButton>
</CreemConvexProvider>
```

Responsibilities:

- Component reads subscription/customer state.
- Component opens Creem customer portal.
- App decides whether the whole app is blocked.

### 6. Usage Limit Helpers

Do not make the component count app usage. Provide a helper contract for apps to
evaluate their own usage against the catalog.

Example:

```ts
const usage = await getUsage(ctx, { entityId });

const limits = evaluateUsageLimits({
  catalog,
  planId: resolveBasePlanId(snapshot.subscriptions) ?? "free",
  usage,
});
```

Output:

```ts
{
  aiMessages: {
    used: 5,
    limit: 5,
    exceeded: true,
  },
}
```

Composition guidance:

- UI widgets may show upgrade/limit banners using this data.
- Auth/app guards still enforce feature access.
- The component should not mutate app usage counters.
- Creem Customer Credits should be treated as a separate capability. Credits can
  later become a `creem.credits.*` namespace and UI widget.

### 7. Consent and Policy Gates

Keep consent storage in the app. Provide pre-action hooks that allow apps to
block checkout, plan switches, or free-plan activation until policy acceptance
is complete.

Current support:

- `onBeforeCheckout` exists.

Needed:

- `onBeforePlanChange`
- `onBeforeFreePlanActivation`
- examples for policy confirmation dialogs

Example:

```svelte
<CreemConvexProvider
  api={billingApi}
  onBeforeCheckout={ensurePolicyAccepted}
  onBeforePlanChange={async (intent) => {
    if (intent.toPlanId === "free") {
      return await ensureFreePlanPolicyAccepted();
    }
    return true;
  }}
>
  <Subscription.Root />
</CreemConvexProvider>
```

### 8. Integration Guide

Create a step-by-step guide that covers both quick integration and serious app
integration.

Suggested sections:

1. Install and register the component.
2. Configure Creem env vars.
3. Define the billing entity resolver.
4. Define a stable plan catalog.
5. Sync products.
6. Register webhooks.
7. Choose quick wrappers or custom auth/RBAC wrappers.
8. Wire checkout, portal, and subscription operations.
9. Add raw event handlers for app-specific side effects.
10. Add widgets.
11. Add payment recovery UI.
12. Add usage limit composition.
13. Add policy/consent gates.
14. Test checkout and webhooks in test mode.
15. Configure production product IDs and webhook secrets.

## Future Creem Platform Requests

These are not `convex-creem` implementation tasks. They are Creem platform
features that would make the component simpler and reduce app-side mapping.

### Embedded checkout / iframe payment flow

Current behavior:

- Creem checkout is hosted on a separate Creem page.
- `convex-creem` can create checkout sessions and redirect users to that hosted
  checkout, but it cannot keep checkout embedded in the app.
- Apps that want a fully in-product payment flow must still send users away from
  their own domain, which can add friction and make the billing experience feel
  less integrated.

Desired platform behavior:

- Support an embeddable checkout flow, such as iframe-based checkout or an
  equivalent first-class embedded payment session.
- Provide a secure integration contract for origin allowlists, session lifetime,
  redirect/cancel handling, completion callbacks, and post-checkout status
  reconciliation.
- Keep webhook events as the source of truth for durable billing state while
  allowing the embedded flow to update UI immediately after checkout completes.
- Provide deterministic test-mode behavior that lets apps run end-to-end tests
  for billing workflows and embedded billing components without navigating away
  from the app origin.
- Document the embedded flow across the API, SDK, dashboard settings, test mode,
  and production security requirements.

Related Creem feature request:

- [Request for iframe payment integration support](https://creem.featurebase.app/en/p/request-for-iframe-payment-integration-support)

Impact on `convex-creem`:

- Add an embedded checkout mode to checkout helpers and widgets once Creem
  exposes the platform primitive.
- Let `Subscription.ItemCTA`, `CheckoutButton`, and custom billing UIs choose
  between redirect checkout and embedded checkout where supported.
- Keep redirect checkout as the default fallback when embedded checkout is not
  configured, unavailable, or blocked by browser/payment-provider constraints.
- Enable `convex-creem` to run full browser e2e coverage for checkout-driven
  subscription, one-time product, credit-pack, and billing-state workflows.

### Native free plans

When Creem supports native free plans, the desired end state is:

- `free` is represented directly by Creem, not only by app-side auth state.
- Downgrading from paid Private to Free becomes a Creem-backed plan transition.
- Canceling completely remains distinct from downgrading to free.
- `convex-creem` still exposes stable plan IDs, so app code does not change.

The catalog keeps the same shape:

```ts
{
  planId: "free",
  type: "free",
}
```

Only the plan backing changes:

- today: app-owned free plan
- future: Creem-owned free plan

### Stable product identity and developer slugs across environments

Desired platform behavior:

- Provide a stable product identity that can survive test to production
  promotion, or provide a native staging/promote workflow so products can move
  from test to production without changing app mappings.
- Provide a developer-owned product slug/key, such as `pro`, `basic-team`, or
  `premium-individual`, that is unique within the merchant account and available
  in API, SDK, CLI, dashboard, webhooks, checkout creation, and product search.
- Ideally support both. A stable platform identity solves lifecycle and
  promotion. A developer slug solves app-code ergonomics, readable catalog
  mappings, and cross-tool references.

Why both are useful:

| Concept                 | Owner        | Example                                              | Purpose                                        |
| ----------------------- | ------------ | ---------------------------------------------------- | ---------------------------------------------- |
| Stable product identity | Creem        | `prod_20GpOqRYWpSpU1pv1KCPet` or promoted lineage ID | Durable platform reference across environments |
| Developer slug/key      | Merchant/app | `premium-team`                                       | Human-readable app/catalog reference           |

Recommended request:

- Ask Creem for native product slugs and a stable promote/linking model. If they
  want to ship this incrementally, slugs are the easiest first step because apps
  can map by slug even when test/prod remote product IDs differ. The full end
  state should still include stable identity or product promotion so config as
  code can reason about object lineage without heuristics.

Open design question for Creem:

- Should slugs be global per merchant, scoped by environment, or shared across
  linked test/prod products? For app integration, the best behavior is a shared
  slug across linked environments with environment-specific underlying IDs.

Impact on `convex-creem`:

- Reduces the need for environment-specific product ID mapping.
- Makes app-level plan catalogs easier to keep consistent.
- Avoids threading environment variables through product catalogs for each Creem
  product ID, so apps can keep one shared catalog instead of maintaining a
  browser-facing catalog and a separate Convex/server catalog.
- Makes docs and examples less error-prone.
- Allows catalog entries to use `productSlug` or `productKey` as the normal
  authoring path, while still storing Creem product IDs in synced billing state.
- Gives `groupId` a natural future bridge if Creem later supports product groups
  or audience/product-line slugs natively.

Possible future catalog shape:

```ts
{
  planId: "premium-team",
  groupId: "teams",
  type: "paid",
  pricingModel: "unit",
  products: {
    "every-month": { productSlug: "premium-team-monthly" },
    "every-year": { productSlug: "premium-team-yearly" },
  },
}
```

Until Creem exposes this, `convex-creem` should keep using app-owned stable
`planId` and environment-specific product IDs.

### One product with multiple billing cycles

Desired platform behavior:

- Support one product with multiple billing cycles instead of requiring a
  separate product for every interval.

Impact on `convex-creem`:

- A stable Creem product could directly represent a stable app plan.
- The catalog would no longer need to group monthly/yearly product IDs into one
  plan.
- Widgets could switch intervals on the same product identity instead of moving
  between product IDs.

### First-class pricing variants per product

Desired platform behavior:

- Support multiple prices or pricing variants under one product, such as
  monthly, yearly, regional, promotional, or tiered variants.

Impact on `convex-creem`:

- A stable Creem product could map to a stable app `planId`, while the selected
  price/variant captures the commercial details.
- One-time products could have multiple pricing variants without forcing apps to
  model each variant as a separate product.
- The billing snapshot could expose both `productId` and `priceId` or
  `variantId` when Creem supports that model.
- The catalog would need less grouping logic and could stay closer to Creem's
  first-class product model.

### Payment method, customer preference, and invoice/receipt APIs

Current behavior:

- Payment method management and customer billing preferences are available
  through Creem's customer portal only.
- Creem exposes transaction retrieval and paginated transaction search through
  both the REST API and TypeScript SDK:
  `creem.transactions.getById(transactionId)` and
  `creem.transactions.search(customerId?, orderId?, productId?, pageNumber?, pageSize?)`.
- Transaction search returns `TransactionListEntity` with `items` and
  `pagination` (`totalRecords`, `totalPages`, `currentPage`, `nextPage`,
  `prevPage`). This is enough for a transaction-history `BillingHistory` v1.
- Direct invoice/receipt links/PDFs, payment methods, and customer billing
  preferences are not exposed as app-embeddable API surfaces yet.

Desired platform behavior:

- Payment Methods API: list payment methods, show default method, create portal
  or setup session for adding/updating methods, set default method when safe,
  and remove methods when allowed.
- Billing Preferences API: read/update billing email, billing name, company
  details, address, tax IDs, invoice metadata, and customer locale where
  applicable.
- Invoice/Receipt API: expose hosted receipt URLs, invoice PDFs when available,
  invoice identifiers, and receipt/invoice metadata linked to transactions.
- SDK and CLI parity for the same APIs.

Impact on `convex-creem`:

- `BillingHistory` can ship now as a paginated transaction-history widget. It
  should not promise invoice download, receipt PDF, or payment-method management
  until Creem exposes those APIs.
- `PaymentMethods` and `Preferences` widgets are blocked until direct APIs
  exist. Do not ship portal-wrapper components under these names in the
  meantime.
- Existing transaction sync can still be used internally for billing state,
  payment recovery, and app-specific reporting where raw transaction records are
  sufficient.

### Customer Credits webhooks

Current behavior:

- Creem exposes the Customer Credits API, but does not currently emit webhooks
  for credits balance or credits ledger changes.
- `convex-creem` therefore needs to query Creem directly when showing or
  enforcing credits state.
- Direct reads keep Creem as the source of truth, but they do not provide Convex
  reactivity because credits changes are not replicated into Convex.
- Product purchase grants and refund deductions are app-side fulfillment for
  now. `convex-creem` should derive grant amounts from a server-owned
  `billingCatalog.creditGrant`, not from client-supplied checkout metadata.

Desired platform behavior:

- Emit webhooks for credits balance changes and ledger entries, including
  customer identity, delta, resulting balance, reason/type, idempotency/event
  identifiers, and enough metadata to reconcile missed events.
- Include Customer Credits webhook support in the API, SDK, dashboard webhook
  configuration, event documentation, and local/test tooling.

Impact on `convex-creem`:

- The component could replicate Customer Credits state into Convex and keep it
  synchronized through webhooks.
- Apps could subscribe to local Convex credits queries and get full reactivity
  for balances, usage controls, and credit-aware UI.
- Credits widgets and guards would no longer need to rely on non-reactive direct
  reads from Creem for the common display path.

### Customer Credits product and affiliate grants

Current behavior:

- Creem Customer Credits is currently a ledger-style API. Apps call credit/debit
  when app events happen, such as purchases, usage, referrals, goodwill,
  compensation, or promotions.
- Credit-pack purchases are common enough that app-side fulfillment must map a
  purchased product to a credit amount until Creem provides a native product
  grant model.
- Affiliate/referral credit rewards are also app-side today, even when the
  purchase attribution itself comes from Creem.

Desired platform behavior:

- Let merchants configure Customer Credits grants directly on Creem products:
  credit account/name, amount, unit label, whether grants happen once or on
  every recurring renewal, and refund/reversal behavior.
- Emit or expose idempotent ledger entries for product grants with references
  back to checkout, order, subscription renewal, product, and transaction IDs.
- Support refund handling as first-class behavior, including full refunds and a
  documented policy for partial refunds.
- Let merchants configure Customer Credits rewards for Creem affiliate/referral
  attribution, including reward recipient, amount, idempotency, and reversal
  behavior if the attributed purchase is refunded or disputed.

Impact on `convex-creem`:

- The catalog `creditGrant` bridge can become a compatibility layer or be
  removed for apps that use Creem-native product credit grants.
- Webhook handling can stop deriving product-to-credit mappings from app code
  and instead sync/display Creem-owned credit ledger entries.
- Examples can show native Creem credit-pack and affiliate reward setup instead
  of app-side fulfillment code.

### Product localization / i18n

Current behavior:

- Creem products expose one product name and one description. Apps can localize
  their own widget copy, but widgets that derive display text directly from
  Creem receive only one language.

Desired platform behavior:

- Product fields should support locale-specific `name` and `description`.
- API, SDK, dashboard, CLI, and webhooks should preserve localized product
  `name` and `description` data.
- Product retrieval/search should support a requested locale and a fallback
  locale, or return the full localization map for server-side selection.

Impact on `convex-creem`:

- Drop-in widgets can derive localized factual display from Creem instead of
  requiring app-side overrides.
- The new compound widget structure still supports app-owned i18n through
  `Subscription.ItemTitle`, `Subscription.ItemDescription`, and custom children.
  Creem-native i18n makes the simple default path work better.
- Runtime UI-label i18n for default widgets, dialogs, tables, status messages,
  and accessibility labels is tracked separately in
  `convex-creem-i18n-plan.md`.

## Implementation Order

1. Catalog v2 and environment-aware product mapping.
2. Billing state snapshot cleanup and naming.
3. UI widget extraction, provider contract, and grouped subscription API.
4. Example React/Svelte coverage for every new implementation.
5. Payment recovery state and UI primitives.
6. Pre-action gates for plan changes/free activation.
7. Temporary free plan transition workaround.
8. Usage limit helper.
9. Credits namespace investigation.
10. Integration guide.
11. Brownfield app migration as validation.

## Implementation Checklists

Use these checklists to turn the plan into implementation issues. Each item
should land with tests or example coverage unless explicitly marked as
docs-only.

### Catalog and Core

- [x] Add Catalog v2 types for `planId`, `groupId`, recurring products,
      `pricingModel: "flat" | "unit"`, free/trial/default plans, one-time
      products, and optional limits metadata.
- [x] Preserve literal plan IDs from `defineBillingCatalog(... as const)` and
      expose helper types such as `PlanId<typeof catalog>`.
- [ ] Add a typed binding API, such as
      `createCreemReact({ catalog, integration })` and the Svelte equivalent, so
      `plans={["unknown"]}` can fail at compile time when a component is bound
      to a catalog.
- [x] Keep unbound UI imports usable with `string[]` plan IDs for lower-friction
      adoption.
- [x] Add product resolution helpers for `planId` + `RecurringCycle` to Creem
      product ID, including clear errors for missing intervals.
- [x] Keep inline `productIds` as a migration escape hatch, but document
      catalog-backed `planId` as the preferred path.
- [ ] Add selectors for owned products, active base subscription, active
      add-ons, payment recovery state, available actions, and usage-limit
      evaluation.
- [x] Normalize naming from seat-specific language to unit-based language in new
      APIs without retaining backward-compatible aliases.

### Billing Snapshot

- [ ] Move toward a normalized snapshot with `subscriptions[]` and `orders[]`
      instead of a single primary subscription field.
- [x] Include `planId`, `productId`, `subscriptionId`, `status`,
      `recurringCycle`, and optional `kind` on subscription rows.
- [x] Include `planId`, `orderId`, `productId`, and `status` on order rows when
      products map to catalog entries.
- [x] Derive `paymentRecoveryState` from subscription status.
- [ ] Add selectors that keep UI convenience fields out of the base snapshot.

### Provider Contract

- [x] Define `BillingContextValue` in the shared core package.
- [x] Include reactive model state, loading/error state, checkout creation,
      subscription update, cancel/resume, portal URL, invalidation, and optional
      credits capability.
- [x] Add transaction-history capability for `BillingHistory` v1 using paginated
      transactions.
- [ ] Implement Convex React provider against existing Convex functions.
- [ ] Implement Convex Svelte provider against existing Convex functions.
- [ ] Keep provider ownership rules documented: full-stack integration wins,
      then server runtime, then client/data integration.

### UI Packages

- [ ] Extract `packages/ui-react` and `packages/ui-svelte` with mirrored widget
      and primitive structure.
- [ ] Move shared styling into UI package styles that consume core design
      tokens.
- [x] Implement `Subscription.Root`, `Subscription.Group`,
      `Subscription.GroupSelector`, `Subscription.IntervalSelector`,
      `Subscription.Grid`, `Subscription.Item`, `Subscription.UnitPicker`, and
      item slots.
- [x] Support the four progressive-disclosure levels: shortcut, default
      composition, styled composition, and headless escape hatch.
- [x] Ensure group selection filters plans before available intervals are
      computed.
- [x] Ensure interval controls hide automatically when the active group has only
      one interval.
- [x] Implement `BillingHistory` v1 as transaction history only, with pagination
      controls backed by `pageNumber`, `pageSize`, and the returned pagination
      object.
- [x] Implement app-side Customer Credits purchase grants from server-owned
      catalog `creditGrant` entries, without trusting client checkout metadata
      for credit amounts.
- [x] Debit catalog-granted credits on refund events according to the catalog
      refund policy.
- [x] Implement `Credits` as a balance/refresh widget with composable `Title`,
      `Amount`, `Refresh`, `Error`, and `Status` slots, without a built-in
      consume button.
- [x] Implement `BillingGate` as a billing-state conditional renderer.
- [x] Keep `PaymentMethods` and `Preferences` out of the package until Creem
      exposes direct APIs.
- [x] Keep invoice/receipt links or PDFs out of `BillingHistory` v1.
- [x] Preserve React and Svelte prop parity, allowing only framework-native
      differences such as `className` vs `class`.

### Convex Integration Migration

- [ ] Move Convex-specific schema, functions, client class, and webhook handling
      into the Convex integration package boundary.
- [ ] Replace direct widget usage of Convex `FunctionReference`, `useQuery`,
      `useMutation`, and Svelte Convex hooks with provider usage.
- [x] Preserve existing checkout, portal, subscription update, cancel, resume,
      pause, product sync, order sync, and webhook behavior.
- [x] Add transaction query/action support needed by `BillingHistory` v1.
- [ ] Add migration docs for old connected widgets to provider + UI package
      imports.

### Examples and Docs

- [ ] Update `example-react` for the new provider and UI packages.
- [ ] Update `example-svelte` for the new provider and UI packages.
- [x] Add a one-plan default subscription example.
- [x] Add an Individual vs Teams grouped pricing example with unit-based team
      plans.
- [x] Add a fully customized card example using item slots.
- [x] Add `BillingHistory` v1 examples with pagination.
- [x] Add backend-owned Customer Credits consumption demos in React and Svelte,
      with feature action buttons calling Convex actions.
- [x] Add payment recovery examples.
- [x] Add usage-limit composition examples.
- [x] Add policy-gate examples for checkout and plan changes.
- [x] Document that `PaymentMethods` and `Preferences` are blocked future
      widgets, not portal wrappers.
- [ ] Document app-side i18n via slots and Creem-native product-name/description
      i18n as a platform request.

## Test Requirements

### Core Unit Tests

- Catalog validation accepts free, trial, paid flat, paid unit-based, grouped,
  one-time, and limits metadata plans.
- Catalog validation rejects duplicate `planId`s, invalid product maps, missing
  required recurring products, and invalid group references.
- Product resolution returns the expected Creem product ID for `planId` +
  interval and gives a clear error for unavailable intervals.
- Snapshot selectors handle zero subscriptions, one base subscription, multiple
  subscriptions, add-ons, one-time orders, canceled/scheduled-cancel states, and
  payment recovery states.
- Usage-limit helper correctly reports under-limit, at-limit, exceeded, and
  unlimited states.
- Type tests verify catalog-bound components reject unknown plan IDs.

### Provider and Integration Tests

- Convex React provider maps billing model query state into
  `BillingContextValue`.
- Convex Svelte provider maps billing model query state into the Svelte context
  equivalent.
- Checkout creation resolves catalog plan IDs to environment-specific product
  IDs and passes success URL, theme, units, discount, and identity/correlation
  metadata where applicable. Credit entitlement values must be derived
  server-side from the catalog.
- Subscription update supports plan switches, interval switches, and unit
  updates with optimistic state.
- Cancel/resume behavior preserves current optimistic-update protections.
- Webhook tests cover catalog-derived Customer Credits grants for completed
  checkouts and debit/reversal behavior for refunds.
- Transaction-history provider calls Creem/Convex transaction search with
  `pageNumber` and `pageSize` and returns pagination metadata unchanged.
- Providers surface loading and error states consistently across React and
  Svelte.

### Widget Tests

- `Subscription.Root plans={...}` renders default pricing cards.
- `Subscription.Root groups={...}` renders group and interval selectors when
  needed.
- `Subscription.GroupSelector` changes the active group and recomputes available
  intervals.
- `Subscription.IntervalSelector` hides for single-interval groups and shows for
  multi-interval groups.
- `Subscription.Item` with no children renders the default card.
- `Subscription.Item` with children renders only custom children and supplies
  item context to slot components.
- Unit-based plans render `Subscription.UnitPicker` and pass unit updates to the
  provider.
- CTA states cover unauthenticated checkout, active plan, switch plan, switch
  interval, canceled/scheduled cancel, enterprise/contact sales, and disabled
  permissions.
- `BillingHistory` renders transaction rows, empty state, loading state, error
  state, next/previous pagination, and page-size behavior.
- `BillingGate` renders allowed, denied, loading, and fallback states.
- Accessibility tests cover group selector labels, interval selector labels,
  keyboard navigation, focus management for dialogs, and disabled buttons.

### Example and End-to-End Tests

- `example-react` builds successfully.
- `example-svelte` builds successfully.
- Both examples render the one-plan shortcut flow.
- Both examples render grouped Individual vs Teams pricing.
- Both examples exercise interval switching, group switching, unit changes,
  checkout creation, subscription update, cancel/resume, portal link, and
  payment recovery UI against mocked or test-mode data.
- Both examples render `BillingHistory` v1 with at least two pages of mocked
  transactions.
- Browser verification should confirm no console errors, no overlapping text,
  functional selector controls, and responsive layouts on mobile and desktop.

### Regression and Compatibility Tests

- Existing Convex component tests continue to pass.
- Existing webhook parsing and raw event middleware tests continue to pass.
- Existing product, subscription, order, checkout, portal, cancel/resume, pause,
  and optimistic-update tests continue to pass.
- Old seat-based props/components are not retained as aliases; the README
  migration guide documents the required rename path.
- Tree-shaking/subpath import tests verify importing `Subscription` does not
  require unrelated widgets such as `Credits`.

## Acceptance Criteria

- A new app can render a one-plan subscription with one provider and one
  `<Subscription.Root plans={["pro"]} />` call.
- A SaaS app can render Individual vs Teams pricing with unit-based team plans,
  multiple intervals, and no third-party tab wrapper around subscription items.
- A design-heavy app can customize plan-card structure while keeping Creem-owned
  checkout, subscription update, unit update, and billing-state behavior.
- `BillingHistory` v1 displays paginated transactions from the SDK/API and makes
  no invoice/receipt promises.
- `PaymentMethods` and `Preferences` are documented as blocked future widgets
  until direct APIs exist.
- React and Svelte examples cover every new primitive and pass build plus
  browser smoke verification.
