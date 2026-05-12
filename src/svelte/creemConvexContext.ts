import type { RecurringCycle, PlanCatalog } from "../core/types.js";
import type {
  BillingPermissions,
  CheckoutIntent,
  ConnectedBillingApi,
  PlanChangeIntent,
} from "./widgets/types.js";

export const CREEM_CONVEX_CONTEXT_KEY = Symbol("creem-convex-context");

export interface CreemConvexContextValue {
  readonly api: ConnectedBillingApi;
  readonly catalog?: PlanCatalog;
  readonly defaultCycle?: RecurringCycle;
  readonly permissions?: BillingPermissions;
  readonly onBeforeCheckout?: (
    intent: CheckoutIntent,
  ) => Promise<boolean> | boolean;
  readonly onBeforePlanChange?: (
    intent: PlanChangeIntent,
  ) => Promise<boolean> | boolean;
  readonly onBeforeFreePlanActivation?: (intent: {
    freePlanId: string;
  }) => Promise<boolean> | boolean;
}
