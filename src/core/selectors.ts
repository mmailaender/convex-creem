import type {
  AvailableAction,
  BillingSnapshot,
  OneTimePaymentStatus,
  PaymentRecoveryState,
  SubscriptionSnapshot,
} from "./types.js";

const TERMINAL_PAYMENT_STATUSES = new Set<OneTimePaymentStatus>([
  "paid",
  "refunded",
  "partially_refunded",
]);

/** Check whether a specific action is available in the given billing snapshot. */
export const hasBillingAction = (
  snapshot: BillingSnapshot,
  action: AvailableAction,
) => snapshot.availableActions.includes(action);

/** Check whether the billing snapshot represents a one-time purchase (not a subscription). */
export const isOneTimeBilling = (snapshot: BillingSnapshot) =>
  snapshot.billingType === "onetime";

/** Check whether the billing snapshot represents an enterprise plan. */
export const isEnterpriseBilling = (snapshot: BillingSnapshot) =>
  snapshot.activeCategory === "enterprise";

/** Whether the billing cycle toggle (e.g. Monthly/Yearly) should be shown in the UI. */
export const shouldShowBillingCycleToggle = (snapshot: BillingSnapshot) =>
  snapshot.billingType === "recurring" &&
  snapshot.availableBillingCycles.length > 1 &&
  hasBillingAction(snapshot, "switch_interval");

/** Whether the payment status is terminal (paid, refunded, or partially refunded). */
export const isTerminalPaymentStatus = (status: OneTimePaymentStatus) =>
  TERMINAL_PAYMENT_STATUSES.has(status);

/**
 * Derive payment recovery state from one or more subscriptions.
 * - `"none"` — no payment issues
 * - `"warning"` — at least one subscription is `past_due`
 * - `"blocked"` — at least one subscription is `unpaid` or `expired`
 */
export const derivePaymentRecoveryState = (
  subscriptions:
    | SubscriptionSnapshot
    | SubscriptionSnapshot[]
    | null
    | undefined,
): PaymentRecoveryState => {
  if (!subscriptions) return "none";
  const list = Array.isArray(subscriptions) ? subscriptions : [subscriptions];
  if (list.length === 0) return "none";

  let hasWarning = false;
  for (const sub of list) {
    const status = sub.status;
    if (status === "unpaid" || status === "expired") {
      return "blocked";
    }
    if (status === "past_due") {
      hasWarning = true;
    }
  }
  return hasWarning ? "warning" : "none";
};

/**
 * Extract owned product IDs from paid orders.
 * Accepts the `ownedProductIds` array from `ConnectedBillingModel` or
 * an array of order-like objects with a `productId` and `status` field.
 */
export const selectOwnedProductIds = (
  orders:
    | string[]
    | Array<{ productId?: string; status?: string }>
    | null
    | undefined,
): string[] => {
  if (!orders || orders.length === 0) return [];
  if (typeof orders[0] === "string") {
    return orders as string[];
  }
  return (orders as Array<{ productId?: string; status?: string }>)
    .filter((o) => o.productId && o.status === "paid")
    .map((o) => o.productId!);
};

/**
 * Resolve the plan ID of the primary/base subscription from a list of subscriptions.
 * Returns the `planId` of the first subscription with an active-like status, or `null`.
 *
 * Requires a plan lookup function (e.g. `findPlanByProductId` bound to a catalog).
 */
export const resolveBasePlanId = (
  subscriptions:
    | Array<{ productId?: string; status?: string }>
    | null
    | undefined,
  findPlan: (productId: string) => { planId: string } | undefined,
): string | null => {
  if (!subscriptions || subscriptions.length === 0) return null;
  const ACTIVE_STATUSES = new Set([
    "active",
    "trialing",
    "past_due",
    "scheduled_cancel",
  ]);
  for (const sub of subscriptions) {
    if (sub.productId && sub.status && ACTIVE_STATUSES.has(sub.status)) {
      const plan = findPlan(sub.productId);
      if (plan) return plan.planId;
    }
  }
  return null;
};
