import type { PropsWithChildren } from "react";
import { useSubscriptionItem } from "./subscriptionItemContext.js";

/**
 * Renders the plan title from item context.
 * Must be used inside a `<Subscription.Item>` with children (styled composition mode).
 */
export const SubscriptionItemTitle = ({
  className = "",
}: {
  className?: string;
}) => {
  const { plan } = useSubscriptionItem();
  return <h3 className={`font-semibold ${className}`}>{plan.title}</h3>;
};

/**
 * Renders the plan price from item context.
 * Must be used inside a `<Subscription.Item>` with children (styled composition mode).
 */
export const SubscriptionItemPrice = ({
  className = "",
}: {
  className?: string;
}) => {
  const { price } = useSubscriptionItem();
  if (!price) return null;
  return <p className={`text-2xl font-bold ${className}`}>{price}</p>;
};

/**
 * Renders the plan description from item context.
 * Must be used inside a `<Subscription.Item>` with children (styled composition mode).
 */
export const SubscriptionItemDescription = ({
  className = "",
}: {
  className?: string;
}) => {
  const { plan } = useSubscriptionItem();
  if (!plan.description) return null;
  return (
    <p className={`text-sm text-zinc-500 dark:text-zinc-400 ${className}`}>
      {plan.description}
    </p>
  );
};

/**
 * Renders the plan CTA button from item context.
 * Shows different labels/states based on whether the plan is active, available for checkout, or switchable.
 * Must be used inside a `<Subscription.Item>` with children (styled composition mode).
 */
export const SubscriptionItemCTA = ({
  className = "",
  activeLabel = "Current plan",
  checkoutLabel = "Get started",
  switchLabel = "Switch plan",
}: {
  className?: string;
  activeLabel?: string;
  checkoutLabel?: string;
  switchLabel?: string;
}) => {
  const { isActive, onCheckout, onSwitch } = useSubscriptionItem();

  if (isActive) {
    return (
      <button
        type="button"
        className={`w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 ${className}`}
        disabled
      >
        {activeLabel}
      </button>
    );
  }

  if (onSwitch) {
    return (
      <button
        type="button"
        className={`button-filled w-full ${className}`}
        onClick={onSwitch}
      >
        {switchLabel}
      </button>
    );
  }

  if (onCheckout) {
    return (
      <button
        type="button"
        className={`button-filled w-full ${className}`}
        onClick={onCheckout}
      >
        {checkoutLabel}
      </button>
    );
  }

  return null;
};

/**
 * Renders a badge on a plan card (e.g. "Popular", "Recommended", "Best for teams").
 * Must be used inside a `<Subscription.Item>` with children (styled composition mode).
 */
export const SubscriptionItemBadge = ({
  label,
  className = "",
  children,
}: PropsWithChildren<{
  label?: string;
  className?: string;
}>) => {
  const { isRecommended, isActive } = useSubscriptionItem();
  const text =
    label ?? (isActive ? "Current" : isRecommended ? "Recommended" : null);
  if (!text && !children) return null;
  return (
    <span
      className={`inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 ${className}`}
    >
      {children ?? text}
    </span>
  );
};
