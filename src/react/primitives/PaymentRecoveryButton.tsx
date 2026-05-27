import { useState, useCallback, type PropsWithChildren } from "react";
import type { FunctionReference } from "convex/server";
import { useConvex } from "convex/react";
import { defaultBillingLabels, type BillingLabels } from "../../core/i18n.js";
import { getConvexErrorMessage } from "../../core/convexError.js";

/**
 * Button that opens the Creem customer portal for payment recovery.
 *
 * When clicked, calls the portal URL action and redirects the user to Creem's
 * hosted portal where they can update their payment method.
 *
 * @example
 * ```tsx
 * <PaymentRecoveryButton portalUrl={api.billing.customersPortalUrl}>
 *   Update payment method
 * </PaymentRecoveryButton>
 * ```
 */
export const PaymentRecoveryButton = ({
  portalUrl,
  className = "",
  labels = defaultBillingLabels,
  children,
}: PropsWithChildren<{
  portalUrl: FunctionReference<"action">;
  className?: string;
  labels?: BillingLabels;
}>) => {
  const client = useConvex();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = (await client.action(portalUrl, {})) as { url: string };
      window.location.href = result.url;
    } catch (err) {
      setError(getConvexErrorMessage(err, labels.portal.failedToOpen));
      setIsLoading(false);
    }
  }, [client, labels.portal.failedToOpen, portalUrl]);

  return (
    <>
      <button
        type="button"
        className={`button-faded border border-error-border-subtle bg-error-surface-subtle text-error-foreground-default hover:bg-error-surface-tonal disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        disabled={isLoading}
        onClick={handleClick}
      >
        {isLoading
          ? labels.paymentRecovery.openingPortal
          : (children ?? labels.paymentRecovery.updatePaymentMethod)}
      </button>
      {error && (
        <p className="label-s mt-1 text-error-foreground-muted">{error}</p>
      )}
    </>
  );
};
