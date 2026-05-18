/** Category of a billing plan. Determines default UI behavior and available actions. */
export type PlanCategory = "free" | "trial" | "paid" | "enterprise" | "custom";

/** Billing model type. `"recurring"` for subscriptions, `"onetime"` for single purchases. */
export type BillingType = "recurring" | "onetime" | "custom";

/** Billing cycles supported by the Creem API. */
export type SupportedRecurringCycle =
  | "every-month"
  | "every-three-months"
  | "every-six-months"
  | "every-year";

/** Billing cycle including a `"custom"` fallback for unrecognized intervals. */
export type RecurringCycle = SupportedRecurringCycle | "custom";

/** Status of a one-time payment order. */
export type OneTimePaymentStatus =
  | "pending"
  | "paid"
  | "refunded"
  | "partially_refunded";

/**
 * Actions the current billing entity is allowed to perform.
 * Resolved by `resolveBillingSnapshot` based on subscription state.
 * Use with `<BillingGate requiredActions="...">` for conditional UI rendering.
 */
export type AvailableAction =
  | "checkout"
  | "portal"
  | "cancel"
  | "reactivate"
  | "switch_interval"
  | "update_units"
  | "contact_sales";

/**
 * Payment recovery state derived from subscription status.
 * - `"none"` — all subscriptions healthy
 * - `"warning"` — a subscription is past due but still active
 * - `"blocked"` — a subscription is unpaid or expired
 */
export type PaymentRecoveryState = "none" | "warning" | "blocked";

export type CatalogProductRef =
  | string
  | {
      productId: string;
      productSlug?: string;
    };

export type CreditGrantRefundBehavior =
  | "revoke_on_full_refund"
  | "prorate"
  | "debit"
  | "none";

/** App-side Customer Credits grant fulfilled after successful Creem commerce events. */
export type CreditGrant = {
  /** Amount of credits to grant. String to preserve large integer values. */
  amount: string;
  /** Creem Customer Credits account name. Defaults to `"credits"`. */
  accountName?: string;
  /** Unit label to use if the account must be created. Defaults to `"credits"`. */
  unitLabel?: string;
  /**
   * Refund behavior for the grant.
   * - `"revoke_on_full_refund"` deducts the full grant only when a refund covers the full order amount. This is the default.
   * - `"prorate"` deducts a proportional amount for partial refunds and the full grant for full refunds.
   * - `"debit"` deducts the full grant whenever a refund succeeds.
   * - `"none"` leaves credits untouched.
   */
  refundBehavior?: CreditGrantRefundBehavior;
};

/** A single plan definition in the billing catalog. */
export type PlanCatalogEntry = {
  /** Unique plan identifier (e.g. `"basic"`, `"premium"`). */
  planId: string;
  /** Plan category — drives default UI behavior and action resolution. */
  category: PlanCategory;
  /** Billing model. Defaults to `"recurring"` if omitted. */
  billingType?: BillingType;
  /** Supported billing cycles for this plan (e.g. `["every-month", "every-year"]`). */
  billingCycles?: RecurringCycle[];
  /** Optional app-facing pricing audience or product-line group (e.g. `"individual"`, `"teams"`). */
  groupId?: string;
  /** Optional display label for `groupId`. */
  groupTitle?: string;
  /** Optional app-authored plan title. Creem product name is used when omitted. */
  title?: string;
  /** Optional app-authored plan description. Creem product description is used when omitted. */
  description?: string;
  /** Pricing model — `"unit"` enables quantity/unit controls in widgets. */
  pricingModel?: "flat" | "unit";
  /** Preferred recurring product map for catalog-backed widgets. */
  products?: Readonly<Record<string, CatalogProductRef>>;
  /** Map of billing cycle → Creem product ID (e.g. `{ "every-month": "prod_xxx" }`). */
  creemProductIds?: Readonly<Record<string, string>>;
  /** "Contact sales" URL for enterprise plans. */
  contactUrl?: string;
  /** Highlight this plan as recommended in the UI. */
  recommended?: boolean;
  /** Plan-specific usage limits. Keys are app-defined limit names, values are numeric caps. Used by `evaluateUsageLimits`. */
  limits?: Readonly<Record<string, number>>;
  /** Optional app-side Customer Credits grant fulfilled from webhook events for this product. */
  creditGrant?: CreditGrant;
  /** Arbitrary metadata for custom logic. */
  metadata?: Readonly<Record<string, unknown>>;
};

