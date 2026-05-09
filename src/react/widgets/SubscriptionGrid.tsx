import type { PropsWithChildren } from "react";

/**
 * Default responsive card layout for subscription plans.
 *
 * Wraps children in a responsive grid that adapts from 1 to 3 columns.
 *
 * @example
 * ```tsx
 * <Subscription.Grid>
 *   <Subscription.Item planId="basic" />
 *   <Subscription.Item planId="pro" />
 * </Subscription.Grid>
 * ```
 */
export const SubscriptionGrid = ({
  className = "",
  children,
}: PropsWithChildren<{ className?: string; class?: string }>) => (
  <div
    className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
  >
    {children}
  </div>
);
