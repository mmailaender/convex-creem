import { useMemo } from "react";
import type {
  BillingSnapshot,
  PaymentRecoveryState,
  SubscriptionSnapshot,
} from "../../core/types.js";
import { derivePaymentRecoveryState } from "../../core/selectors.js";
import {
  defaultBillingLabels,
  type BillingLabels,
} from "../../core/i18n.js";

/**
 * Subscription-focused payment recovery banner.
 *
 * Reads the billing snapshot or raw subscriptions to derive a recovery state and
 * displays an appropriate warning or blocked message. The app decides whether to
 * block the whole UI — this component only shows the banner.
 *
 * @example
 * ```tsx
 * <PaymentRecoveryBanner snapshot={billingSnapshot} />
 * ```
 */
export const PaymentRecoveryBanner = ({
  snapshot,
  subscriptions,
  recoveryState: externalState,
  className = "",
  labels = defaultBillingLabels,
}: {
  snapshot?: BillingSnapshot | null;
  subscriptions?: SubscriptionSnapshot | SubscriptionSnapshot[] | null;
  recoveryState?: PaymentRecoveryState;
  className?: string;
  labels?: BillingLabels;
}) => {
  const state = useMemo<PaymentRecoveryState>(() => {
    if (externalState) return externalState;
    if (subscriptions !== undefined) {
      return derivePaymentRecoveryState(subscriptions);
    }
    if (snapshot?.subscriptionState) {
      return derivePaymentRecoveryState({
        status: snapshot.subscriptionState,
      });
    }
    return "none";
  }, [externalState, subscriptions, snapshot?.subscriptionState]);

  if (state === "none") return null;

  const isBlocked = state === "blocked";

  return (
    <div
      role="alert"
      className={`body-m radius-m border px-4 py-3 ${
        isBlocked
          ? "border-error-border-subtle bg-error-surface-subtle text-error-foreground-default"
          : "border-warning-border-subtle bg-warning-surface-subtle text-warning-foreground-default"
      } ${className}`}
    >
      {isBlocked ? labels.paymentRecovery.blocked : labels.paymentRecovery.warning}
    </div>
  );
};
