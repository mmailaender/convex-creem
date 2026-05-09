<script lang="ts">
  import { getContext } from "svelte";
  import SegmentGroup from "../primitives/SegmentGroup.svelte";
  import {
    SUBSCRIPTION_CONTEXT_KEY,
    type SubscriptionContextValue,
  } from "./subscriptionContext.js";

  interface Props {
    items?: Array<{ value: string; label: string }>;
    value?: string | null;
    onValueChange?: (value: string) => void;
    class?: string;
  }

  let {
    items,
    value,
    onValueChange,
    class: className = "",
  }: Props = $props();
  const rootContext = getContext<SubscriptionContextValue | undefined>(
    SUBSCRIPTION_CONTEXT_KEY,
  );
  const resolvedItems = $derived(items ?? rootContext?.groupItems() ?? []);
  const resolvedValue = $derived(value ?? rootContext?.activeGroupId() ?? null);
  const handleValueChange = (next: string) => {
    if (onValueChange) {
      onValueChange(next);
      return;
    }
    rootContext?.setGroup(next);
  };
</script>

{#if resolvedItems.length > 1}
  <div class={`flex justify-center ${className}`}>
    <SegmentGroup
      items={resolvedItems}
      value={resolvedValue}
      onValueChange={handleValueChange}
    />
  </div>
{/if}
