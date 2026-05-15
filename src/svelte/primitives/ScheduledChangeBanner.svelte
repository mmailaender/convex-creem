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
    onUndoUpdate?: () => void;
    scheduledUpdateLabel?: string | null;
    labels?: BillingLabels;
    formatDate?: (input: BillingDateFormatInput) => string;
  }

  let {
    snapshot = null,
    className = "",
    isLoading = false,
    onResume = undefined,
    onUndoUpdate = undefined,
    scheduledUpdateLabel = null,
    labels = defaultBillingLabels,
    formatDate = undefined,
  }: Props = $props();

  const scheduledUpdate = $derived(
    snapshot?.metadata?.scheduledSubscriptionUpdate &&
      typeof snapshot.metadata.scheduledSubscriptionUpdate === "object"
      ? (snapshot.metadata.scheduledSubscriptionUpdate as {
          effectiveAt?: unknown;
        })
      : null,
  );
  const hasScheduledUpdate = $derived(scheduledUpdate != null);
  const show = $derived(
    snapshot?.metadata?.cancelAtPeriodEnd === true || hasScheduledUpdate,
  );
  const currentPeriodEnd = $derived(
    hasScheduledUpdate && typeof scheduledUpdate?.effectiveAt === "string"
      ? scheduledUpdate.effectiveAt
      : typeof snapshot?.metadata?.currentPeriodEnd === "string"
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
          {hasScheduledUpdate
            ? labels.scheduledChange.updateScheduled
            : labels.scheduledChange.cancellationScheduled}
        </p>
        <p class="body-m text-foreground-muted">
          {hasScheduledUpdate
            ? labels.scheduledChange.updateAtPeriodEnd(formattedPeriodEnd)
            : labels.scheduledChange.accessUntilPeriodEnd(formattedPeriodEnd)}
        </p>
        {#if hasScheduledUpdate && scheduledUpdateLabel}
          <p class="label-m text-foreground-default">
            {labels.scheduledChange.targetUpdate(scheduledUpdateLabel)}
          </p>
        {/if}
      </div>
      {#if hasScheduledUpdate && onUndoUpdate}
        <button
          type="button"
          class="button-faded h-8 shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
          onclick={onUndoUpdate}
        >
          {isLoading ? labels.scheduledChange.resuming : labels.scheduledChange.undoUpdate}
        </button>
      {:else if !hasScheduledUpdate && onResume}
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
