# Integration Guide — `@mmailaender/convex-creem`

Step-by-step guide for integrating the Convex Creem billing system into your
React or Svelte application.

---

## 1. Install

```bash
npm install @mmailaender/convex-creem
```

---

## 2. Configure the Convex backend

Create `convex/billing.ts`:

```ts
import { Creem } from "@mmailaender/convex-creem";

const creem = new Creem(components.creem, {
  cancelMode: "scheduled", // or "immediate"
});

const resolve = async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return {
    userId: identity.subject,
    email: identity.email!,
    entityId: identity.subject, // or your org/team ID
  };
};

const { uiModel, checkouts, subscriptions, customers, transactions } =
  creem.api({ resolve });

export { uiModel };
export const checkoutsCreate = checkouts.create;
export const subscriptionsUpdate = subscriptions.update;
export const subscriptionsCancel = subscriptions.cancel;
export const subscriptionsResume = subscriptions.resume;
export const customersPortalUrl = customers.portalUrl;
export const transactionsSearch = transactions.search;
```

---

## 3. Define your plan catalog

```ts
import { defineBillingCatalog } from "@mmailaender/convex-creem/react";

export const catalog = defineBillingCatalog({
  version: "1",
  defaultPlanId: "free",
  plans: [
    {
      planId: "free",
      category: "free",
      title: "Free",
      description: "For individuals getting started",
      limits: { projects: 3, members: 1 },
    },
    {
      planId: "pro",
      category: "paid",
      billingType: "recurring",
      billingCycles: ["every-month", "every-year"],
      title: "Pro",
      description: "For growing teams",
      recommended: true,
      creemProductIds: {
        "every-month": "prod_monthly_xxx",
        "every-year": "prod_yearly_xxx",
      },
      limits: { projects: 50, members: 10 },
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

---

## 4. Create a typed binding (optional but recommended)

### React

```tsx
import { createCreemReact } from "@mmailaender/convex-creem/react";
import { api } from "../convex/_generated/api";
import { catalog } from "./billing-catalog";

export const billing = createCreemReact({
  catalog,
  api: {
    uiModel: api.billing.uiModel,
    checkouts: { create: api.billing.checkoutsCreate },
    subscriptions: {
      update: api.billing.subscriptionsUpdate,
      cancel: api.billing.subscriptionsCancel,
      resume: api.billing.subscriptionsResume,
    },
    customers: { portalUrl: api.billing.customersPortalUrl },
    transactions: { search: api.billing.transactionsSearch },
  },
});

// billing.planIds → ["free", "pro", "enterprise"] (typed)
```

### Svelte

```ts
import { createCreemSvelte } from "@mmailaender/convex-creem/svelte";
// Same pattern as React
```

---

## 5. Wire up widgets

### React — Subscription widget

```tsx
import { Subscription } from "@mmailaender/convex-creem/react";
import { billing } from "./billing";

export function PricingPage() {
  return (
    <Subscription.Root
      api={billing.api}
      catalog={billing.catalog}
      plans={billing.planIds}
      defaultCycle="every-month"
    >
      <Subscription.Item planId="free" type="free" />
      <Subscription.Item planId="pro" type="single" />
      <Subscription.Item planId="enterprise" type="enterprise" />
    </Subscription.Root>
  );
}
```

### Svelte — Subscription widget

```svelte
<script>
  import { Subscription } from "@mmailaender/convex-creem/svelte";
  import { billing } from "./billing";
</script>

<Subscription.Root
  api={billing.api}
  catalog={billing.catalog}
  plans={billing.planIds}
  defaultCycle="every-month"
>
  <Subscription.Item planId="free" type="free" />
  <Subscription.Item planId="pro" type="single" />
  <Subscription.Item planId="enterprise" type="enterprise" />
