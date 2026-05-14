<script lang="ts">
  /* global $props, $derived */
  import type { BillingSnapshot } from "../../core/types.js";
  import {
    defaultBillingLabels,
    type BillingDateFormatInput,
    type BillingLabels,
  } from "../../core/i18n.js";

  interface Props {
    snapshot?: BillingSnapshot | null;
    className?: string;
    isLoading?: boolean;
    onResume?: () => void;
    labels?: BillingLabels;
    formatDate?: (input: BillingDateFormatInput) => string;
  }

  let {
    snapshot = null,
    className = "",
    isLoading = false,
    onResume = undefined,
    labels = defaultBillingLabels,
    formatDate = undefined,
  }: Props = $props();

  const show = $derived(snapshot?.metadata?.cancelAtPeriodEnd === true);
  const currentPeriodEnd = $derived(
    typeof snapshot?.metadata?.currentPeriodEnd === "string"
      ? snapshot.metadata.currentPeriodEnd
      : undefined,
  );
  const formattedPeriodEnd = $derived(
    currentPeriodEnd
      ? (formatDate ?? (({ date }) => date.toLocaleDateString()))({
          date: new Date(currentPeriodEnd),
        })
      : undefined,
  );
</script>

{#if show}
  <div
    class={`rounded-xl bg-surface-base p-6 ${className}`}
  >
    <div class="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-4">
      <div class="space-y-2">
        <p class="title-s text-foreground-default">
          {labels.scheduledChange.cancellationScheduled}
        </p>
        <p class="body-m text-foreground-muted">
          {labels.scheduledChange.accessUntilPeriodEnd(formattedPeriodEnd)}
        </p>
      </div>
      {#if onResume}
        <button
          type="button"
          class="button-faded h-8 shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
          onclick={onResume}
        >
          {isLoading ? labels.scheduledChange.resuming : labels.scheduledChange.undoCancellation}
        </button>
      {/if}
    </div>
  </div>
{/if}
