<script lang="ts">
  /* global $props */
  import type { RecurringCycle } from "../../core/types.js";
  import {
    defaultBillingLabels,
    type BillingLabels,
  } from "../../core/i18n.js";
  import { formatRecurringCycle } from "./shared.js";
  import SegmentGroup from "./SegmentGroup.svelte";

  interface Props {
    cycles?: RecurringCycle[];
    value?: RecurringCycle;
    onValueChange?: (cycle: RecurringCycle) => void;
    className?: string;
    labels?: BillingLabels;
  }

  let {
    cycles = [],
    value,
    onValueChange,
    className = "",
    labels = defaultBillingLabels,
  }: Props = $props();
</script>

{#if cycles.length > 1}
  <SegmentGroup
    items={cycles.map((cycle) => ({
      value: cycle,
      label: formatRecurringCycle(cycle, labels),
    }))}
    value={value}
    onValueChange={(segment) => onValueChange?.(segment as RecurringCycle)}
    className={className}
  />
{/if}
