import { createContext, useContext } from "react";
import type { BillingLabels } from "../../core/i18n.js";

export interface CreditsContextValue {
  balance: string | null;
  loading: boolean;
  error: string | null;
  unitLabel: string;
  labels: BillingLabels;
  refresh: () => Promise<void>;
}

export const CreditsContext = createContext<CreditsContextValue | null>(null);

export const useCredits = () => {
  const context = useContext(CreditsContext);
  if (!context) {
    throw new Error("Credits slots must be used inside <Credits.Root>.");
  }
  return context;
};
