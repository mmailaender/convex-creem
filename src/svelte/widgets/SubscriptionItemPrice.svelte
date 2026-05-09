<script lang="ts">
  import { getSubscriptionItemContext } from "./subscriptionItemContext.js";

  interface Props {
    class?: string;
  }

  let { class: className = "" }: Props = $props();
  const ctx = getSubscriptionItemContext();
</script>

{#if ctx.price}
  <p class={`text-2xl font-bold ${className}`}>{ctx.price}</p>
{/if}
