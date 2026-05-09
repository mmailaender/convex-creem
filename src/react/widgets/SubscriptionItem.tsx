import { useContext, useEffect, useMemo, type PropsWithChildren } from "react";
import type { RecurringCycle } from "../../core/types.js";
import { SubscriptionContext } from "./subscriptionContext.js";
import { SubscriptionItemContext } from "./subscriptionItemContext.js";
import { PricingCard } from "../primitives/PricingCard.js";
import { formatPriceWithInterval, resolveProductIdForPlan } from "../shared.js";

type BaseProps = {
  planId?: string;
  title?: string;
  description?: string;
  groupId?: string;
  groupTitle?: string;
  recommended?: boolean;
  className?: string;
  class?: string;
};

type Props =
  | (BaseProps & {
      type?: undefined;
      productIds?: undefined;
      contactUrl?: string;
    })
  | (BaseProps & {
      type: "free";
      productIds?: undefined;
      contactUrl?: string;
    })
  | (BaseProps & {
      type: "single";
      productIds?: Partial<Record<RecurringCycle, string>>;
      contactUrl?: string;
    })
  | (BaseProps & {
      type: "unit-based";
      productIds?: Partial<Record<RecurringCycle, string>>;
      contactUrl?: string;
    })
  | (BaseProps & {
      type: "enterprise";
      productIds?: undefined;
      contactUrl: string;
    });

export const SubscriptionItem = ({
  planId,
  type,
  title,
  description,
  groupId,
  groupTitle,
  contactUrl,
  recommended,
  productIds,
  className,
  class: classProp,
  children,
}: PropsWithChildren<Props>) => {
  const rootContext = useContext(SubscriptionContext);
  const resolvedClassName = className ?? classProp ?? "";
  const resolvedPlanId = planId ?? Object.values(productIds ?? {})[0] ?? type;

  useEffect(() => {
    if (!rootContext) return;
    if (!resolvedPlanId) return;
    const registration = {
      planId: resolvedPlanId,
      type,
      title,
      description,
      groupId,
      groupTitle,
      contactUrl,
      recommended,
      productIds,
    };
    const unregister = rootContext.registerPlan(registration);
    return unregister;
  }, [
    rootContext,
    planId,
    type,
    title,
    description,
    groupId,
    groupTitle,
    contactUrl,
    recommended,
    productIds,
    resolvedPlanId,
  ]);

  const plan = resolvedPlanId
    ? rootContext?.getPlan(resolvedPlanId)
    : undefined;
  const visible = resolvedPlanId
    ? (rootContext?.isPlanVisible(resolvedPlanId) ?? false)
    : false;
  const productId = plan
    ? resolveProductIdForPlan(plan, rootContext?.selectedCycle)
    : undefined;
  const isActiveProduct =
    rootContext?.subscriptionProductId != null &&
    productId != null &&
    productId === rootContext.subscriptionProductId;
  const isActivePlanOtherCycle =
    !isActiveProduct &&
    rootContext?.activePlanId === plan?.planId &&
    productId != null;
  const isActiveFreePlan =
    !isActiveProduct &&
    plan?.category === "free" &&
    rootContext?.activePlanId === plan.planId;
  const isSiblingPlan =
    !isActiveProduct &&
    !isActivePlanOtherCycle &&
    rootContext?.isGroupSubscribed === true &&
    productId != null &&
    plan?.category !== "free" &&
    plan?.category !== "enterprise";
  const effectiveUnits =
    plan?.pricingModel === "unit"
      ? rootContext?.showUnitPicker
        ? (rootContext?.units ?? 1)
        : rootContext?.units
      : undefined;

  const itemContext = useMemo(() => {
    if (!plan) return undefined;
    const price =
      plan.category === "free"
        ? "Free"
        : plan.category === "enterprise"
          ? "Custom"
          : formatPriceWithInterval(productId, rootContext?.products ?? []);

    return {
      plan,
      isActive: isActiveProduct || isActiveFreePlan,
      isRecommended: plan.recommended === true,
      selectedCycle: rootContext?.selectedCycle ?? "every-month",
      currentProductId: productId,
      price,
      onCheckout:
        rootContext &&
        productId &&
        !isActiveProduct &&
        !isActiveFreePlan &&
        !isSiblingPlan &&
        !isActivePlanOtherCycle
          ? () =>
              rootContext.checkout({ plan, productId, units: effectiveUnits })
          : undefined,
      onSwitch:
        rootContext && productId && (isSiblingPlan || isActivePlanOtherCycle)
          ? () =>
              rootContext.switchPlan?.({
                plan,
                productId,
                units:
                  plan.pricingModel === "unit"
                    ? (rootContext.subscribedUnits ?? effectiveUnits)
                    : effectiveUnits,
              })
          : undefined,
    };
  }, [
    plan,
    productId,
    rootContext,
    isActiveProduct,
    isActiveFreePlan,
    isSiblingPlan,
    isActivePlanOtherCycle,
    effectiveUnits,
  ]);

  if (!rootContext || !plan || !visible || !itemContext) return null;

  if (children) {
    return (
      <SubscriptionItemContext.Provider value={itemContext}>
        <section className={resolvedClassName}>{children}</section>
      </SubscriptionItemContext.Provider>
    );
  }

  return (
    <PricingCard
      plan={plan}
      selectedCycle={rootContext.selectedCycle}
      activePlanId={rootContext.activePlanId}
      subscriptionProductId={rootContext.subscriptionProductId}
      subscriptionStatus={rootContext.subscriptionStatus}
      subscriptionTrialEnd={rootContext.subscriptionTrialEnd}
      products={rootContext.products}
      units={rootContext.units}
      showUnitPicker={rootContext.showUnitPicker}
      subscribedUnits={rootContext.subscribedUnits}
      isGroupSubscribed={rootContext.isGroupSubscribed}
      disableCheckout={rootContext.disableCheckout}
      disableSwitch={rootContext.disableSwitch}
      disableUnits={rootContext.disableUnits}
      className={resolvedClassName}
      onCheckout={rootContext.checkout}
      onSwitchPlan={rootContext.switchPlan}
      onUpdateUnits={rootContext.updateUnits}
      onCancelSubscription={rootContext.cancelSubscription}
    />
  );
};
