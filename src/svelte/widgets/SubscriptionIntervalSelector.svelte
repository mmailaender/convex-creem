<script lang="ts">
  import { getContext } from "svelte";
  import SegmentGroup from "../primitives/SegmentGroup.svelte";
  import type { RecurringCycle } from "../../core/types.js";
  import {
    SUBSCRIPTION_CONTEXT_KEY,
    type SubscriptionContextValue,
  } from "./subscriptionContext.js";

  const CYCLE_LABELS: Record<string, string> = {
    "every-month": "Monthly",
    "every-three-months": "Quarterly",
    "every-six-months": "Semi-annual",
    "every-year": "Yearly",
  };

  interface Props {
    cycles?: RecurringCycle[];
    value?: RecurringCycle;
    onValueChange?: (cycle: RecurringCycle) => void;
    class?: string;
  }

  let {
    cycles,
    value,
    onValueChange,
    class: className = "",
  }: Props = $props();
  const rootContext = getContext<SubscriptionContextValue | undefined>(
    SUBSCRIPTION_CONTEXT_KEY,
  );
  const resolvedCycles = $derived(cycles ?? rootContext?.availableCycles() ?? []);
  const requestedValue = $derived(
    value ?? rootContext?.getSelectedCycle() ?? resolvedCycles[0],
  );
  const resolvedValue = $derived(
    requestedValue && resolvedCycles.includes(requestedValue)
      ? requestedValue
      : resolvedCycles[0],
  );
  const unstyled = $derived(rootContext?.getUnstyled() ?? false);
  const resolvedClass = $derived(
    unstyled ? className : `creem-base:flex creem-base:justify-center ${className}`,
  );

  const items = $derived(
    resolvedCycles.map((cycle) => ({
      value: cycle,
      label: CYCLE_LABELS[cycle] ?? cycle,
    })),
  );
  const handleValueChange = (next: string) => {
    const cycle = next as RecurringCycle;
    if (onValueChange) {
      onValueChange(cycle);
      return;
    }
    rootContext?.setCycle(cycle);
  };
</script>

{#if resolvedCycles.length > 1 && resolvedValue}
  <div class={resolvedClass}>
    <SegmentGroup
      {items}
      value={resolvedValue}
      {unstyled}
      onValueChange={handleValueChange}
    />
  </div>
{/if}