/** Plan catalog entry enriched with resolved UI display fields from Creem product data. */
export type UIPlanEntry = PlanCatalogEntry & {
  /** Display title (auto-resolved from Creem product name if omitted). */
  title?: string;
  /** Display description (auto-resolved from Creem product description, rendered as Markdown). */
  description?: string;
};

/** Static plan catalog configuration. Defines available plans and their Creem product mappings. */
export type PlanCatalog = {
  /** Catalog version string (included in `BillingSnapshot.catalogVersion`). */
  version: string;
  /** Ordered list of plan definitions. */
  plans: readonly PlanCatalogEntry[];
  /** Plan ID to use when no subscription is active (e.g. `"free"`). */
  defaultPlanId?: string;
};

export type PlanId<TCatalog extends { plans: readonly { planId: string }[] }> =
  TCatalog["plans"][number]["planId"];

/** Lightweight subscription state used by the billing resolver. */
export type SubscriptionSnapshot = {
  /** Creem subscription ID. */
  id?: string;
  /** Creem product ID of the subscribed plan. */
  productId?: string;
  /** Subscription status (e.g. `"active"`, `"trialing"`, `"canceled"`, `"paused"`, `"scheduled_cancel"`). */
  status?: string;
  /** Billing interval (e.g. `"every-month"`, `"every-year"`). */
  recurringInterval?: string | null;
  /** Number of units. A unit may represent a seat, credit pack quantity, or another billable unit. */
  units?: number | null;
  /** Whether the subscription is set to cancel at the end of the current period. */
  cancelAtPeriodEnd?: boolean;
  /** ISO timestamp of the current period end. */
  currentPeriodEnd?: string | null;
  /** ISO timestamp when the trial expires. */
  trialEnd?: string | null;
};

/** Snapshot of a one-time payment, parsed from checkout success query params. */
export type PaymentSnapshot = {
  /** Payment status. */
  status: OneTimePaymentStatus;
  /** Creem checkout ID. */
  checkoutId?: string;
  /** Creem order ID. */
  orderId?: string;
  /** Creem customer ID. */
  customerId?: string;
  /** Creem product ID. */
  productId?: string;
  /** Your custom request ID (passed via checkout metadata). */
  requestId?: string;
};

/** Query parameters from a Creem checkout success redirect URL. Parsed by `parseCheckoutSuccessParams`. */
export type CheckoutSuccessParams = {
  /** Creem checkout session ID (`checkout_id` query param). */
  checkoutId?: string;
  /** Creem order ID (`order_id` query param). */
  orderId?: string;
  /** Creem customer ID (`customer_id` query param). */
  customerId?: string;
  /** Creem product ID (`product_id` query param). */
  productId?: string;
  /** Your custom request ID (`request_id` query param). */
  requestId?: string;
  /** Creem signature for verification (`signature` query param). */
  signature?: string;
};

/**
 * Intent object passed to `onBeforeCheckout` and stored by `pendingCheckout`.
 * Represents the product and optional unit count the user wants to purchase.
 */
export type CheckoutIntent = {
  /** Creem product ID to purchase. */
  productId: string;
  /** Number of units for unit-based plans. A unit may represent a seat. */
  units?: number;
};

/**
 * How the Creem API handles plan switches and unit changes.
 * - `"proration-charge-immediately"` — prorate and charge the difference now
 * - `"proration-charge"` — prorate, charge on next invoice
 * - `"proration-none"` — no proration, change takes effect on next billing cycle
 * - `"period-end"` — keep current access until period end, then apply the update
 */
export type UpdateBehavior =
  | "proration-charge-immediately"
  | "proration-charge"
  | "proration-none"
  | "period-end";

export type UpdateBehaviorIntent = {
  kind: "plan-switch" | "unit-update";
  fromPlanId?: string | null;
  toPlanId?: string | null;
  fromPlan?: PlanCatalogEntry | null;
  toPlan?: PlanCatalogEntry | null;
  fromProductId?: string | null;
  toProductId?: string | null;
  fromPrice?: number | null;
  toPrice?: number | null;
  currentUnits?: number | null;
  targetUnits?: number;
};

export type UpdateBehaviorResolver = (
  intent: UpdateBehaviorIntent,
) => UpdateBehavior;

