import { createContext, useContext } from "react";
import type { UIPlanEntry, RecurringCycle } from "../../core/types.js";

/** Context value exposed to Subscription.Item slot components. */
export type SubscriptionItemContextValue = {
  plan: UIPlanEntry;
  isActive: boolean;
  isRecommended: boolean;
  selectedCycle: RecurringCycle;
  currentProductId: string | undefined;
  price: string | null;
  unstyled: boolean;
  onCheckout?: () => void;
  onSwitch?: () => void;
};

export const SubscriptionItemContext = createContext<
  SubscriptionItemContextValue | undefined
>(undefined);

/** Hook to access the current Subscription.Item context. Throws if used outside a Subscription.Item. */
export const useSubscriptionItem = (): SubscriptionItemContextValue => {
  const ctx = useContext(SubscriptionItemContext);
  if (!ctx) {
    throw new Error(
      "useSubscriptionItem must be used inside a <Subscription.Item> component",
    );
  }
  return ctx;
};
