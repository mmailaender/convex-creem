<script lang="ts">
  import { getSubscriptionItemContext } from "./subscriptionItemContext.js";

  interface Props {
    class?: string;
  }

  let { class: className = "" }: Props = $props();
  const ctx = getSubscriptionItemContext();
</script>

{#if ctx.plan.description}
  <p class={`text-sm text-zinc-500 dark:text-zinc-400 ${className}`}>
    {ctx.plan.description}
  </p>
{/if}
