<script lang="ts">
  import type { FunctionReference } from "convex/server";
  import { useConvexClient } from "convex-svelte";
  import {
    defaultBillingLabels,
    type BillingLabels,
  } from "../../core/i18n.js";
  import { getConvexErrorMessage } from "../../core/convexError.js";

  interface Props {
    portalUrl: FunctionReference<"action">;
    class?: string;
    labels?: BillingLabels;
    children?: import("svelte").Snippet;
  }

  let {
    portalUrl,
    class: className = "",
    labels = defaultBillingLabels,
    children,
  }: Props = $props();

  const client = useConvexClient();
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  const handleClick = async () => {
    isLoading = true;
    error = null;
    try {
      const result = (await client.action(portalUrl, {})) as { url: string };
      window.location.href = result.url;
    } catch (err) {
      error = getConvexErrorMessage(err, labels.portal.failedToOpen);
      isLoading = false;
    }
  };
</script>

<button
  type="button"
  class={`button-faded border border-error-border-subtle bg-error-surface-subtle text-error-foreground-default hover:bg-error-surface-tonal disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
  disabled={isLoading}
  onclick={handleClick}
>
  {#if isLoading}
    {labels.paymentRecovery.openingPortal}
  {:else if children}
    {@render children()}
  {:else}
    {labels.paymentRecovery.updatePaymentMethod}
  {/if}
</button>
{#if error}
  <p class="label-s mt-1 text-error-foreground-muted">{error}</p>
{/if}
