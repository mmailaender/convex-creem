import type { RecurringCycle } from "../../core/types.js";
import { defaultBillingLabels, type BillingLabels } from "../../core/i18n.js";
import { formatRecurringCycle } from "../shared.js";
import { SegmentGroup } from "./SegmentGroup.js";

export const BillingToggle = ({
  cycles = [],
  value,
  onValueChange,
  className = "",
  labels = defaultBillingLabels,
}: {
  cycles?: RecurringCycle[];
  value?: RecurringCycle;
  onValueChange?: (cycle: RecurringCycle) => void;
  className?: string;
  labels?: BillingLabels;
}) => {
  if (cycles.length < 2) return null;

  return (
    <SegmentGroup
      items={cycles.map((cycle) => ({
        value: cycle,
        label: formatRecurringCycle(cycle, labels),
      }))}
      value={value}
      onValueChange={(segment) => onValueChange?.(segment as RecurringCycle)}
      className={className}
    />
  );
};
