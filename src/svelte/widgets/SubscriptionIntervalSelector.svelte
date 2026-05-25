<script lang="ts">
  import { getContext } from "svelte";
  import SegmentGroup from "../primitives/SegmentGroup.svelte";
  import type { RecurringCycle, SupportedRecurringCycle } from "../../core/types.js";
  import {
    SUBSCRIPTION_CONTEXT_KEY,
    type SubscriptionContextValue,
  } from "./subscriptionContext.js";

  interface Props {
    /** Available billing cycles. Defaults to cycles available in the active root group. */
    cycles?: RecurringCycle[];
    /** Controlled selected cycle. Defaults to the root's selected cycle. */
    value?: RecurringCycle;
    /** Called when the user selects a cycle. Defaults to updating the root context. */
    onValueChange?: (cycle: RecurringCycle) => void;
    /** Optional badges shown next to billing interval labels. Defaults to root badges. */
    cycleBadges?: Partial<Record<SupportedRecurringCycle, string>>;
    /** Wrapper CSS class. */
    class?: string;
  }

  let {
    cycles,
    value,
    onValueChange,
    cycleBadges,
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
      label: rootContext?.getLabels().billingCycle[cycle] ?? cycle,
      badge:
        (cycle === "custom" ? undefined : cycleBadges?.[cycle]) ??
        (cycle === "custom" ? undefined : rootContext?.getCycleBadge(cycle)),
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
