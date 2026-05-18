<script lang="ts">
  import { getContext, setContext, untrack } from "svelte";
  import { SvelteMap, SvelteSet } from "svelte/reactivity";

  import { Dialog } from "@ark-ui/svelte/dialog";
  import { Portal } from "@ark-ui/svelte/portal";

  import PricingSection from "../primitives/PricingSection.svelte";
  import SegmentGroup from "../primitives/SegmentGroup.svelte";
  import PaymentWarningBanner from "../primitives/PaymentWarningBanner.svelte";
  import ScheduledChangeBanner from "../primitives/ScheduledChangeBanner.svelte";

  import { useConvexClient, useQuery } from "@mmailaender/convex-svelte";
  import {
    SUBSCRIPTION_CONTEXT_KEY,
    type SubscriptionContextValue,
  } from "./subscriptionContext.js";
  import {
    CREEM_CONVEX_CONTEXT_KEY,
    type CreemConvexContextValue,
  } from "../creemConvexContext.js";
  import { pendingCheckout } from "../../core/pendingCheckout.js";

  import type {
    PlanCatalog,
    PlanCatalogEntry,
    UIPlanEntry,
    RecurringCycle,
    UpdateBehavior,
    UpdateBehaviorIntent,
    UpdateBehaviorSetting,
  } from "../../core/types.js";
  import {
    mergeBillingLabels,
    resolveBillingI18n,
    type BillingI18n,
    type BillingLabelOverrides,
  } from "../../core/i18n.js";
  import { findPlanById, normalizePlanCatalog } from "../../core/catalog.js";
  import { buildUpdateSummary } from "../../core/subscriptionUpdate.js";
  import {
    formatPriceWithInterval,
    formatUnitPrice,
    formatUnitPriceBreakdown,
  } from "../primitives/shared.js";
  import type {
    BillingPermissions,
    CheckoutIntent,
    PlanChangeIntent,
    ConnectedBillingModel,
    SubscriptionGroupRegistration,
    SubscriptionPlanRegistration,
  } from "./types.js";

  interface Props {
    catalog?: PlanCatalog;
    plans?: readonly string[];
    groups?: SubscriptionGroupRegistration[];
    defaultGroup?: string;
    group?: string;
    onGroupChange?: (group: string) => void;
    groupSelector?: "auto" | "hidden" | "external";
    defaultCycle?: RecurringCycle;
    cycle?: RecurringCycle;
    onCycleChange?: (cycle: RecurringCycle) => void;
    intervalSelector?: "auto" | "hidden" | "external";
    permissions?: BillingPermissions;
    class?: string;
    successUrl?: string;
    units?: number;
    showUnitPicker?: boolean;
    twoColumnLayout?: boolean;
    updateBehavior?: UpdateBehaviorSetting;
    unstyled?: boolean;
    onBeforeCheckout?: (intent: CheckoutIntent) => Promise<boolean> | boolean;
    onBeforePlanChange?: (intent: PlanChangeIntent) => Promise<boolean> | boolean;
    onBeforeFreePlanActivation?: (intent: { freePlanId: string }) => Promise<boolean> | boolean;
    labels?: BillingLabelOverrides;
    i18n?: BillingI18n;
    children?: import("svelte").Snippet;
  }

  let {
    catalog = undefined,
    plans: planIds = undefined,
    groups: explicitGroups = undefined,
    defaultGroup = undefined,
    group = undefined,
    onGroupChange = undefined,
    groupSelector = "auto",
    defaultCycle = undefined,
    cycle = undefined,
    onCycleChange = undefined,
    intervalSelector = "auto",
    permissions = undefined,
    class: className = "",
    successUrl = undefined,
    units = undefined,
    showUnitPicker = false,
    twoColumnLayout = false,
    updateBehavior = "proration-charge-immediately",
    unstyled = false,
    onBeforeCheckout = undefined,
    onBeforePlanChange = undefined,
    onBeforeFreePlanActivation = undefined,
    labels: labelOverrides = undefined,
    i18n = undefined,
    children,
  }: Props = $props();

  const provider = getContext<CreemConvexContextValue | undefined>(
    CREEM_CONVEX_CONTEXT_KEY,
  );
  const resolvedApi = provider?.api;
  if (!resolvedApi) {
    throw new Error(
      "Subscription.Root must be rendered inside <CreemConvexProvider>.",
    );
  }

  const resolvedCatalog = $derived(catalog ?? provider?.catalog);
  const resolvedDefaultCycle = $derived(
    defaultCycle ?? provider?.defaultCycle ?? "every-month",
  );
  const resolvedPermissions = $derived(permissions ?? provider?.permissions);
  const resolvedOnBeforeCheckout = $derived(
    onBeforeCheckout ?? provider?.onBeforeCheckout,
  );
  const resolvedOnBeforePlanChange = $derived(
    onBeforePlanChange ?? provider?.onBeforePlanChange,
  );
  const resolvedOnBeforeFreePlanActivation = $derived(
    onBeforeFreePlanActivation ?? provider?.onBeforeFreePlanActivation,
  );
  const resolvedI18n = $derived.by(() => {
    const providerI18n = resolveBillingI18n(provider?.i18n);
    return {
      locale: i18n?.locale ?? providerI18n.locale,
      labels: mergeBillingLabels(
        labelOverrides,
        mergeBillingLabels(i18n?.labels, providerI18n.labels),
      ),
      formatCurrency: i18n?.formatCurrency ?? providerI18n.formatCurrency,
      formatDate: i18n?.formatDate ?? providerI18n.formatDate,
    };
  });

  const canChange = $derived(resolvedPermissions?.canChangeSubscription !== false);
  const canCancel = $derived(resolvedPermissions?.canCancelSubscription !== false);
  const canResume = $derived(resolvedPermissions?.canResumeSubscription !== false);

  const client = useConvexClient();

  const billingUiModelRef = resolvedApi.uiModel;
  const checkoutLinkRef = resolvedApi.checkouts.create;
  const updateRef = resolvedApi.subscriptions?.update;
  const cancelRef = resolvedApi.subscriptions?.cancel;
  const resumeRef = resolvedApi.subscriptions?.resume;
  const cancelScheduledUpdateRef =
    resolvedApi.subscriptions?.cancelScheduledUpdate;

  const billingModelQuery = useQuery(billingUiModelRef, {});

  let selectedCycle = $state<RecurringCycle>(
    untrack(() => resolvedDefaultCycle),
  );
  let selectedGroupId = $state<string | null>(
    untrack(() => defaultGroup ?? null),
  );
  let isActionLoading = $state(false);
  let actionError = $state<string | null>(null);
  let updateDialogOpen = $state(false);
  let pendingUpdate = $state<
    | {
        kind: "plan-switch";
        plan: UIPlanEntry;
        productId?: string;
        freePlanId?: string;
        units?: number;
      }
    | { kind: "unit-update"; units: number }
    | null
  >(null);
  let registeredPlans = $state<SubscriptionPlanRegistration[]>([]);
  let cancelDialogOpen = $state(false);

  const contextValue: SubscriptionContextValue = {
    registerPlan: (plan) => {
      registeredPlans = [
        ...registeredPlans.filter(
          (candidate) => candidate.planId !== plan.planId,
        ),
        plan,
      ];
      return () => {
        registeredPlans = registeredPlans.filter(
          (candidate) => candidate.planId !== plan.planId,
        );
      };
    },
    getPlan: (planId) => plans.find((plan) => plan.planId === planId),
    isPlanVisible: (planId) =>
      visiblePlans.some((plan) => plan.planId === planId),
    getSelectedCycle: () => effectiveCycle,
    getActivePlanId: () => activePlanId,
    getProducts: () => allProducts,
    getSubscriptionProductId: () => localSubscriptionProductId,
    getSubscriptionStatus: () => localSubscriptionState,
    getSubscriptionTrialEnd: () => matchedSubscription?.trialEnd ?? null,
    getSubscribedUnits: () => localSubscribedUnits,
    getUnits: () => units,
    getShowUnitPicker: () => showUnitPicker,
    getIsGroupSubscribed: () => ownsActiveSubscription,
    getDisableCheckout: () => !canCheckout,
    getDisableSwitch: () => !canChange,
    getDisableUnits: () => !canUpdateUnits,
    getUnstyled: () => unstyled,
    getLabels: () => resolvedI18n.labels,
    formatCurrency: (input) => resolvedI18n.formatCurrency(input),
    formatDate: (input) => resolvedI18n.formatDate(input),
    checkout: (payload) => handlePricingCheckout(payload),
    switchPlan: (payload) => requestSwitchPlan(payload),
    updateUnits: (payload) => handleUpdateUnits(payload),
    get cancelSubscription() {
      return cancelRef &&
        canCancel &&
        ownsActiveSubscription &&
        !localCancelAtPeriodEnd
        ? () => openCancelDialog()
        : undefined;
    },
    groupItems: () => groupItems,
    activeGroupId: () => activeGroupId,
    setGroup: (nextGroup) => {
      clampCycleForGroup(nextGroup);
      selectedGroupId = nextGroup;
      onGroupChange?.(nextGroup);
    },
    availableCycles: () => availableCycles,
    setCycle: (nextCycle) => {
      const nextEffectiveCycle =
        availableCycles.length === 0 || availableCycles.includes(nextCycle)
          ? nextCycle
          : (availableCycles[0] ?? nextCycle);
      selectedCycle = nextEffectiveCycle;
      onCycleChange?.(nextEffectiveCycle);
    },
  };

  setContext(SUBSCRIPTION_CONTEXT_KEY, contextValue);

  const model = $derived(
    (billingModelQuery.data ?? null) as ConnectedBillingModel | null,
  );
  const canCheckout = $derived(
    !model?.user && resolvedOnBeforeCheckout != null
      ? true
      : resolvedPermissions?.canCheckout !== false,
  );
  const canUpdateUnits = $derived(
    !model?.user && resolvedOnBeforeCheckout != null
      ? true
      : resolvedPermissions?.canUpdateUnits !== false,
  );
  const snapshot = $derived(model?.snapshot ?? null);

  $effect(() => {
    if (!model?.user) return;
    untrack(() => {
      const pending = pendingCheckout.load();
      if (!pending) return;
      if ((model!.activeSubscriptions ?? []).length > 0) {
        pendingCheckout.clear();
        return;
      }
      startCheckout(pending.productId, pending.units);
    });
  });

  const allProducts = $derived(model?.allProducts ?? []);
  const normalizedCatalog = $derived(normalizePlanCatalog(resolvedCatalog));

  const catalogRegistrations = $derived.by<SubscriptionPlanRegistration[]>(() => {
    const ids = explicitGroups && explicitGroups.length > 0
      ? explicitGroups.flatMap((entry) => entry.plans)
      : (planIds ?? []);

    return ids.map((planId) => {
      const groupEntry = explicitGroups?.find((entry) => entry.plans.includes(planId));
      return {
        planId,
        groupId: groupEntry?.value,
        groupTitle: groupEntry?.label,
      };
    });
  });

  const plansFromRegistered = $derived.by<UIPlanEntry[]>(() => {
    return [...catalogRegistrations, ...registeredPlans].map((plan) => {
      const catalogEntry = normalizedCatalog
        ? findPlanById(normalizedCatalog, plan.planId)
        : undefined;
      const productIds = plan.productIds ?? catalogEntry?.creemProductIds ?? {};
      const firstProductId = Object.values(productIds)[0];
      const firstProduct = firstProductId
        ? allProducts.find((p) => p.id === firstProductId)
        : undefined;

      const cycleKeys = Object.keys(productIds).filter(
        (k): k is RecurringCycle => k !== "custom",
      );

      const entry: UIPlanEntry = {
        planId: plan.planId,
        category: planTypeToCategory(plan.type, catalogEntry),
        billingType: planTypeToBillingType(plan.type, catalogEntry),
        pricingModel: plan.type === "unit-based" ? "unit" : (catalogEntry?.pricingModel ?? "flat"),
        groupId: plan.groupId ?? catalogEntry?.groupId,
        groupTitle: plan.groupTitle ?? catalogEntry?.groupTitle,
        title:
          plan.title ??
          catalogEntry?.title ??
          firstProduct?.name ??
          plan.planId.charAt(0).toUpperCase() + plan.planId.slice(1),
        description: plan.description ?? catalogEntry?.description ?? firstProduct?.description ?? undefined,
        contactUrl: plan.contactUrl ?? catalogEntry?.contactUrl,
        recommended: plan.recommended ?? catalogEntry?.recommended,
        creemProductIds:
          Object.keys(productIds).length > 0
            ? (productIds as Record<string, string>)
            : undefined,
      };
      if (cycleKeys.length > 0) {
        entry.billingCycles = cycleKeys;
      }
      return entry;
    });
  });

  const plans = $derived(plansFromRegistered);

  const groupItems = $derived.by(() => {
    if (explicitGroups && explicitGroups.length > 0) {
      return explicitGroups.map((entry) => ({
        value: entry.value,
        label: entry.label,
      }));
    }
    const groups = new SvelteMap<string, string>();
    for (const plan of plans) {
      if (!plan.groupId) continue;
      if (!groups.has(plan.groupId)) {
        groups.set(plan.groupId, plan.groupTitle ?? formatGroupTitle(plan.groupId));
      }
    }
    return Array.from(groups, ([value, label]) => ({ value, label }));
  });

  const requestedGroupId = $derived(group ?? selectedGroupId ?? defaultGroup ?? null);
  const activeGroupId = $derived(
    groupItems.length > 1 &&
    requestedGroupId &&
    groupItems.some((item) => item.value === requestedGroupId)
      ? requestedGroupId
      : (groupItems[0]?.value ?? null),
  );

  const visiblePlans = $derived(
    groupItems.length > 1 && activeGroupId
      ? plans.filter((plan) => plan.groupId === activeGroupId)
      : plans,
  );
  const availableCycles = $derived.by<RecurringCycle[]>(() => {
    const cycles = new SvelteSet<RecurringCycle>();
    for (const plan of visiblePlans) {
      for (const cycle of plan.billingCycles ?? []) {
        cycles.add(cycle);
      }
    }
    return Array.from(cycles);
  });
  const effectiveCycle = $derived.by<RecurringCycle>(() => {
    const requestedCycle = cycle ?? selectedCycle;
    if (
      availableCycles.length === 0 ||
      availableCycles.includes(requestedCycle)
    ) {
      return requestedCycle;
    }
    return availableCycles[0] ?? requestedCycle;
  });

  // Collect all product IDs that belong to plans in THIS component instance.
  const ownProductIds = $derived.by<Set<string>>(() => {
    const ids = new SvelteSet<string>();
    for (const plan of plans) {
      if (plan.creemProductIds) {
        for (const pid of Object.values(plan.creemProductIds)) {
          if (pid) ids.add(pid);
        }
      }
    }
    return ids;
  });

  // Find the subscription from activeSubscriptions that belongs to THIS component.
  const matchedSubscription = $derived.by(() => {
    const subs = model?.activeSubscriptions;
    if (!subs || ownProductIds.size === 0) return null;
    return subs.find((s) => ownProductIds.has(s.productId)) ?? null;
  });

  const ownsActiveSubscription = $derived(matchedSubscription != null);
  const localSubscriptionProductId = $derived(
    matchedSubscription?.productId ?? null,
  );
  const localCancelAtPeriodEnd = $derived(
    matchedSubscription?.cancelAtPeriodEnd ?? false,
  );
  const localCurrentPeriodEnd = $derived(
    matchedSubscription?.currentPeriodEnd ?? null,
  );
  const localSubscriptionState = $derived(matchedSubscription?.status ?? null);
  const localSubscribedUnits = $derived(matchedSubscription?.units ?? null);
  const localScheduledUpdate = $derived(
    (model?.scheduledSubscriptionUpdates ?? []).find(
      (update) => update.subscriptionId === matchedSubscription?.id,
    ) ?? null,
  );

  const activePlanId = $derived.by<string | null>(() => {
    if (!model) return null;
    // Use this component's matched subscription product ID, not the global one.
    const subProductId = localSubscriptionProductId;
    if (subProductId) {
      const matchedPlan = plans.find((plan) => {
        const values = Object.values(plan.creemProductIds ?? {}).filter(
          Boolean,
        ) as string[];
        return values.includes(subProductId);
      });
      return matchedPlan?.planId ?? null;
    }
    // No active subscription: if user is signed in, treat the free plan as active.
    if (model.user) {
      const freePlan = plans.find((p) => p.category === "free");
      if (freePlan) return freePlan.planId;
    }
    return null;
  });

  function getProductPrice(productId?: string | null) {
    return productId
      ? (allProducts.find((product) => product.id === productId)?.price ?? null)
      : null;
  }

  function getPlanForProduct(productId?: string | null) {
    return productId
      ? (plans.find((plan) =>
          Object.values(plan.creemProductIds ?? {}).includes(productId),
        ) ?? null)
      : null;
  }

  function resolveUpdateBehavior(
    update:
      | {
          kind: "plan-switch";
          plan: UIPlanEntry;
          productId?: string;
          freePlanId?: string;
          units?: number;
        }
      | { kind: "unit-update"; units: number },
  ): UpdateBehavior {
    if (typeof updateBehavior !== "function") return updateBehavior;

    const currentPlan = getPlanForProduct(localSubscriptionProductId);
    const intent: UpdateBehaviorIntent =
      update.kind === "plan-switch"
        ? {
            kind: "plan-switch",
            fromPlanId: activePlanId,
            toPlanId: update.plan.planId,
            fromPlan: currentPlan,
            toPlan: update.plan,
            fromProductId: localSubscriptionProductId,
            toProductId: update.productId ?? null,
            fromPrice: getProductPrice(localSubscriptionProductId),
            toPrice: getProductPrice(update.productId),
            currentUnits: localSubscribedUnits,
            targetUnits: update.units,
          }
        : {
            kind: "unit-update",
            fromPlanId: activePlanId,
            fromPlan: currentPlan,
            fromProductId: localSubscriptionProductId,
            toProductId: localSubscriptionProductId,
            fromPrice: getProductPrice(localSubscriptionProductId),
            toPrice: getProductPrice(localSubscriptionProductId),
            currentUnits: localSubscribedUnits,
            targetUnits: update.units,
          };
    return updateBehavior(intent);
  }

  const getFallbackSuccessUrl = (): string | undefined => {
    if (typeof window === "undefined") return undefined;
    return `${window.location.origin}${window.location.pathname}`;
  };

  const getPreferredTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  function formatGroupTitle(value: string) {
    return value
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getCyclesForGroup(groupId: string | null) {
    const targetPlans =
      groupItems.length > 1 && groupId
        ? plans.filter((plan) => plan.groupId === groupId)
        : plans;
    const cycles = new SvelteSet<RecurringCycle>();
    for (const plan of targetPlans) {
      for (const planCycle of plan.billingCycles ?? []) {
        cycles.add(planCycle);
      }
    }
    return Array.from(cycles);
  }

  function clampCycleForGroup(groupId: string | null) {
    const targetCycles = getCyclesForGroup(groupId);
    const requestedCycle = cycle ?? selectedCycle;
    if (
      targetCycles.length === 0 ||
      targetCycles.includes(requestedCycle)
    ) {
      return;
    }
    const nextCycle = targetCycles[0];
    if (!nextCycle) return;
    if (cycle == null) {
      selectedCycle = nextCycle;
    }
    onCycleChange?.(nextCycle);
  }

  function planTypeToCategory(
    type: SubscriptionPlanRegistration["type"],
    fallback?: PlanCatalogEntry,
  ) {
    if (type === "free") return "free";
    if (type === "enterprise") return "enterprise";
    return fallback?.category ?? "paid";
  }

  function planTypeToBillingType(
    type: SubscriptionPlanRegistration["type"],
    fallback?: PlanCatalogEntry,
  ) {
    if (type === "free" || type === "enterprise") return "custom";
    return fallback?.billingType ?? "recurring";
  }

  const startCheckout = async (productId: string, checkoutUnits?: number) => {
    if (resolvedOnBeforeCheckout) {
      const proceed = await resolvedOnBeforeCheckout({
        productId,
        units: checkoutUnits,
      });
      if (!proceed) return;
    }
    isActionLoading = true;
    actionError = null;
    try {
      const { url } = await client.action(checkoutLinkRef, {
        productId,
        ...(successUrl ? { successUrl } : {}),
        fallbackSuccessUrl: getFallbackSuccessUrl(),
        theme: getPreferredTheme(),
        ...(checkoutUnits != null ? { units: checkoutUnits } : {}),
      });
      // Suppress Convex client's beforeunload dialog during checkout redirect.
      // Convex registers via addEventListener, so onbeforeunload=null has no effect.
      // A capture-phase listener fires before non-capture listeners on the same target
      // in modern browsers, and stopImmediatePropagation() blocks all subsequent handlers.
      window.addEventListener(
        "beforeunload",
        (e) => {
          e.stopImmediatePropagation();
        },
        { capture: true, once: true },
      );
      window.location.href = url;
      window.location.href = url;
    } catch (error) {
      actionError = error instanceof Error
        ? error.message
        : resolvedI18n.labels.subscription.checkoutFailed;
    } finally {
      isActionLoading = false;
    }
  };

  const handlePricingCheckout = async (payload: {
    plan: UIPlanEntry;
    productId: string;
    units?: number;
  }) => {
    await startCheckout(payload.productId, payload.units);
  };

  const requestSwitchPlan = async (payload: {
    plan: UIPlanEntry;
    productId?: string;
    freePlanId?: string;
    units?: number;
  }) => {
    // Consent gate: onBeforePlanChange
    if (resolvedOnBeforePlanChange) {
      const proceed = await resolvedOnBeforePlanChange({
        fromPlanId: activePlanId,
        toPlanId: payload.plan.planId,
        productId: payload.productId,
        freePlanId: payload.freePlanId,
        units: payload.units,
      });
      if (!proceed) return;
    }
    // Consent gate: onBeforeFreePlanActivation
    if (resolvedOnBeforeFreePlanActivation && payload.plan.category === "free") {
      const proceed = await resolvedOnBeforeFreePlanActivation({
        freePlanId: payload.plan.planId,
      });
      if (!proceed) return;
    }
    pendingUpdate = { kind: "plan-switch", ...payload };
    updateDialogOpen = true;
  };

  const confirmUpdate = async () => {
    if (!updateRef || !pendingUpdate) return;
    const update = pendingUpdate;
    const selectedUpdateBehavior = resolveUpdateBehavior(update);
    const subId = matchedSubscription?.id;
    updateDialogOpen = false;
    pendingUpdate = null;
    actionError = null;
    try {
      if (update.kind === "plan-switch") {
        await client.mutation(
          updateRef,
          {
            ...(update.productId ? { productId: update.productId } : {}),
            ...(update.freePlanId ? { freePlanId: update.freePlanId } : {}),
            ...(subId ? { subscriptionId: subId } : {}),
            updateBehavior: selectedUpdateBehavior,
          },
          {
            optimisticUpdate: (store) => {
              const current = store.getQuery(billingUiModelRef, {});
              if (current) {
                const m = current as ConnectedBillingModel;
                if (selectedUpdateBehavior === "period-end") {
                  store.setQuery(billingUiModelRef, {}, {
                    ...m,
                    scheduledSubscriptionUpdates: [
                      ...(m.scheduledSubscriptionUpdates ?? []).filter(
                        (scheduled) => scheduled.subscriptionId !== subId,
                      ),
                      {
                        entityId: "",
                        subscriptionId: subId ?? "",
                        targetProductId: update.productId,
                        targetPlanId: update.freePlanId,
                        effectiveAt: matchedSubscription?.currentPeriodEnd ?? "",
                        status: "pending",
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      },
                    ],
                  });
                  return;
                }
                store.setQuery(
                  billingUiModelRef,
                  {},
                  {
                    ...m,
                    activeSubscriptions: (m.activeSubscriptions ?? []).map((s) =>
                      ownProductIds.has(s.productId)
                        ? { ...s, productId: update.productId ?? s.productId }
                        : s,
                    ),
                  },
                );
              }
            },
          },
        );
      } else {
        await client.mutation(
          updateRef,
          {
            units: update.units,
            ...(subId ? { subscriptionId: subId } : {}),
            updateBehavior: selectedUpdateBehavior,
          },
          {
            optimisticUpdate: (store) => {
              const current = store.getQuery(billingUiModelRef, {});
              if (current) {
                const m = current as ConnectedBillingModel;
                if (selectedUpdateBehavior === "period-end") {
                  store.setQuery(billingUiModelRef, {}, {
                    ...m,
                    scheduledSubscriptionUpdates: [
                      ...(m.scheduledSubscriptionUpdates ?? []).filter(
                        (scheduled) => scheduled.subscriptionId !== subId,
                      ),
                      {
                        entityId: "",
                        subscriptionId: subId ?? "",
                        targetUnits: update.units,
                        effectiveAt: matchedSubscription?.currentPeriodEnd ?? "",
                        status: "pending",
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      },
                    ],
                  });
                  return;
                }
                store.setQuery(
                  billingUiModelRef,
                  {},
                  {
                    ...m,
                    activeSubscriptions: (m.activeSubscriptions ?? []).map((s) =>
                      s.id === subId ? { ...s, units: update.units } : s,
                    ),
                  },
                );
              }
            },
          },
        );
      }
    } catch (error) {
      actionError = error instanceof Error
        ? error.message
        : update.kind === "plan-switch"
          ? resolvedI18n.labels.subscription.switchFailed
          : resolvedI18n.labels.subscription.unitUpdateFailed;
    }
  };

  const handleUpdateUnits = (payload: { units: number }) => {
    pendingUpdate = { kind: "unit-update", units: payload.units };
    updateDialogOpen = true;
  };

  const updateSummary = $derived.by(() => {
    if (!pendingUpdate) return null;
    const selectedUpdateBehavior = resolveUpdateBehavior(pendingUpdate);

    if (pendingUpdate.kind === "plan-switch") {
      const currentPlan = plans.find((p) => {
        const pids = p.creemProductIds ? Object.values(p.creemProductIds) : [];
        return localSubscriptionProductId != null && pids.includes(localSubscriptionProductId);
      });
      const currentTitle = currentPlan?.title ?? resolvedI18n.labels.subscription.currentPlan;
      const switchUnits =
        pendingUpdate.units ?? localSubscribedUnits ?? units ?? 1;
      const useUnitBreakdown =
        currentPlan?.pricingModel === "unit" ||
        pendingUpdate.plan.pricingModel === "unit";
      const currentBreakdown = useUnitBreakdown
        ? formatUnitPriceBreakdown(
            localSubscriptionProductId ?? undefined,
            allProducts,
            switchUnits,
            resolvedI18n.labels,
            resolvedI18n.formatCurrency,
          )
        : null;
      const newBreakdown = useUnitBreakdown
        ? pendingUpdate.productId
          ? formatUnitPriceBreakdown(
              pendingUpdate.productId,
              allProducts,
              switchUnits,
              resolvedI18n.labels,
              resolvedI18n.formatCurrency,
            )
          : null
        : null;
      const currentPrice =
        currentBreakdown?.total ??
        formatPriceWithInterval(
          localSubscriptionProductId ?? undefined,
          allProducts,
          resolvedI18n.formatCurrency,
        );
      const newPrice =
        newBreakdown?.total ??
        (pendingUpdate.productId
          ? formatPriceWithInterval(
              pendingUpdate.productId,
              allProducts,
              resolvedI18n.formatCurrency,
            )
          : null);

      return buildUpdateSummary({
        kind: "plan-switch",
        updateBehavior: selectedUpdateBehavior,
        currentLabel: currentPrice ? `${currentTitle} \u00b7 ${currentPrice}` : currentTitle,
        newLabel: newPrice
          ? `${pendingUpdate.plan.title ?? resolvedI18n.labels.subscription.newPlan} \u00b7 ${newPrice}`
          : (pendingUpdate.plan.title ?? resolvedI18n.labels.subscription.newPlan),
        currentCaption: currentBreakdown?.calculation ?? null,
        newCaption: newBreakdown?.calculation ?? null,
        currentPeriodEnd: matchedSubscription?.currentPeriodEnd,
        isTrialing: matchedSubscription?.status === "trialing",
        trialEnd: matchedSubscription?.trialEnd,
        labels: resolvedI18n.labels,
        formatDate: resolvedI18n.formatDate,
      });
    }

    const currentUnits = localSubscribedUnits ?? 1;
    const currentPrice = formatUnitPrice(
      localSubscriptionProductId ?? undefined,
      allProducts,
      currentUnits,
      resolvedI18n.labels,
      resolvedI18n.formatCurrency,
    );
    const newPrice = formatUnitPrice(
      localSubscriptionProductId ?? undefined,
      allProducts,
      pendingUpdate.units,
      resolvedI18n.labels,
      resolvedI18n.formatCurrency,
    );

    return buildUpdateSummary({
      kind: "unit-update",
      updateBehavior: selectedUpdateBehavior,
      currentLabel: currentPrice ?? resolvedI18n.labels.subscription.unitCount(currentUnits),
      newLabel: newPrice ?? resolvedI18n.labels.subscription.unitCount(pendingUpdate.units),
      currentPeriodEnd: matchedSubscription?.currentPeriodEnd,
      isTrialing: matchedSubscription?.status === "trialing",
      trialEnd: matchedSubscription?.trialEnd,
      labels: resolvedI18n.labels,
      formatDate: resolvedI18n.formatDate,
    });
  });

  const scheduledUpdateLabel = $derived.by(() => {
    if (!localScheduledUpdate) return null;
    if (localScheduledUpdate.targetProductId) {
      const targetPlan = getPlanForProduct(localScheduledUpdate.targetProductId);
      const price = formatPriceWithInterval(
        localScheduledUpdate.targetProductId,
        allProducts,
        resolvedI18n.formatCurrency,
      );
      const title = targetPlan?.title ?? resolvedI18n.labels.subscription.newPlan;
      return price ? `${title} \u00b7 ${price}` : title;
    }
    if (localScheduledUpdate.targetPlanId) {
      const targetPlan = plans.find(
        (plan) => plan.planId === localScheduledUpdate.targetPlanId,
      );
      return targetPlan?.title ?? localScheduledUpdate.targetPlanId;
    }
    if (localScheduledUpdate.targetUnits !== undefined) {
      return resolvedI18n.labels.subscription.unitCount(
        localScheduledUpdate.targetUnits,
      );
    }
    return null;
  });

  const confirmCancelSubscription = async () => {
    if (!cancelRef) return;
    const subId = matchedSubscription?.id;
    cancelDialogOpen = false;
    actionError = null;
    try {
      await client.mutation(
        cancelRef,
        {
          ...(subId ? { subscriptionId: subId } : {}),
        },
        {
          optimisticUpdate: (store) => {
            const current = store.getQuery(billingUiModelRef, {});
            if (current) {
              const m = current as ConnectedBillingModel;
              store.setQuery(
                billingUiModelRef,
                {},
                {
                  ...m,
                  activeSubscriptions: (m.activeSubscriptions ?? []).map((s) =>
                    ownProductIds.has(s.productId)
                      ? { ...s, cancelAtPeriodEnd: true }
                      : s,
                  ),
                },
              );
            }
          },
        },
      );
    } catch (error) {
      actionError = error instanceof Error
        ? error.message
        : resolvedI18n.labels.subscription.cancelFailed;
    }
  };

  const resumeSubscription = async () => {
    if (!resumeRef) return;
    const subId = matchedSubscription?.id;
    actionError = null;
    try {
      await client.mutation(
        resumeRef,
        {
          ...(subId ? { subscriptionId: subId } : {}),
        },
        {
          optimisticUpdate: (store) => {
            const current = store.getQuery(billingUiModelRef, {});
            if (current) {
              const m = current as ConnectedBillingModel;
              store.setQuery(
                billingUiModelRef,
                {},
                {
                  ...m,
                  activeSubscriptions: (m.activeSubscriptions ?? []).map((s) =>
                    ownProductIds.has(s.productId)
                      ? { ...s, cancelAtPeriodEnd: false, status: "active" }
                      : s,
                  ),
                },
              );
            }
          },
        },
      );
    } catch (error) {
      actionError = error instanceof Error
        ? error.message
        : resolvedI18n.labels.subscription.resumeFailed;
    }
  };

  const undoScheduledUpdate = async () => {
    if (!cancelScheduledUpdateRef) return;
    const subId = matchedSubscription?.id;
    actionError = null;
    try {
      await client.mutation(
        cancelScheduledUpdateRef,
        {
          ...(subId ? { subscriptionId: subId } : {}),
        },
        {
          optimisticUpdate: (store) => {
            const current = store.getQuery(billingUiModelRef, {});
            if (current) {
              const m = current as ConnectedBillingModel;
              store.setQuery(
                billingUiModelRef,
                {},
                {
                  ...m,
                  scheduledSubscriptionUpdates: (
                    m.scheduledSubscriptionUpdates ?? []
                  ).filter((update) => update.subscriptionId !== subId),
                  activeSubscriptions: (m.activeSubscriptions ?? []).map((s) =>
                    s.id === subId ? { ...s, cancelAtPeriodEnd: false } : s,
                  ),
                },
              );
            }
          },
        },
      );
    } catch (error) {
      actionError = error instanceof Error
        ? error.message
        : resolvedI18n.labels.subscription.resumeFailed;
    }
  };

  const openCancelDialog = () => {
    cancelDialogOpen = true;
  };
</script>

<section class={unstyled ? className : `creem-base:space-y-4 ${className}`}>
  {#if actionError}
    <div
      class={unstyled
        ? ""
        : "creem-base:rounded-lg creem-base:border creem-base:border-red-300 creem-base:bg-red-50 creem-base:px-3 creem-base:py-2 creem-base:text-sm creem-base:text-red-700"}
    >
      {actionError}
    </div>
  {/if}

  {#if !model}
    <p class={unstyled ? "" : "creem-base:text-sm creem-base:text-zinc-500"}>{resolvedI18n.labels.subscription.loadingBillingModel}</p>
  {:else}
    {#if ownsActiveSubscription && snapshot}
      <ScheduledChangeBanner
        cancelAtPeriodEnd={localCancelAtPeriodEnd}
        currentPeriodEnd={localCurrentPeriodEnd}
        scheduledUpdate={localScheduledUpdate}
        isLoading={isActionLoading}
        scheduledUpdateLabel={scheduledUpdateLabel}
        onUndoUpdate={cancelScheduledUpdateRef && canResume
          ? undoScheduledUpdate
          : undefined}
        onResume={resumeRef && canResume ? resumeSubscription : undefined}
        labels={resolvedI18n.labels}
        formatDate={resolvedI18n.formatDate}
      />
    {/if}
    <PaymentWarningBanner labels={resolvedI18n.labels} />

    {#if groupSelector === "auto" && groupItems.length > 1}
      <div class={unstyled ? "" : "creem-base:flex creem-base:justify-center"}>
        <SegmentGroup
          items={groupItems}
          value={activeGroupId}
          {unstyled}
          onValueChange={(value) => {
            selectedGroupId = value;
            onGroupChange?.(value);
          }}
        />
      </div>
    {/if}

    {#if children}
      {@render children()}
    {:else}
      <PricingSection
        plans={visiblePlans}
        {activePlanId}
        selectedCycle={effectiveCycle}
        products={allProducts}
        subscriptionProductId={localSubscriptionProductId}
        subscriptionStatus={localSubscriptionState}
        subscriptionTrialEnd={matchedSubscription?.trialEnd ?? null}
        {units}
        showUnitPicker={showUnitPicker}
        {twoColumnLayout}
        subscribedUnits={localSubscribedUnits}
        isGroupSubscribed={ownsActiveSubscription}
        onCycleChange={(cycle) => {
          contextValue.setCycle(cycle);
        }}
        showCycleToggle={intervalSelector === "auto"}
        disableCheckout={!canCheckout}
        disableSwitch={!canChange}
        disableUnits={!canUpdateUnits}
        onCheckout={canCheckout ? handlePricingCheckout : undefined}
        onSwitchPlan={updateRef && canChange ? requestSwitchPlan : undefined}
        onUpdateUnits={updateRef && canUpdateUnits
          ? handleUpdateUnits
          : undefined}
        onCancelSubscription={cancelRef &&
        canCancel &&
        ownsActiveSubscription &&
        !localCancelAtPeriodEnd
          ? openCancelDialog
          : undefined}
        labels={resolvedI18n.labels}
        formatCurrency={resolvedI18n.formatCurrency}
      />
    {/if}

    <Dialog.Root
      open={cancelDialogOpen}
      onOpenChange={(details: { open: boolean }) => {
        cancelDialogOpen = details.open;
      }}
    >
      <Portal>
        <Dialog.Backdrop class="dialog-backdrop" />
        <Dialog.Positioner class="dialog-positioner">
          <Dialog.Content class="dialog-content">
            <Dialog.CloseTrigger
              class="icon-button-ghost-sm absolute right-2 top-2"
              aria-label={resolvedI18n.labels.accessibility.closeDialog}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                class="h-4 w-4"
              >
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </Dialog.CloseTrigger>
            <Dialog.Title class="dialog-title">
              {resolvedI18n.labels.subscription.dialogs.cancelTitle}
            </Dialog.Title>
            <Dialog.Description class="dialog-description">
              {resolvedI18n.labels.subscription.dialogs.cancelDescription}
            </Dialog.Description>
            <div class="dialog-actions">
              <button
                type="button"
                class="dialog-action-danger"
                onclick={() => confirmCancelSubscription()}
              >
                {resolvedI18n.labels.subscription.dialogs.confirmCancel}
              </button>
              <Dialog.CloseTrigger class="button-faded h-8 w-full">
                {resolvedI18n.labels.subscription.dialogs.keepSubscription}
              </Dialog.CloseTrigger>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>

    <Dialog.Root
      open={updateDialogOpen}
      onOpenChange={(details: { open: boolean }) => {
        updateDialogOpen = details.open;
        if (!details.open) pendingUpdate = null;
      }}
    >
      <Portal>
        <Dialog.Backdrop class="dialog-backdrop" />
        <Dialog.Positioner class="dialog-positioner">
          <Dialog.Content class="dialog-content">
            <Dialog.CloseTrigger
              class="icon-button-ghost-sm absolute right-2 top-2"
              aria-label={resolvedI18n.labels.accessibility.closeDialog}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                class="h-4 w-4"
              >
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </Dialog.CloseTrigger>
            <Dialog.Title class="dialog-title">
              {updateSummary?.title}
            </Dialog.Title>
            {#if updateSummary}
              <div class="my-3 flex flex-col gap-1 rounded-lg bg-surface-subtle px-3 py-2.5">
                <span class="label-m text-foreground-muted">
                  {updateSummary.currentLabel}
                </span>
                {#if updateSummary.currentCaption}
                  <span class="body-s text-foreground-placeholder">
                    {updateSummary.currentCaption}
                  </span>
                {/if}
                <span class="body-s text-foreground-placeholder">→</span>
                <span class="label-m text-foreground-default">
                  {updateSummary.newLabel}
                </span>
                {#if updateSummary.newCaption}
                  <span class="body-s text-foreground-placeholder">
                    {updateSummary.newCaption}
                  </span>
                {/if}
              </div>
              <Dialog.Description class="dialog-description">
                {updateSummary.description}
                {#if updateSummary.dateNote}
                  {` ${updateSummary.dateNote}`}
                {/if}
              </Dialog.Description>
            {/if}
            <div class="dialog-actions">
              <button
                type="button"
                class="button-filled h-8 w-full"
                onclick={() => confirmUpdate()}
              >
                {updateSummary?.confirmLabel ?? resolvedI18n.labels.common.confirm}
              </button>
              <Dialog.CloseTrigger class="button-faded h-8 w-full">
                {resolvedI18n.labels.common.cancel}
              </Dialog.CloseTrigger>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  {/if}
</section>
