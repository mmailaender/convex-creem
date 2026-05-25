import { useContext } from "react";
import { SegmentGroup } from "../primitives/SegmentGroup.js";
import type {
  RecurringCycle,
  SupportedRecurringCycle,
} from "../../core/types.js";
import { SubscriptionContext } from "./subscriptionContext.js";

/**
 * Renders the billing interval selector control.
 *
 * Automatically hides when only one interval is available for the active group.
 * Typically placed inside `Subscription.Root` with `intervalSelector="external"`.
 *
 * @example
 * ```tsx
 * <Subscription.Root intervalSelector="external">
 *   <Subscription.IntervalSelector className="interval-control" />
 * </Subscription.Root>
 * ```
 */
export const SubscriptionIntervalSelector = ({
  cycles,
  value,
  onValueChange,
  cycleBadges,
  className = "",
}: {
  cycles?: RecurringCycle[];
  value?: RecurringCycle;
  onValueChange?: (cycle: RecurringCycle) => void;
  cycleBadges?: Partial<Record<SupportedRecurringCycle, string>>;
  className?: string;
}) => {
  const rootContext = useContext(SubscriptionContext);
  const resolvedCycles = cycles ?? rootContext?.availableCycles ?? [];
  const requestedValue =
    value ?? rootContext?.selectedCycle ?? resolvedCycles[0];
  const resolvedValue =
    requestedValue && resolvedCycles.includes(requestedValue)
      ? requestedValue
      : resolvedCycles[0];
  const handleValueChange = onValueChange ?? rootContext?.setCycle;
  const unstyled = rootContext?.unstyled ?? false;
  const labels = rootContext?.labels;
  const resolvedCycleBadges = cycleBadges ?? rootContext?.cycleBadges;

  if (resolvedCycles.length <= 1 || !resolvedValue || !handleValueChange) {
    return null;
  }

  const items = resolvedCycles.map((cycle) => ({
    value: cycle,
    label: labels?.billingCycle[cycle] ?? cycle,
    badge: cycle === "custom" ? undefined : resolvedCycleBadges?.[cycle],
  }));

  return (
    <div
      className={
        unstyled
          ? className
          : `creem-base:flex creem-base:justify-center ${className}`
      }
    >
      <SegmentGroup
        items={items}
        value={resolvedValue}
        unstyled={unstyled}
        onValueChange={(v) => handleValueChange(v as RecurringCycle)}
      />
    </div>
  );
};