</Subscription.Root>
```

---

## 6. Groups and intervals

Use `groups` to segment plans by audience:

```tsx
<Subscription.Root
  api={billing.api}
  catalog={billing.catalog}
  groups={[
    { value: "individual", label: "Individual", plans: ["free", "pro"] },
    { value: "teams", label: "Teams", plans: ["team-pro", "enterprise"] },
  ]}
  groupSelector="auto" // or "hidden" / "external"
  intervalSelector="auto" // or "hidden" / "external"
/>
```

For external selector placement:

```tsx
<Subscription.Root groupSelector="external" intervalSelector="external">
  <Subscription.GroupSelector />
  <Subscription.IntervalSelector />
  <Subscription.Grid>
    <Subscription.Item planId="free" type="free" />
    <Subscription.Item planId="pro" type="single" />
  </Subscription.Grid>
</Subscription.Root>
```

---

## 7. Consent gates

Block checkout or plan changes until the user accepts terms:

```tsx
<Subscription.Root
  api={billing.api}
  catalog={billing.catalog}
  plans={billing.planIds}
  onBeforeCheckout={async ({ productId }) => {
    return await showTermsDialog();
  }}
  onBeforePlanChange={async ({ fromPlanId, toPlanId, productId }) => {
    return await confirmPlanChange(fromPlanId, toPlanId);
  }}
  onBeforeFreePlanActivation={async ({ freePlanId }) => {
    return await confirmDowngrade();
  }}
/>
```

---

## 8. Usage limits

Check feature usage against plan limits:

```ts
import { evaluateUsageLimits } from "@mmailaender/convex-creem/react";

const result = evaluateUsageLimits(catalog, "pro", {
  projects: 45,
  members: 8,
});
// result.projects → { used: 45, limit: 50, exceeded: false }
// result.members → { used: 8, limit: 10, exceeded: false }
```

---

## 9. Payment recovery

Show recovery UI when subscriptions are past due:

```tsx
import {
  PaymentRecoveryBanner,
  PaymentRecoveryButton,
  derivePaymentRecoveryState,
} from "@mmailaender/convex-creem/react";

// Auto-detect from the billing snapshot
<PaymentRecoveryBanner snapshot={snapshot} />

// With explicit portal button
<PaymentRecoveryButton portalUrl={api.billing.customersPortalUrl}>
  Update payment method
</PaymentRecoveryButton>
```

---

## 10. Free plan transition (workaround)

Until Creem supports native free plans, use `cancelToFreePlan` to schedule
cancellation and activate the app-owned free plan:

```ts
// In your Convex function:
const { freePlanId } = await creem.subscriptions.cancelToFreePlan(ctx, {
  entityId,
  freePlanId: "free",
});

// In your webhook handler for subscription.canceled:
// Activate the free plan in your app's user/org record
```

---

## 11. Billing portal and transaction history

```tsx
import { BillingPortal, BillingHistory } from "@mmailaender/convex-creem/react";

<BillingPortal api={billing.api} />
<BillingHistory api={billing.api} />
```

---

## 12. Billing snapshot (advanced)

For apps with multiple subscriptions (base + add-ons):

```ts
import { resolveBillingSnapshot } from "@mmailaender/convex-creem/react";

const snapshot = resolveBillingSnapshot({
  entityId: "user_123",
  catalog,
  subscriptions: [...],
  orders: [...],
});

// snapshot.subscriptions → typed subscription rows with planId, productId, status
// snapshot.orders → typed order rows
// snapshot.paymentRecoveryState → "none" | "warning" | "blocked"
```

---

## Architecture overview

```
@mmailaender/convex-creem
├── /react       — React components, hooks, typed binding
├── /svelte      — Svelte components, context helpers, typed binding
├── /core        — Framework-agnostic types, selectors, resolver
└── /client      — Convex backend integration (Creem class)
```

All React and Svelte components are shipped via the single npm package. Import
from `@mmailaender/convex-creem/react` or `@mmailaender/convex-creem/svelte`.
