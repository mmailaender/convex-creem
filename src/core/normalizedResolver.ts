import {
  findPlanByProductId,
  normalizePlanCatalog,
  normalizeRecurringCycle,
} from "./catalog.js";
import { derivePaymentRecoveryState } from "./selectors.js";
import type {
  AvailableAction,
  BillingSnapshotOrder,
  BillingSnapshotSubscription,
  NormalizedBillingSnapshot,
  PlanCatalog,
  PaymentRecoveryState,
  SubscriptionSnapshot,
} from "./types.js";

/** Input for `resolveNormalizedSnapshot`. */
export type NormalizedResolverInput = {
  /** Billing entity ID. */
  entityId: string;
  /** Plan catalog for plan-aware resolution. */
  catalog?: PlanCatalog;
  /** All subscriptions for the entity (active, ended, etc.). */
  subscriptions?: SubscriptionSnapshot[];
  /** One-time orders with basic metadata. */
  orders?: Array<{
    orderId: string;
    productId: string;
    status: string;
  }>;
  /** Override for the current timestamp (ISO string). */
  now?: string;
};

const ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "scheduled_cancel",
]);

/**
 * Resolve a `NormalizedBillingSnapshot` from subscriptions, orders, and catalog.
 *
 * Unlike `resolveBillingSnapshot`, this produces an array-based snapshot that supports
 * multiple simultaneous subscriptions (base + add-ons) and one-time orders as first-class
 * citizens, with payment recovery state derived from all subscription statuses.
 */
export const resolveNormalizedSnapshot = (
  input: NormalizedResolverInput,
): NormalizedBillingSnapshot => {
  const catalog = normalizePlanCatalog(input.catalog);
  const now = input.now ?? new Date().toISOString();

  // Map raw subscriptions to normalized rows
  const subscriptions: BillingSnapshotSubscription[] = (
    input.subscriptions ?? []
  ).map((sub) => {
    const plan = findPlanByProductId(catalog, sub.productId);
    return {
      planId: plan?.planId ?? null,
      productId: sub.productId ?? "",
      subscriptionId: sub.id ?? "",
      status: sub.status ?? "unknown",
      recurringCycle: normalizeRecurringCycle(sub.recurringInterval) ?? null,
      kind: plan?.metadata?.kind as string | undefined,
      units: sub.units,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEnd: sub.trialEnd,
    };
  });

  // Map raw orders to normalized rows
  const orders: BillingSnapshotOrder[] = (input.orders ?? []).map((order) => {
    const plan = findPlanByProductId(catalog, order.productId);
    return {
      planId: plan?.planId ?? null,
      orderId: order.orderId,
      productId: order.productId,
      status: order.status,
    };
  });

  // Derive payment recovery from all subscriptions
  const paymentRecoveryState: PaymentRecoveryState =
    derivePaymentRecoveryState(subscriptions);

  // Build available actions from active subscriptions
  const actions = buildNormalizedActions(subscriptions, orders);

  return {
    entityId: input.entityId,
    catalogVersion: catalog?.version,
    subscriptions,
    orders,
    paymentRecoveryState,
    availableBillingActions: actions,
    resolvedAt: now,
  };
};

const buildNormalizedActions = (
  subscriptions: BillingSnapshotSubscription[],
  orders: BillingSnapshotOrder[],
): AvailableAction[] => {
  const actions = new Set<AvailableAction>();
  const activeSubs = subscriptions.filter((s) => ACTIVE_STATUSES.has(s.status));
  const hasReactivatable = subscriptions.some(
    (s) => s.status === "canceled" || s.status === "scheduled_cancel",
  );

  if (activeSubs.length === 0 && !hasReactivatable && orders.length === 0) {
    actions.add("checkout");
    return Array.from(actions);
  }

  if (activeSubs.length > 0) {
    actions.add("portal");
    actions.add("cancel");
  }

  if (hasReactivatable) {
    actions.add("reactivate");
    // No active subs means the user can also start fresh
    if (activeSubs.length === 0) {
      actions.add("checkout");
    }
  }

  // One-time orders can always add more
  if (orders.length > 0) {
    actions.add("checkout");
  }

  return Array.from(actions);
};
