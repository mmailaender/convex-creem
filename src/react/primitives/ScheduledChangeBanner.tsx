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
  labels = defaultBillingLabels,
  formatDate,
}: {
  snapshot?: BillingSnapshot | null;
  className?: string;
  isLoading?: boolean;
  onResume?: () => void;
  labels?: BillingLabels;
  formatDate?: (input: BillingDateFormatInput) => string;
}) => {
  if (!snapshot?.metadata || snapshot.metadata.cancelAtPeriodEnd !== true) {
    return null;
  }

  const currentPeriodEnd =
    typeof snapshot.metadata.currentPeriodEnd === "string"
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
            {labels.scheduledChange.cancellationScheduled}
          </p>
          <p className="body-m text-foreground-muted">
            {labels.scheduledChange.accessUntilPeriodEnd(formattedPeriodEnd)}
          </p>
        </div>
        {onResume && (
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
        )}
      </div>
    </div>
  );
};
