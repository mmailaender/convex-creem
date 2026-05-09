import { useState, useCallback, type PropsWithChildren } from "react";
import type { FunctionReference } from "convex/server";
import { useConvex } from "convex/react";

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
  children,
}: PropsWithChildren<{
  portalUrl: FunctionReference<"action">;
  className?: string;
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
      setError(
        err instanceof Error ? err.message : "Failed to open billing portal",
      );
      setIsLoading(false);
    }
  }, [client, portalUrl]);

  return (
    <>
      <button
        type="button"
        className={`button-faded border border-error-border-subtle bg-error-surface-subtle text-error-foreground-default hover:bg-error-surface-tonal disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        disabled={isLoading}
        onClick={handleClick}
      >
        {isLoading ? "Opening portal…" : (children ?? "Update payment method")}
      </button>
      {error && (
        <p className="label-s mt-1 text-error-foreground-muted">{error}</p>
      )}
    </>
  );
};
