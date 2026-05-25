/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import type { PlanCatalog, RecurringCycle } from "../core/types.js";
import type { BillingI18n } from "../core/i18n.js";
import type {
  BillingPermissions,
  CheckoutIntent,
  ConnectedBillingApi,
  PlanChangeIntent,
} from "./widgets/types.js";

export interface CreemConvexContextValue {
  api: ConnectedBillingApi;
  catalog?: PlanCatalog;
  defaultCycle?: RecurringCycle;
  permissions?: BillingPermissions;
  onBeforeCheckout?: (intent: CheckoutIntent) => Promise<boolean> | boolean;
  onBeforePlanChange?: (intent: PlanChangeIntent) => Promise<boolean> | boolean;
  onBeforePlanActivation?: (intent: {
    planId: string;
  }) => Promise<boolean> | boolean;
  i18n?: BillingI18n;
}

const CreemConvexContext = createContext<CreemConvexContextValue | null>(null);

export const useCreemConvex = () => useContext(CreemConvexContext);

export const requireCreemConvexApi = (
  componentName: string,
  provider: CreemConvexContextValue | null,
) => {
  const resolvedApi = provider?.api;
  if (!resolvedApi) {
    throw new Error(
      `${componentName} must be rendered inside <CreemConvexProvider>.`,
    );
  }
  return resolvedApi;
};

export const CreemConvexProvider = ({
  api,
  catalog,
  defaultCycle,
  permissions,
  onBeforeCheckout,
  onBeforePlanChange,
  onBeforePlanActivation,
  i18n,
  children,
}: PropsWithChildren<CreemConvexContextValue>) => {
  const value = useMemo(
    () => ({
      api,
      catalog,
      defaultCycle,
      permissions,
      onBeforeCheckout,
      onBeforePlanChange,
      onBeforePlanActivation,
      i18n,
    }),
    [
      api,
      catalog,
      defaultCycle,
      permissions,
      onBeforeCheckout,
      onBeforePlanChange,
      onBeforePlanActivation,
      i18n,
    ],
  );

  return (
    <CreemConvexContext.Provider value={value}>
      {children}
    </CreemConvexContext.Provider>
  );
};
