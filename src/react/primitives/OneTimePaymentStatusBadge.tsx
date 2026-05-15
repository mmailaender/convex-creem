import type { OneTimePaymentStatus } from "../../core/types.js";
import { defaultBillingLabels, type BillingLabels } from "../../core/i18n.js";

export const OneTimePaymentStatusBadge = ({
  status,
  className = "",
  labels = defaultBillingLabels,
}: {
  status: OneTimePaymentStatus;
  className?: string;
  labels?: BillingLabels;
}) => {
  return (
    <span className={className}>{labels.oneTimePaymentStatus[status]}</span>
  );
};
