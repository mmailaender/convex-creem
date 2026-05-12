<script lang="ts">
  import { setContext, type Snippet } from "svelte";
  import type { PlanCatalog, RecurringCycle } from "../core/types.js";
  import {
    CREEM_CONVEX_CONTEXT_KEY,
    type CreemConvexContextValue,
  } from "./creemConvexContext.js";
  import type {
    BillingPermissions,
    CheckoutIntent,
    ConnectedBillingApi,
    PlanChangeIntent,
  } from "./widgets/types.js";

  interface Props {
    api: ConnectedBillingApi;
    catalog?: PlanCatalog;
    defaultCycle?: RecurringCycle;
    permissions?: BillingPermissions;
    onBeforeCheckout?: (intent: CheckoutIntent) => Promise<boolean> | boolean;
    onBeforePlanChange?: (
      intent: PlanChangeIntent,
    ) => Promise<boolean> | boolean;
    onBeforeFreePlanActivation?: (intent: {
      freePlanId: string;
    }) => Promise<boolean> | boolean;
    children?: Snippet;
  }

  let {
    api,
    catalog = undefined,
    defaultCycle = undefined,
    permissions = undefined,
    onBeforeCheckout = undefined,
    onBeforePlanChange = undefined,
    onBeforeFreePlanActivation = undefined,
    children,
  }: Props = $props();

  const contextValue: CreemConvexContextValue = {
    get api() {
      return api;
    },
    get catalog() {
      return catalog;
    },
    get defaultCycle() {
      return defaultCycle;
    },
    get permissions() {
      return permissions;
    },
    get onBeforeCheckout() {
      return onBeforeCheckout;
    },
    get onBeforePlanChange() {
      return onBeforePlanChange;
    },
    get onBeforeFreePlanActivation() {
      return onBeforeFreePlanActivation;
    },
  };

  setContext(CREEM_CONVEX_CONTEXT_KEY, contextValue);
</script>

{@render children?.()}
