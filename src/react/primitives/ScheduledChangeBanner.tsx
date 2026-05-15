import type { BillingSnapshot } from "../../core/types.js";
import {
  defaultBillingLabels,
  type BillingDateFormatInput,
  type BillingLabels,
} from "../../core/i18n.js";

export const ScheduledChangeBanner = ({
  snapshot,
  className = "",
  isLoading = false,
  onResume,
  onUndoUpdate,
  scheduledUpdateLabel,
  labels = defaultBillingLabels,
  formatDate,
}: {
  snapshot?: BillingSnapshot | null;
  className?: string;
  isLoading?: boolean;
  onResume?: () => void;
  onUndoUpdate?: () => void;
  scheduledUpdateLabel?: string | null;
  labels?: BillingLabels;
  formatDate?: (input: BillingDateFormatInput) => string;
}) => {
  const scheduledUpdate =
    snapshot?.metadata?.scheduledSubscriptionUpdate &&
    typeof snapshot.metadata.scheduledSubscriptionUpdate === "object"
      ? (snapshot.metadata.scheduledSubscriptionUpdate as {
          effectiveAt?: unknown;
        })
      : null;
  const hasScheduledUpdate = scheduledUpdate != null;
  if (
    !snapshot?.metadata ||
    (snapshot.metadata.cancelAtPeriodEnd !== true && !hasScheduledUpdate)
  ) {
    return null;
  }

  const currentPeriodEnd =
    hasScheduledUpdate && typeof scheduledUpdate.effectiveAt === "string"
      ? scheduledUpdate.effectiveAt
      : typeof snapshot.metadata.currentPeriodEnd === "string"
        ? snapshot.metadata.currentPeriodEnd
        : undefined;
  const formattedPeriodEnd = currentPeriodEnd
    ? (formatDate ?? (({ date }) => date.toLocaleDateString()))({
        date: new Date(currentPeriodEnd),
      })
    : undefined;

  return (
    <div className={`rounded-xl bg-surface-base p-6 ${className}`}>
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="space-y-2">
          <p className="title-s text-foreground-default">
            {hasScheduledUpdate
              ? labels.scheduledChange.updateScheduled
              : labels.scheduledChange.cancellationScheduled}
          </p>
          <p className="body-m text-foreground-muted">
            {hasScheduledUpdate
              ? labels.scheduledChange.updateAtPeriodEnd(formattedPeriodEnd)
              : labels.scheduledChange.accessUntilPeriodEnd(formattedPeriodEnd)}
          </p>
          {hasScheduledUpdate && scheduledUpdateLabel && (
            <p className="label-m text-foreground-default">
              {labels.scheduledChange.targetUpdate(scheduledUpdateLabel)}
            </p>
          )}
        </div>
        {hasScheduledUpdate && onUndoUpdate ? (
          <button
            type="button"
            className="button-faded h-8 shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            onClick={onUndoUpdate}
          >
            {isLoading
              ? labels.scheduledChange.resuming
              : labels.scheduledChange.undoUpdate}
          </button>
        ) : !hasScheduledUpdate && onResume ? (
          <button
            type="button"
            className="button-faded h-8 shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            onClick={onResume}
          >
            {isLoading
              ? labels.scheduledChange.resuming
              : labels.scheduledChange.undoCancellation}
          </button>
        ) : null}
      </div>
    </div>
  );
};
