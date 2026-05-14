import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type PropsWithChildren,
} from "react";
import { useQuery, useConvex } from "convex/react";
import { Dialog } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";

import { PricingSection } from "../primitives/PricingSection.js";
import { SegmentGroup } from "../primitives/SegmentGroup.js";
import { PaymentWarningBanner } from "../primitives/PaymentWarningBanner.js";
import { ScheduledChangeBanner } from "../primitives/ScheduledChangeBanner.js";

import { SubscriptionContext } from "./subscriptionContext.js";
import { pendingCheckout } from "../../core/pendingCheckout.js";

import type {
  PlanCatalog,
  PlanCatalogEntry,
  UIPlanEntry,
  RecurringCycle,
  UpdateBehavior,
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
} from "../shared.js";
import {
  requireCreemConvexApi,
  useCreemConvex,
} from "../CreemConvexProvider.js";
import type {
  BillingPermissions,
  CheckoutIntent,
  PlanChangeIntent,
  ConnectedBillingModel,
  SubscriptionGroupRegistration,
  SubscriptionPlanRegistration,
} from "./types.js";

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

const formatGroupTitle = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const planTypeToCategory = (
  type: SubscriptionPlanRegistration["type"],
  fallback?: PlanCatalogEntry,
) => {
  if (type === "free") return "free";
  if (type === "enterprise") return "enterprise";
  return fallback?.category ?? "paid";
};

const planTypeToBillingType = (
  type: SubscriptionPlanRegistration["type"],
  fallback?: PlanCatalogEntry,
) => {
  if (type === "free" || type === "enterprise") return "custom";
  return fallback?.billingType ?? "recurring";
};

