<script lang="ts">
  /* global $props, $state */
  import type { Snippet } from "svelte";
  import {
    defaultBillingLabels,
    type BillingLabels,
  } from "../../core/i18n.js";

  interface Props {
    productId: string;
    href?: string;
    disabled?: boolean;
    className?: string;
    onCheckout?: (payload: { productId: string }) => Promise<void> | void;
    labels?: BillingLabels;
    children?: Snippet;
  }

  let {
    productId,
    href = undefined,
    disabled = false,
    className = "",
    onCheckout,
    labels = defaultBillingLabels,
    children,
  }: Props = $props();

  let isLoading = $state(false);

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled || isLoading || !onCheckout) return;
    isLoading = true;
    Promise.resolve(onCheckout({ productId })).finally(() => {
      isLoading = false;
    });
  };
</script>

{#if onCheckout}
  <button
    type="button"
    class={`button-filled disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    {disabled}
    onclick={handleClick}
  >
    {#if children}
      {@render children()}
    {:else}
      {isLoading ? labels.checkout.loading : labels.checkout.checkout}
    {/if}
  </button>
{:else}
  <a
    href={href}
    class={`button-filled ${className}`}
  >
    {#if children}
      {@render children()}
    {:else}
      {labels.checkout.checkout}
    {/if}
  </a>
{/if}
