<script lang="ts">
  import { getSubscriptionItemContext } from "./subscriptionItemContext.js";

  interface Props {
    label?: string;
    class?: string;
    children?: import("svelte").Snippet;
  }

  let {
    label = undefined,
    class: className = "",
    children,
  }: Props = $props();

  const ctx = getSubscriptionItemContext();
  const text = $derived(
    label ?? (ctx.isActive ? "Current" : ctx.isRecommended ? "Recommended" : null),
  );
  const show = $derived(text != null || children != null);
</script>

{#if show}
  <span
    class={`inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 ${className}`}
  >
    {#if children}
      {@render children()}
    {:else}
      {text}
    {/if}
  </span>
{/if}
