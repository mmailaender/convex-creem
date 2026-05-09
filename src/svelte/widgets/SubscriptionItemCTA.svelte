<script lang="ts">
  import { getSubscriptionItemContext } from "./subscriptionItemContext.js";

  interface Props {
    class?: string;
    activeLabel?: string;
    checkoutLabel?: string;
    switchLabel?: string;
  }

  let {
    class: className = "",
    activeLabel = "Current plan",
    checkoutLabel = "Get started",
    switchLabel = "Switch plan",
  }: Props = $props();

  const ctx = getSubscriptionItemContext();
</script>

{#if ctx.isActive}
  <button
    type="button"
    class={`w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 ${className}`}
    disabled
  >
    {activeLabel}
  </button>
{:else if ctx.onSwitch}
  <button
    type="button"
    class={`button-filled w-full ${className}`}
    onclick={ctx.onSwitch}
  >
    {switchLabel}
  </button>
{:else if ctx.onCheckout}
  <button
    type="button"
    class={`button-filled w-full ${className}`}
    onclick={ctx.onCheckout}
  >
    {checkoutLabel}
  </button>
{/if}
