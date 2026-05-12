import { useContext, type PropsWithChildren } from "react";
import { SubscriptionContext } from "./subscriptionContext.js";

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
}: PropsWithChildren<{ className?: string; class?: string }>) => {
  const rootContext = useContext(SubscriptionContext);
  const resolvedClassName = rootContext?.unstyled
    ? className
    : `creem-base:grid creem-base:grid-cols-1 creem-base:gap-4 sm:creem-base:grid-cols-2 lg:creem-base:grid-cols-3 ${className}`;

  return <div className={resolvedClassName}>{children}</div>;
};
