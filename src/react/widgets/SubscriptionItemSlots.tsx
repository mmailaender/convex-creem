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
  const { plan, unstyled } = useSubscriptionItem();
  return (
    <h3
      className={unstyled ? className : `creem-base:font-semibold ${className}`}
    >
      {plan.title}
    </h3>
  );
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
  const { price, unstyled } = useSubscriptionItem();
  if (!price) return null;
  return (
    <p
      className={
        unstyled
          ? className
          : `creem-base:text-2xl creem-base:font-bold ${className}`
      }
    >
      {price}
    </p>
  );
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
  const { plan, unstyled } = useSubscriptionItem();
  if (!plan.description) return null;
  return (
    <p
      className={
        unstyled
          ? className
          : `creem-base:text-sm creem-base:text-zinc-500 dark:creem-base:text-zinc-400 ${className}`
      }
    >
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
  const { isActive, onCheckout, onSwitch, unstyled } = useSubscriptionItem();
  const activeClassName = unstyled
    ? className
    : `creem-base:w-full creem-base:rounded-lg creem-base:bg-zinc-100 creem-base:px-4 creem-base:py-2 creem-base:text-sm creem-base:font-medium creem-base:text-zinc-500 dark:creem-base:bg-zinc-800 dark:creem-base:text-zinc-400 ${className}`;
  const actionClassName = unstyled
    ? className
    : `creem-base:button-filled creem-base:w-full ${className}`;

  if (isActive) {
    return (
      <button type="button" className={activeClassName} disabled>
        {activeLabel}
      </button>
    );
  }

  if (onSwitch) {
    return (
      <button type="button" className={actionClassName} onClick={onSwitch}>
        {switchLabel}
      </button>
    );
  }

  if (onCheckout) {
    return (
      <button type="button" className={actionClassName} onClick={onCheckout}>
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
  const { isRecommended, isActive, unstyled } = useSubscriptionItem();
  const text =
    label ?? (isActive ? "Current" : isRecommended ? "Recommended" : null);
  if (!text && !children) return null;
  return (
    <span
      className={
        unstyled
          ? className
          : `creem-base:inline-block creem-base:rounded-full creem-base:bg-blue-100 creem-base:px-2.5 creem-base:py-0.5 creem-base:text-xs creem-base:font-medium creem-base:text-blue-800 dark:creem-base:bg-blue-900/30 dark:creem-base:text-blue-300 ${className}`
      }
    >
      {children ?? text}
    </span>
  );
};
