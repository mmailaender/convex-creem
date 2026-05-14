<script lang="ts">
  /* global $props */
  import type { Snippet } from "svelte";
  import CheckoutButton from "./CheckoutButton.svelte";
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
</script>

<CheckoutButton
  {productId}
  {href}
  {disabled}
  {className}
  {onCheckout}
  {labels}
>
  {#if children}
    {@render children()}
  {:else}
    {labels.checkout.buyNow}
  {/if}
</CheckoutButton>
