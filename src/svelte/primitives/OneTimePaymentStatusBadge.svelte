<script lang="ts">
  /* global $props */
  import type { OneTimePaymentStatus } from "../../core/types.js";
  import {
    defaultBillingLabels,
    type BillingLabels,
  } from "../../core/i18n.js";

  interface Props {
    status: OneTimePaymentStatus;
    className?: string;
    labels?: BillingLabels;
  }

  let { status, className = "", labels = defaultBillingLabels }: Props = $props();
</script>

<span class={className}>{labels.oneTimePaymentStatus[status]}</span>
