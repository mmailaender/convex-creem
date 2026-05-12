import { getContext } from "svelte";

export const CREDITS_CONTEXT_KEY = Symbol("credits-context");

export interface CreditsContextValue {
  readonly balance: string | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly unitLabel: string;
  refresh: () => Promise<void>;
}

export const getCreditsContext = () => {
  const context = getContext<CreditsContextValue | undefined>(
    CREDITS_CONTEXT_KEY,
  );
  if (!context) {
    throw new Error("Credits slots must be used inside <Credits.Root>.");
  }
  return context;
};
