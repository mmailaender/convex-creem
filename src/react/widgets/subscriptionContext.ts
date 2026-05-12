import { createContext } from "react";
import type { RecurringCycle, UIPlanEntry } from "../../core/types.js";
import type {
  ConnectedProduct,
  SubscriptionPlanRegistration,
} from "./types.js";

export type SubscriptionContextValue = {
  registerPlan: (plan: SubscriptionPlanRegistration) => () => void;
  getPlan: (planId: string) => UIPlanEntry | undefined;
  isPlanVisible: (planId: string) => boolean;
  selectedCycle?: RecurringCycle;
  activePlanId: string | null;
  products: ConnectedProduct[];
  subscriptionProductId: string | null;
  subscriptionStatus: string | null;
  subscriptionTrialEnd: string | null;
  subscribedUnits: number | null;
  units?: number;
  showUnitPicker: boolean;
  isGroupSubscribed: boolean;
  disableCheckout: boolean;
  disableSwitch: boolean;
  disableUnits: boolean;
  unstyled: boolean;
  checkout: (payload: {
    plan: UIPlanEntry;
    productId: string;
    units?: number;
  }) => Promise<void> | void;
  switchPlan?: (payload: {
    plan: UIPlanEntry;
    productId: string;
    units?: number;
  }) => Promise<void> | void;
  updateUnits?: (payload: { units: number }) => Promise<void> | void;
  cancelSubscription?: () => void;
  groupItems: Array<{ value: string; label: string }>;
  activeGroupId: string | null;
  setGroup: (group: string) => void;
  availableCycles: RecurringCycle[];
  setCycle: (cycle: RecurringCycle) => void;
};

export const SubscriptionContext = createContext<
  SubscriptionContextValue | undefined
>(undefined);
