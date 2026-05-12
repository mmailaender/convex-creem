<script lang="ts">
  import { getContext } from "svelte";
  import {
    SUBSCRIPTION_CONTEXT_KEY,
    type SubscriptionContextValue,
  } from "./subscriptionContext.js";

  interface Props {
    class?: string;
    children?: import("svelte").Snippet;
  }

  let { class: className = "", children }: Props = $props();
  const rootContext = getContext<SubscriptionContextValue | undefined>(
    SUBSCRIPTION_CONTEXT_KEY,
  );
  const resolvedClass = $derived(
    rootContext?.getUnstyled()
      ? className
      : `creem-base:grid creem-base:grid-cols-1 creem-base:gap-4 sm:creem-base:grid-cols-2 lg:creem-base:grid-cols-3 ${className}`,
  );
</script>

<div class={resolvedClass}>
  {#if children}
    {@render children()}
  {/if}
</div>
