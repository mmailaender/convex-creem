import { createContext, useContext } from "react";

export interface CreditsContextValue {
  balance: string | null;
  loading: boolean;
  error: string | null;
  unitLabel: string;
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