export type UpdateBehaviorSetting = UpdateBehavior | UpdateBehaviorResolver;

/** Get a human-readable description for a plan switch based on the proration behavior. */
export const getSwitchPlanDescription = (
  updateBehavior: UpdateBehavior,
  planTitle?: string,
): string => {
  const prefix = planTitle
    ? `You are about to switch to the ${planTitle} plan.`
    : "You are about to switch your plan.";

  switch (updateBehavior) {
    case "proration-charge-immediately":
      return `${prefix} The price difference will be prorated and charged immediately.`;
    case "proration-charge":
      return `${prefix} The price difference will be prorated and applied to your next invoice.`;
    case "proration-none":
      return `${prefix} The new price will take effect at your next billing cycle.`;
    case "period-end":
      return `${prefix} The current plan stays active until the end of the current billing period.`;
  }
};

/** App-side scheduled subscription update stored until the current period ends. */
export type ScheduledSubscriptionUpdate = {
  entityId: string;
  subscriptionId: string;
  targetProductId?: string;
  targetPlanId?: string;
  targetUnits?: number;
  effectiveAt: string;
  status: "pending" | "applying" | "applied" | "superseded" | "failed";
  scheduledFunctionId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

/** A single evaluated usage-limit check result. */
export type UsageLimitEntry = {
  /** Current usage count provided by the app. */
  used: number;
  /** Limit from the catalog plan's `limits` metadata, or `Infinity` when unlimited. */
  limit: number;
  /** Whether the usage has reached or exceeded the limit. */
  exceeded: boolean;
};

/** Result of `evaluateUsageLimits`. Keys match the limit keys defined in the catalog plan. */
export type UsageLimitResult = Record<string, UsageLimitEntry>;

// ── Billing snapshot types ──────────────────────────

/** A single subscription row in the billing snapshot. */
export type BillingSnapshotSubscription = {
  /** Stable plan ID from the catalog (if resolved). */
  planId: string | null;
  /** Creem product ID. */
  productId: string;
  /** Creem subscription ID. */
  subscriptionId: string;
  /** Subscription status (e.g. `"active"`, `"trialing"`, `"canceled"`). */
  status: string;
  /** Billing interval. */
  recurringCycle: RecurringCycle | null;
  /** Optional kind tag from the catalog (e.g. `"base"`, `"addon"`). */
  kind?: string;
  /** Current unit count for unit-based subscriptions. */
  units?: number | null;
  /** Whether the subscription is set to cancel at period end. */
  cancelAtPeriodEnd?: boolean;
  /** ISO timestamp of the current period end. */
  currentPeriodEnd?: string | null;
  /** ISO timestamp when the trial expires. */
  trialEnd?: string | null;
};

/** A single order row in the billing snapshot. */
export type BillingSnapshotOrder = {
  /** Stable plan ID from the catalog (if resolved). */
  planId: string | null;
  /** Creem order ID. */
  orderId: string;
  /** Creem product ID. */
  productId: string;
  /** Order status. */
  status: string;
};

/**
 * Billing snapshot with explicit subscription and order arrays.
 * This supports multiple subscriptions (base + add-ons) and one-time orders as
 * first-class citizens.
 */
export type BillingSnapshot = {
  /** Billing entity ID. */
  entityId: string;
  /** Version of the plan catalog used for resolution. */
  catalogVersion?: string;
  /** All active/relevant subscriptions. */
  subscriptions: BillingSnapshotSubscription[];
  /** All one-time orders. */
  orders: BillingSnapshotOrder[];
  /** Derived payment recovery state from subscription statuses. */
  paymentRecoveryState: PaymentRecoveryState;
  /** Actions the billing entity is allowed to perform. */
  availableBillingActions: AvailableAction[];
  /** ISO timestamp when this snapshot was resolved. */
  resolvedAt: string;
};

/**
 * Intent object passed to `onBeforePlanChange`.
 * Describes the plan change the user is about to make.
 */
export type PlanChangeIntent = {
  /** Plan ID the user is switching from, or `null` if no current plan. */
  fromPlanId: string | null;
  /** Plan ID the user is switching to. */
  toPlanId: string;
  /** Creem product ID of the target paid plan. Undefined for app-owned free plans. */
  productId?: string;
  /** Stable app plan ID of the target free plan. */
  freePlanId?: string;
  /** Number of units (for unit-based plans). */
  units?: number;
};
