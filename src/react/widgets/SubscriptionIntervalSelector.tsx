import { useContext } from "react";
import { SegmentGroup } from "../primitives/SegmentGroup.js";
import type { RecurringCycle } from "../../core/types.js";
import { SubscriptionContext } from "./subscriptionContext.js";

const CYCLE_LABELS: Record<string, string> = {
  "every-month": "Monthly",
  "every-three-months": "Quarterly",
  "every-six-months": "Semi-annual",
  "every-year": "Yearly",
};

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
  className = "",
}: {
  cycles?: RecurringCycle[];
  value?: RecurringCycle;
  onValueChange?: (cycle: RecurringCycle) => void;
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

  if (resolvedCycles.length <= 1 || !resolvedValue || !handleValueChange) {
    return null;
  }

  const items = resolvedCycles.map((cycle) => ({
    value: cycle,
    label: CYCLE_LABELS[cycle] ?? cycle,
  }));

  return (
    <div className={`flex justify-center ${className}`}>
      <SegmentGroup
        items={items}
        value={resolvedValue}
        onValueChange={(v) => handleValueChange(v as RecurringCycle)}
      />
    </div>
  );
};