export const SubscriptionRoot = ({
  catalog,
  plans: planIds,
  groups,
  defaultGroup,
  group,
  onGroupChange,
  groupSelector = "auto",
  defaultCycle,
  cycle,
  onCycleChange,
  intervalSelector = "auto",
  permissions,
  className = "",
  successUrl,
  units,
  showUnitPicker = false,
  twoColumnLayout = false,
  updateBehavior = "proration-charge-immediately",
  unstyled = false,
  onBeforeCheckout,
  onBeforePlanChange,
  onBeforeFreePlanActivation,
  labels: labelOverrides,
  i18n,
  children,
}: PropsWithChildren<{
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
  className?: string;
  successUrl?: string;
  units?: number;
  showUnitPicker?: boolean;
  twoColumnLayout?: boolean;
  updateBehavior?: UpdateBehavior;
  unstyled?: boolean;
  onBeforeCheckout?: (intent: CheckoutIntent) => Promise<boolean> | boolean;
  onBeforePlanChange?: (intent: PlanChangeIntent) => Promise<boolean> | boolean;
  onBeforeFreePlanActivation?: (intent: {
    freePlanId: string;
  }) => Promise<boolean> | boolean;
  labels?: BillingLabelOverrides;
  i18n?: BillingI18n;
}>) => {
  const provider = useCreemConvex();
  const resolvedApi = requireCreemConvexApi("Subscription.Root", provider);
  const resolvedCatalog = catalog ?? provider?.catalog;
  const resolvedDefaultCycle =
    defaultCycle ?? provider?.defaultCycle ?? "every-month";
  const resolvedPermissions = permissions ?? provider?.permissions;
  const resolvedOnBeforeCheckout =
    onBeforeCheckout ?? provider?.onBeforeCheckout;
  const resolvedOnBeforePlanChange =
    onBeforePlanChange ?? provider?.onBeforePlanChange;
  const resolvedOnBeforeFreePlanActivation =
    onBeforeFreePlanActivation ?? provider?.onBeforeFreePlanActivation;
  const resolvedI18n = useMemo(() => {
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
  }, [provider?.i18n, i18n, labelOverrides]);

  const canChange = resolvedPermissions?.canChangeSubscription !== false;
  const canCancel = resolvedPermissions?.canCancelSubscription !== false;
  const canResume = resolvedPermissions?.canResumeSubscription !== false;

  const client = useConvex();

  const billingUiModelRef = resolvedApi.uiModel;
  const checkoutLinkRef = resolvedApi.checkouts.create;
  const updateRef = resolvedApi.subscriptions?.update;
  const cancelRef = resolvedApi.subscriptions?.cancel;
  const resumeRef = resolvedApi.subscriptions?.resume;

  const modelRaw = useQuery(billingUiModelRef, {});
  const model = (modelRaw ?? null) as ConnectedBillingModel | null;

  const [selectedCycle, setSelectedCycle] =
    useState<RecurringCycle>(resolvedDefaultCycle);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    defaultGroup ?? null,
  );
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<
    | {
        kind: "plan-switch";
        plan: UIPlanEntry;
        productId: string;
        units?: number;
      }
    | { kind: "unit-update"; units: number }
    | null
  >(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [registeredPlans, setRegisteredPlans] = useState<
    SubscriptionPlanRegistration[]
  >([]);

  const registerPlan = useCallback((plan: SubscriptionPlanRegistration) => {
    setRegisteredPlans((prev) => [
      ...prev.filter((c) => c.planId !== plan.planId),
      plan,
    ]);
    return () => {
      setRegisteredPlans((prev) =>
        prev.filter((c) => c.planId !== plan.planId),
      );
    };
  }, []);

  const allProducts = useMemo(
    () => model?.allProducts ?? [],
    [model?.allProducts],
  );

  const normalizedCatalog = useMemo(
    () => normalizePlanCatalog(resolvedCatalog),
    [resolvedCatalog],
  );

  const catalogRegistrations = useMemo<SubscriptionPlanRegistration[]>(() => {
    const ids =
      groups && groups.length > 0
        ? groups.flatMap((entry) => entry.plans)
        : (planIds ?? []);
    return ids.flatMap((planId) => {
      const groupEntry = groups?.find((entry) => entry.plans.includes(planId));
      return [
        {
          planId,
          groupId: groupEntry?.value,
          groupTitle: groupEntry?.label,
        },
      ];
    });
  }, [groups, planIds]);

  const plans = useMemo<UIPlanEntry[]>(() => {
    const registrations = [...catalogRegistrations, ...registeredPlans];
    return registrations.map((plan) => {
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
        pricingModel:
          plan.type === "unit-based"
            ? "unit"
            : (catalogEntry?.pricingModel ?? "flat"),
        groupId: plan.groupId ?? catalogEntry?.groupId,
        groupTitle: plan.groupTitle ?? catalogEntry?.groupTitle,
        title:
          plan.title ??
          catalogEntry?.title ??
          firstProduct?.name ??
          plan.planId.charAt(0).toUpperCase() + plan.planId.slice(1),
        description:
          plan.description ??
          catalogEntry?.description ??
          firstProduct?.description ??
          undefined,
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
  }, [allProducts, catalogRegistrations, normalizedCatalog, registeredPlans]);

  const groupItems = useMemo(() => {
    if (groups && groups.length > 0) {
      return groups.map((entry) => ({
        value: entry.value,
        label: entry.label,
      }));
    }
    const inferredGroups = new Map<string, string>();
    for (const plan of plans) {
      if (!plan.groupId) continue;
      if (!inferredGroups.has(plan.groupId)) {
        inferredGroups.set(
          plan.groupId,
          plan.groupTitle ?? formatGroupTitle(plan.groupId),
        );
      }
    }
    return Array.from(inferredGroups, ([value, label]) => ({ value, label }));
  }, [groups, plans]);

  const requestedGroupId = group ?? selectedGroupId ?? defaultGroup ?? null;
  const activeGroupId =
    groupItems.length > 1 &&
    requestedGroupId &&
    groupItems.some((item) => item.value === requestedGroupId)
      ? requestedGroupId
      : (groupItems[0]?.value ?? null);

  const visiblePlans = useMemo(() => {
    if (groupItems.length <= 1 || !activeGroupId) return plans;
    return plans.filter((plan) => plan.groupId === activeGroupId);
  }, [activeGroupId, groupItems.length, plans]);

  const availableCycles = useMemo(() => {
    const cycles = new Set<RecurringCycle>();
    for (const plan of visiblePlans) {
      for (const planCycle of plan.billingCycles ?? []) {
        cycles.add(planCycle);
      }
    }
    return Array.from(cycles);
  }, [visiblePlans]);
  const effectiveCycle = useMemo(() => {
    const requestedCycle = cycle ?? selectedCycle;
    if (
      availableCycles.length === 0 ||
      availableCycles.includes(requestedCycle)
    ) {
      return requestedCycle;
    }
    return availableCycles[0] ?? requestedCycle;
  }, [availableCycles, cycle, selectedCycle]);

  const getCyclesForGroup = useCallback(
    (groupId: string | null) => {
      const targetPlans =
        groupItems.length > 1 && groupId
          ? plans.filter((plan) => plan.groupId === groupId)
          : plans;
      const cycles = new Set<RecurringCycle>();
      for (const plan of targetPlans) {
        for (const planCycle of plan.billingCycles ?? []) {
          cycles.add(planCycle);
        }
      }
      return Array.from(cycles);
    },
    [groupItems.length, plans],
  );

  const clampCycleForGroup = useCallback(
    (groupId: string | null) => {
      const targetCycles = getCyclesForGroup(groupId);
      const requestedCycle = cycle ?? selectedCycle;
      if (targetCycles.length === 0 || targetCycles.includes(requestedCycle)) {
        return;
      }
      const nextCycle = targetCycles[0];
      if (!nextCycle) return;
      if (cycle == null) {
        setSelectedCycle(nextCycle);
      }
      onCycleChange?.(nextCycle);
    },
    [cycle, getCyclesForGroup, onCycleChange, selectedCycle],
  );

  const handleCycleChange = useCallback(
    (next: RecurringCycle) => {
      const nextEffectiveCycle =
        availableCycles.length === 0 || availableCycles.includes(next)
          ? next
          : (availableCycles[0] ?? next);
      setSelectedCycle(nextEffectiveCycle);
      onCycleChange?.(nextEffectiveCycle);
    },
    [availableCycles, onCycleChange],
  );

  const handleGroupChange = useCallback(
    (next: string) => {
      clampCycleForGroup(next);
      setSelectedGroupId(next);
      onGroupChange?.(next);
    },
    [clampCycleForGroup, onGroupChange],
  );

  // Collect all product IDs that belong to plans in THIS component instance
  const ownProductIds = useMemo(() => {
    const ids = new Set<string>();
    for (const plan of plans) {
      if (plan.creemProductIds) {
        for (const pid of Object.values(plan.creemProductIds)) {
          if (pid) ids.add(pid);
        }
      }
    }
    return ids;
  }, [plans]);

  // Find the subscription from activeSubscriptions that belongs to THIS component
  const matchedSubscription = useMemo(() => {
    const subs = model?.activeSubscriptions;
    if (!subs || ownProductIds.size === 0) return null;
    return subs.find((s) => ownProductIds.has(s.productId)) ?? null;
  }, [model?.activeSubscriptions, ownProductIds]);

  const ownsActiveSubscription = matchedSubscription != null;
  const localSubscriptionProductId = matchedSubscription?.productId ?? null;
  const localCancelAtPeriodEnd =
    matchedSubscription?.cancelAtPeriodEnd ?? false;
  const localCurrentPeriodEnd = matchedSubscription?.currentPeriodEnd ?? null;
  const localSubscriptionState = matchedSubscription?.status ?? null;
  const localSubscribedUnits = matchedSubscription?.units ?? null;

  const snapshot = model?.billingSnapshot ?? null;

  const canCheckout =
    !model?.user && resolvedOnBeforeCheckout != null
      ? true
      : resolvedPermissions?.canCheckout !== false;

  const canUpdateUnits =
    !model?.user && resolvedOnBeforeCheckout != null
      ? true
      : resolvedPermissions?.canUpdateUnits !== false;

  const activePlanId = useMemo(() => {
    if (!model) return null;
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
    if (model.user) {
      const freePlan = plans.find((p) => p.category === "free");
      if (freePlan) return freePlan.planId;
    }
    return null;
  }, [model, localSubscriptionProductId, plans]);

  const startCheckout = useCallback(
    async (productId: string, checkoutUnits?: number) => {
      if (resolvedOnBeforeCheckout) {
        const proceed = await resolvedOnBeforeCheckout({
          productId,
          units: checkoutUnits,
        });
        if (!proceed) return;
      }
      setIsActionLoading(true);
      setActionError(null);
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
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : resolvedI18n.labels.subscription.checkoutFailed,
        );
      } finally {
        setIsActionLoading(false);
      }
    },
    [
      client,
      checkoutLinkRef,
      successUrl,
      resolvedOnBeforeCheckout,
      resolvedI18n.labels.subscription.checkoutFailed,
    ],
  );

  // Pending checkout resume after auth
  const pendingCheckoutHandled = useRef(false);
  useEffect(() => {
    if (!model?.user || pendingCheckoutHandled.current) return;
    pendingCheckoutHandled.current = true;
    const pending = pendingCheckout.load();
    if (!pending) return;
    if ((model.activeSubscriptions ?? []).length > 0) {
      pendingCheckout.clear();
      return;
    }
    const resumeCheckout = setTimeout(() => {
      void startCheckout(pending.productId, pending.units);
    }, 0);
    return () => clearTimeout(resumeCheckout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model?.user]);

  const handlePricingCheckout = useCallback(
    async (payload: {
      plan: UIPlanEntry;
      productId: string;
      units?: number;
    }) => {
      await startCheckout(payload.productId, payload.units);
    },
    [startCheckout],
  );

  const requestSwitchPlan = useCallback(
    async (payload: {
      plan: UIPlanEntry;
      productId: string;
      units?: number;
    }) => {
      // Consent gate: onBeforePlanChange
      if (resolvedOnBeforePlanChange) {
        const proceed = await resolvedOnBeforePlanChange({
          fromPlanId: activePlanId,
          toPlanId: payload.plan.planId,
          productId: payload.productId,
          units: payload.units,
        });
        if (!proceed) return;
      }
      // Consent gate: onBeforeFreePlanActivation
      if (
        resolvedOnBeforeFreePlanActivation &&
        payload.plan.category === "free"
      ) {
        const proceed = await resolvedOnBeforeFreePlanActivation({
          freePlanId: payload.plan.planId,
        });
        if (!proceed) return;
      }
      setPendingUpdate({ kind: "plan-switch", ...payload });
      setUpdateDialogOpen(true);
    },
    [
      activePlanId,
      resolvedOnBeforePlanChange,
      resolvedOnBeforeFreePlanActivation,
    ],
  );

  const confirmUpdate = useCallback(async () => {
    if (!updateRef || !pendingUpdate) return;
    const update = pendingUpdate;
    const subId = matchedSubscription?.id;
    setUpdateDialogOpen(false);
    setPendingUpdate(null);
    setActionError(null);
    try {
      if (update.kind === "plan-switch") {
        await client.mutation(
          updateRef,
          {
            productId: update.productId,
            ...(subId ? { subscriptionId: subId } : {}),
            updateBehavior,
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
                    activeSubscriptions: (m.activeSubscriptions ?? []).map(
                      (s) =>
                        ownProductIds.has(s.productId)
                          ? { ...s, productId: update.productId }
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
            updateBehavior,
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
                    activeSubscriptions: (m.activeSubscriptions ?? []).map(
                      (s) =>
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
      setActionError(
        error instanceof Error
          ? error.message
          : update.kind === "plan-switch"
            ? resolvedI18n.labels.subscription.switchFailed
            : resolvedI18n.labels.subscription.unitUpdateFailed,
      );
    }
  }, [
    updateRef,
    pendingUpdate,
    matchedSubscription,
    client,
    billingUiModelRef,
    ownProductIds,
    updateBehavior,
    resolvedI18n.labels.subscription.switchFailed,
    resolvedI18n.labels.subscription.unitUpdateFailed,
  ]);

  const handleUpdateUnits = useCallback((payload: { units: number }) => {
    setPendingUpdate({ kind: "unit-update", units: payload.units });
    setUpdateDialogOpen(true);
  }, []);

  const updateSummary = useMemo(() => {
    if (!pendingUpdate) return null;

    if (pendingUpdate.kind === "plan-switch") {
      const currentPlan = plans.find((p) => {
        const pids = p.creemProductIds ? Object.values(p.creemProductIds) : [];
        return (
          localSubscriptionProductId != null &&
          pids.includes(localSubscriptionProductId)
        );
      });
      const currentTitle =
        currentPlan?.title ?? resolvedI18n.labels.subscription.currentPlan;
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
        ? formatUnitPriceBreakdown(
            pendingUpdate.productId,
            allProducts,
            switchUnits,
            resolvedI18n.labels,
            resolvedI18n.formatCurrency,
          )
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
        formatPriceWithInterval(
          pendingUpdate.productId,
          allProducts,
          resolvedI18n.formatCurrency,
        );

      return buildUpdateSummary({
        kind: "plan-switch",
        updateBehavior,
        currentLabel: currentPrice
          ? `${currentTitle} \u00b7 ${currentPrice}`
          : currentTitle,
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
      updateBehavior,
      currentLabel:
        currentPrice ?? resolvedI18n.labels.subscription.unitCount(currentUnits),
      newLabel:
        newPrice ??
        resolvedI18n.labels.subscription.unitCount(pendingUpdate.units),
      currentPeriodEnd: matchedSubscription?.currentPeriodEnd,
      isTrialing: matchedSubscription?.status === "trialing",
      trialEnd: matchedSubscription?.trialEnd,
      labels: resolvedI18n.labels,
      formatDate: resolvedI18n.formatDate,
    });
  }, [
    pendingUpdate,
    plans,
    localSubscriptionProductId,
    allProducts,
    localSubscribedUnits,
    units,
    updateBehavior,
    matchedSubscription,
    resolvedI18n,
  ]);

  const confirmCancelSubscription = useCallback(async () => {
    if (!cancelRef) return;
    const subId = matchedSubscription?.id;
    setCancelDialogOpen(false);
    setActionError(null);
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
      setActionError(
        error instanceof Error
          ? error.message
          : resolvedI18n.labels.subscription.cancelFailed,
      );
    }
  }, [
    cancelRef,
    matchedSubscription,
    client,
    billingUiModelRef,
    ownProductIds,
    resolvedI18n.labels.subscription.cancelFailed,
  ]);

  const resumeSubscription = useCallback(async () => {
    if (!resumeRef) return;
    const subId = matchedSubscription?.id;
    setActionError(null);
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
      setActionError(
        error instanceof Error
          ? error.message
          : resolvedI18n.labels.subscription.resumeFailed,
      );
    }
  }, [
    resumeRef,
    matchedSubscription,
    client,
    billingUiModelRef,
    ownProductIds,
    resolvedI18n.labels.subscription.resumeFailed,
  ]);

  const openCancelDialog = useCallback(() => {
    setCancelDialogOpen(true);
  }, []);

  const contextValue = useMemo(
    () => ({
      registerPlan,
      getPlan: (planId: string) =>
        plans.find((candidate) => candidate.planId === planId),
      isPlanVisible: (planId: string) =>
        visiblePlans.some((candidate) => candidate.planId === planId),
      selectedCycle: effectiveCycle,
      activePlanId,
      products: allProducts,
      subscriptionProductId: localSubscriptionProductId,
      subscriptionStatus: localSubscriptionState,
      subscriptionTrialEnd: matchedSubscription?.trialEnd ?? null,
      subscribedUnits: localSubscribedUnits,
      units,
      showUnitPicker,
      isGroupSubscribed: ownsActiveSubscription,
      disableCheckout: !canCheckout,
      disableSwitch: !canChange,
      disableUnits: !canUpdateUnits,
      unstyled,
      labels: resolvedI18n.labels,
      formatCurrency: resolvedI18n.formatCurrency,
      formatDate: resolvedI18n.formatDate,
      checkout: handlePricingCheckout,
      switchPlan: updateRef && canChange ? requestSwitchPlan : undefined,
      updateUnits: updateRef && canUpdateUnits ? handleUpdateUnits : undefined,
      cancelSubscription:
        cancelRef &&
        canCancel &&
        ownsActiveSubscription &&
        !localCancelAtPeriodEnd
          ? openCancelDialog
          : undefined,
      groupItems,
      activeGroupId,
      setGroup: handleGroupChange,
      availableCycles,
      setCycle: handleCycleChange,
    }),
    [
      registerPlan,
      plans,
      visiblePlans,
      effectiveCycle,
      activePlanId,
      allProducts,
      localSubscriptionProductId,
      localSubscriptionState,
      matchedSubscription,
      localSubscribedUnits,
      units,
      showUnitPicker,
      ownsActiveSubscription,
      canCheckout,
      canChange,
      canUpdateUnits,
      unstyled,
      resolvedI18n,
      handlePricingCheckout,
      updateRef,
      requestSwitchPlan,
      handleUpdateUnits,
      cancelRef,
      canCancel,
      localCancelAtPeriodEnd,
      openCancelDialog,
      groupItems,
      activeGroupId,
      handleGroupChange,
      availableCycles,
      handleCycleChange,
    ],
  );

  return (
    <SubscriptionContext.Provider value={contextValue}>
      <section
        className={unstyled ? className : `creem-base:space-y-4 ${className}`}
      >
        {actionError && (
          <div
            className={
              unstyled
                ? ""
                : "creem-base:rounded-lg creem-base:border creem-base:border-red-300 creem-base:bg-red-50 creem-base:px-3 creem-base:py-2 creem-base:text-sm creem-base:text-red-700"
            }
          >
            {actionError}
          </div>
        )}

        {!model ? (
          <p
            className={
              unstyled ? "" : "creem-base:text-sm creem-base:text-zinc-500"
            }
          >
            {resolvedI18n.labels.subscription.loadingBillingModel}
          </p>
        ) : (
          <>
            {ownsActiveSubscription && snapshot && (
              <ScheduledChangeBanner
                snapshot={{
                  ...snapshot,
                  metadata: {
                    ...snapshot.metadata,
                    cancelAtPeriodEnd: localCancelAtPeriodEnd,
                    currentPeriodEnd: localCurrentPeriodEnd,
                  },
                }}
                isLoading={isActionLoading}
                onResume={
                  resumeRef && canResume ? resumeSubscription : undefined
                }
                labels={resolvedI18n.labels}
                formatDate={resolvedI18n.formatDate}
              />
            )}
            <PaymentWarningBanner
              snapshot={snapshot}
              labels={resolvedI18n.labels}
            />

            {groupSelector === "auto" && groupItems.length > 1 && (
              <div
                className={
                  unstyled ? "" : "creem-base:flex creem-base:justify-center"
                }
              >
                <SegmentGroup
                  items={groupItems}
                  value={activeGroupId}
                  unstyled={unstyled}
                  onValueChange={handleGroupChange}
                />
              </div>
            )}

            {children ? (
              children
            ) : (
              <PricingSection
                plans={visiblePlans}
                snapshot={snapshot ? { ...snapshot, activePlanId } : null}
                selectedCycle={effectiveCycle}
                products={allProducts}
                subscriptionProductId={localSubscriptionProductId}
                subscriptionStatus={localSubscriptionState}
                subscriptionTrialEnd={matchedSubscription?.trialEnd ?? null}
                units={units}
                showUnitPicker={showUnitPicker}
                showCycleToggle={intervalSelector === "auto"}
                twoColumnLayout={twoColumnLayout}
                subscribedUnits={localSubscribedUnits}
                isGroupSubscribed={ownsActiveSubscription}
                onCycleChange={
                  intervalSelector === "external"
                    ? undefined
                    : handleCycleChange
                }
                disableCheckout={!canCheckout}
                disableSwitch={!canChange}
                disableUnits={!canUpdateUnits}
                onCheckout={canCheckout ? handlePricingCheckout : undefined}
                onSwitchPlan={
                  updateRef && canChange ? requestSwitchPlan : undefined
                }
                onUpdateUnits={
                  updateRef && canUpdateUnits ? handleUpdateUnits : undefined
                }
                onCancelSubscription={
                  cancelRef &&
                  canCancel &&
                  ownsActiveSubscription &&
                  !localCancelAtPeriodEnd
                    ? openCancelDialog
                    : undefined
                }
                labels={resolvedI18n.labels}
                formatCurrency={resolvedI18n.formatCurrency}
              />
            )}

            {/* Cancel Dialog */}
            <Dialog.Root
              open={cancelDialogOpen}
              onOpenChange={(details: { open: boolean }) =>
                setCancelDialogOpen(details.open)
              }
            >
              <Portal>
                <Dialog.Backdrop className="dialog-backdrop" />
                <Dialog.Positioner className="dialog-positioner">
                  <Dialog.Content className="dialog-content">
                    <Dialog.CloseTrigger
                      className="icon-button-ghost-sm absolute right-2 top-2"
                      aria-label={resolvedI18n.labels.accessibility.closeDialog}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4"
                      >
                        <path
                          d="M18 6L6 18M6 6L18 18"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Dialog.CloseTrigger>
                    <Dialog.Title className="dialog-title">
                      {resolvedI18n.labels.subscription.dialogs.cancelTitle}
                    </Dialog.Title>
                    <Dialog.Description className="dialog-description">
                      {resolvedI18n.labels.subscription.dialogs.cancelDescription}
                    </Dialog.Description>
                    <div className="dialog-actions">
                      <button
                        type="button"
                        className="dialog-action-danger"
                        onClick={confirmCancelSubscription}
                      >
                        {resolvedI18n.labels.subscription.dialogs.confirmCancel}
                      </button>
                      <Dialog.CloseTrigger className="button-faded h-8 w-full">
                        {resolvedI18n.labels.subscription.dialogs.keepSubscription}
                      </Dialog.CloseTrigger>
                    </div>
                  </Dialog.Content>
                </Dialog.Positioner>
              </Portal>
            </Dialog.Root>

            {/* Update Confirmation Dialog */}
            <Dialog.Root
              open={updateDialogOpen}
              onOpenChange={(details: { open: boolean }) => {
                setUpdateDialogOpen(details.open);
                if (!details.open) setPendingUpdate(null);
              }}
            >
              <Portal>
                <Dialog.Backdrop className="dialog-backdrop" />
                <Dialog.Positioner className="dialog-positioner">
                  <Dialog.Content className="dialog-content">
                    <Dialog.CloseTrigger
                      className="icon-button-ghost-sm absolute right-2 top-2"
                      aria-label={resolvedI18n.labels.accessibility.closeDialog}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4"
                      >
                        <path
                          d="M18 6L6 18M6 6L18 18"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Dialog.CloseTrigger>
                    <Dialog.Title className="dialog-title">
                      {updateSummary?.title}
                    </Dialog.Title>
                    {updateSummary && (
                      <>
                        <div className="my-3 flex flex-col gap-1 rounded-lg bg-surface-subtle px-3 py-2.5">
                          <span className="label-m text-foreground-muted">
                            {updateSummary.currentLabel}
                          </span>
                          {updateSummary.currentCaption && (
                            <span className="body-s text-foreground-placeholder">
                              {updateSummary.currentCaption}
                            </span>
                          )}
                          <span className="body-s text-foreground-placeholder">
                            {"\u2192"}
                          </span>
                          <span className="label-m text-foreground-default">
                            {updateSummary.newLabel}
                          </span>
                          {updateSummary.newCaption && (
                            <span className="body-s text-foreground-placeholder">
                              {updateSummary.newCaption}
                            </span>
                          )}
                        </div>
                        <Dialog.Description className="dialog-description">
                          {updateSummary.description}
                          {updateSummary.dateNote && (
                            <> {updateSummary.dateNote}</>
                          )}
                        </Dialog.Description>
                      </>
                    )}
                    <div className="dialog-actions">
                      <button
                        type="button"
                        className="button-filled h-8 w-full"
                        onClick={confirmUpdate}
                      >
                        {updateSummary?.confirmLabel ??
                          resolvedI18n.labels.common.confirm}
                      </button>
                      <Dialog.CloseTrigger className="button-faded h-8 w-full">
                        {resolvedI18n.labels.common.cancel}
                      </Dialog.CloseTrigger>
                    </div>
                  </Dialog.Content>
                </Dialog.Positioner>
              </Portal>
            </Dialog.Root>
          </>
        )}
      </section>
    </SubscriptionContext.Provider>
  );
};
