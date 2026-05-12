import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useConvex } from "convex/react";
import {
  requireCreemConvexApi,
  useCreemConvex,
} from "../CreemConvexProvider.js";
import { CreditsContext } from "./creditsContext.js";
import {
  CreditsAmount,
  CreditsError,
  CreditsRefresh,
  CreditsTitle,
} from "./CreditsSlots.js";

export const CreditsRoot = ({
  unitLabel = "credits",
  className = "",
  children,
}: PropsWithChildren<{
  unitLabel?: string;
  class?: string;
  className?: string;
}>) => {
  const provider = useCreemConvex();
  const resolvedApi = requireCreemConvexApi("Credits.Root", provider);
  const client = useConvex();
  const getBalanceRef = resolvedApi.credits?.getBalance;

  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!getBalanceRef) {
      setError("Credits API is not configured.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await client.action(getBalanceRef, {});
      setBalance(result?.balance ?? "0");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to load balance",
      );
    } finally {
      setLoading(false);
    }
  }, [client, getBalanceRef]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timeout);
  }, [refresh]);

  const contextValue = useMemo(
    () => ({ balance, loading, error, unitLabel, refresh }),
    [balance, error, loading, refresh, unitLabel],
  );

  return (
    <CreditsContext.Provider value={contextValue}>
      <section
        className={`w-full max-w-sm space-y-4 radius-xl border border-border-subtle bg-surface-base p-6 text-foreground-default ${className}`}
      >
        {children ?? (
          <>
            <div className="flex items-center justify-between gap-3">
              <CreditsTitle />
              <CreditsRefresh />
            </div>
            <CreditsAmount />
            <CreditsError />
          </>
        )}
      </section>
    </CreditsContext.Provider>
  );
};
