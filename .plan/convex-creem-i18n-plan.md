# convex-creem i18n and UI Label Customization Plan

## Why This Exists

The composition API lets apps replace most pricing-card content with their own
localized markup, especially through slots such as `Subscription.ItemTitle`,
`Subscription.ItemDescription`, `Subscription.ItemPrice`,
`Subscription.ItemCTA`, `Subscription.UnitPicker`, and `Subscription.Cancel`.

That is enough for app-owned detailed cards, but it is not enough for full i18n.
Several strings still belong to the widget/runtime layer:

- Loading, error, confirmation, and recovery messages.
- Subscription update and cancellation dialog copy.
- Billing history headings, empty states, pagination labels, and table headers.
- Button labels in default cards and shortcut widgets.
- Status labels such as current plan, recommended, free trial, scheduled
  cancellation, payment recovery, and one-time payment states.
- Accessibility labels for controls such as steppers, close buttons, and
  refresh buttons.
- Dynamic labels such as trial days left, unit counts, price calculations, and
  period-end dates.

This plan covers runtime UI strings. Creem-native localized product names and
descriptions are tracked separately as a platform request in the billing
composition plan.

## Recommendation

Ship first-class label overrides in the base package before shipping automatic
translations.

The base package should include:

- Complete English defaults.
- A typed override API for all user-facing UI strings.
- Dynamic label functions for strings that depend on values.
- Locale-aware date and currency formatting hooks.
- React and Svelte parity.

Automatic built-in translations should be a follow-up, not the first step.
Maintaining translated copy is product work, not only engineering work. If we
add translations before the label surface is stable, every later copy change
becomes a translation maintenance problem.

The best path is:

1. Make every label replaceable.
2. Document custom app i18n with a German example.
3. Stabilize the label contract.
4. Optionally add locale packs later, for example
   `convex-creem/locales/de`, `convex-creem/locales/fr`, or app-provided
   dictionaries.

## API Shape

Add a shared i18n contract in core:

```ts
export interface BillingI18n {
  locale?: string;
  labels?: PartialDeep<BillingLabels>;
  formatCurrency?: (input: BillingCurrencyFormatInput) => string;
  formatDate?: (input: BillingDateFormatInput) => string;
}
```

Provider-level usage:

```tsx
<CreemConvexProvider api={api} catalog={catalog} i18n={billingI18n}>
  {children}
</CreemConvexProvider>
```

Root-level overrides should also be supported for local customization:

```tsx
<Subscription.Root api={api} catalog={catalog} labels={subscriptionLabels}>
  ...
</Subscription.Root>
```

Svelte should mirror the same concept with framework-native prop names.

## Label Contract

Create a `BillingLabels` type with nested namespaces:

- `common`
- `subscription`
- `subscription.card`
- `subscription.dialog`
- `subscription.unitPicker`
- `subscription.cancel`
- `subscription.recovery`
- `product`
- `billingHistory`
- `credits`
- `checkout`
- `portal`
- `oneTimePayment`
- `accessibility`
- `errors`

Use plain strings for static labels:

```ts
currentPlan: string;
recommended: string;
subscribe: string;
cancel: string;
confirm: string;
```

Use functions for dynamic labels:

```ts
trialDaysLeft: (days: number) => string;
unitCount: (units: number) => string;
unitPriceCalculation: (input: {
  unitPrice: string;
  units: number;
  total: string;
}) => string;
switchPlanTitle: (input: {
  fromPlan: string;
  toPlan: string;
}) => string;
```

Dynamic labels should receive already-formatted money and date strings where
possible, so apps can decide grammar without duplicating currency math.

## Coverage Targets

Move user-facing strings out of these areas and into default labels:

- React and Svelte `PricingCard`.
- React and Svelte `SubscriptionRoot`.
- Subscription update summary generation.
- `BillingHistory`.
- `PaymentRecoveryBanner` and recovery actions.
- `ScheduledChangeBanner`.
- `TrialLimitBanner`.
- `CheckoutSuccessSummary`.
- `CustomerPortalButton`.
- `Credits` widgets.
- `Product` widgets.
- `OneTimePaymentStatusBadge`.
- Number input and stepper accessibility labels.

Composition slots should remain the preferred escape hatch for rich custom
markup. The label API is for default/shortcut components and root-owned flows.

## Product Names and Descriptions

Do not treat merchant-owned product names and descriptions as widget labels.

For now:

- Apps can localize product names/descriptions in their catalog or replace them
  through composition slots.
- Drop-in widgets can only display the product text available in the catalog or
  billing model.

Future platform support should allow Creem products to expose localized
`name` and `description` values through the API, SDK, dashboard, CLI, and
webhooks.

## Built-In Translation Packs

Built-in translation packs are useful, but they should be optional:

- They should not block custom app i18n.
- They should not force automatic locale detection.
- They should not increase the core bundle for apps that do not use them.

Possible future API:

```ts
import { de } from "convex-creem/locales/de";

<CreemConvexProvider i18n={{ locale: "de-DE", labels: de }}>
  {children}
</CreemConvexProvider>
```

Automatic locale detection can be opt-in:

```ts
<CreemConvexProvider i18n={{ locale: browserLocale, labels: de }}>
  {children}
</CreemConvexProvider>
```

## Documentation

Document three paths:

- Composition i18n: use slots and app-owned copy for fully custom cards.
- Label override i18n: pass labels for default widgets and dialogs.
- Future Creem-native product i18n: use localized product name/description when
  the platform exposes it.

Include examples for:

- German label overrides.
- Pluralized unit labels.
- Custom switch-plan dialog copy that includes unit counts and totals.
- Date and currency formatting using `Intl`.

## Tests

- Add React tests that override representative labels in default cards,
  dialogs, billing history, credits, and payment recovery.
- Add Svelte tests for the same label paths.
- Add type tests that catch missing label parity between React and Svelte.
- Add a source-level guard that user-facing English strings only live in the
  default English labels file, docs, examples, and tests.
- Add tests for dynamic label functions, including plural unit labels and
  formatted price calculations.

## Checklist

- [x] Define shared `BillingI18n` and `BillingLabels` core types.
- [x] Add default English labels in one shared module.
- [x] Add provider-level i18n/label overrides.
- [x] Add root-level label overrides for local widget customization.
- [x] Move subscription card labels into the shared label contract.
- [x] Move subscription dialog, loading, error, and recovery labels into the
      shared label contract.
- [x] Move subscription update summary copy into dynamic label functions.
- [x] Move billing history labels into the shared label contract.
- [x] Move product, portal, checkout success, credits, and one-time payment
      labels into the shared label contract.
- [x] Move accessibility labels into the shared label contract.
- [x] Add locale-aware default date and currency formatting helpers.
- [x] Document composition-slot i18n.
- [x] Document label override i18n.
- [x] Add a German override example.
- [ ] Decide whether optional locale packs belong in this package or separate
      packages after the label API stabilizes.
