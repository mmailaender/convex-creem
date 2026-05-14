<script lang="ts">
  /* global $props, $derived */
  import type { BillingSnapshot, PaymentSnapshot } from "../../core/types.js";
  import {
    defaultBillingLabels,
    type BillingLabels,
  } from "../../core/i18n.js";

  interface Props {
    snapshot?: BillingSnapshot | null;
    payment?: PaymentSnapshot | null;
    className?: string;
    labels?: BillingLabels;
  }

  let {
    snapshot = null,
    payment = null,
    className = "",
    labels = defaultBillingLabels,
  }: Props = $props();

  const activePayment = $derived(payment ?? snapshot?.payment ?? null);
  const show = $derived(activePayment != null && activePayment.status !== "paid");
  const message = $derived(
    activePayment?.status === "pending"
      ? labels.paymentWarning.pending
      : activePayment?.status === "partially_refunded"
        ? labels.paymentWarning.partiallyRefunded
        : labels.paymentWarning.refunded,
  );
</script>

{#if show}
  <div
    class={`rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200 ${className}`}
  >
    {message}
  </div>
{/if}
