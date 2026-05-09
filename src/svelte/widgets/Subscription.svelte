<script lang="ts">
  import { getContext, setContext, untrack } from "svelte";
  import type { RecurringCycle } from "../../core/types.js";
  import {
    SUBSCRIPTION_CONTEXT_KEY,
    type SubscriptionContextValue,
  } from "./subscriptionContext.js";
  import {
    SUBSCRIPTION_ITEM_CONTEXT_KEY,
    type SubscriptionItemContextValue,
  } from "./subscriptionItemContext.js";
  import PricingCard from "../primitives/PricingCard.svelte";
  import {
    formatPriceWithInterval,
    resolveProductIdForPlan,
  } from "../primitives/shared.js";
  import type { UIPlanEntry } from "../../core/types.js";

  type BaseProps = {
    planId?: string;
    title?: string;
    description?: string;
    groupId?: string;
    groupTitle?: string;
    recommended?: boolean;
    class?: string;
    children?: import("svelte").Snippet;
  };

  type Props =
    | (BaseProps & { type?: undefined; productIds?: undefined; contactUrl?: string })
    | (BaseProps & { type: "free"; productIds?: undefined; contactUrl?: string })
    | (BaseProps & { type: "single"; productIds?: Partial<Record<RecurringCycle, string>>; contactUrl?: string })
    | (BaseProps & { type: "unit-based"; productIds?: Partial<Record<RecurringCycle, string>>; contactUrl?: string })
    | (BaseProps & { type: "enterprise"; productIds?: undefined; contactUrl: string });

  let {
    planId = undefined,
    type = undefined,
    title = undefined,
    description = undefined,
    groupId = undefined,
    groupTitle = undefined,
    contactUrl = undefined,
    recommended = undefined,
    productIds = undefined,
    class: className = "",
    children,
  }: Props = $props();

  // Must be used inside a <Subscription.Root>
  const rootContext = getContext<SubscriptionContextValue | undefined>(
    SUBSCRIPTION_CONTEXT_KEY,
  );
  const fallbackPlan = {
    planId: "__pending__",
    category: "paid",
    billingType: "recurring",
    title: "",
  } as UIPlanEntry;
  const resolvedPlanId = $derived(
    planId ?? Object.values(productIds ?? {})[0] ?? type,
  );

  if (rootContext) {
    $effect(() => {
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
      const unregister = untrack(() => rootContext.registerPlan(registration));
      return () => untrack(unregister);
    });
  }

  const plan = $derived(
    resolvedPlanId && rootContext ? rootContext.getPlan(resolvedPlanId) : undefined,
  );
  const visible = $derived(
    resolvedPlanId && rootContext ? rootContext.isPlanVisible(resolvedPlanId) : false,
  );
  const selectedCycle = $derived(rootContext?.getSelectedCycle());
  const productId = $derived(plan ? resolveProductIdForPlan(plan, selectedCycle) : undefined);
  const isActiveProduct = $derived(
    rootContext?.getSubscriptionProductId() != null &&
      productId != null &&
      productId === rootContext?.getSubscriptionProductId(),
  );
  const isActivePlanOtherCycle = $derived(
    !isActiveProduct &&
      rootContext?.getActivePlanId() === plan?.planId &&
      productId != null,
  );
  const isActiveFreePlan = $derived(
    !isActiveProduct &&
      plan?.category === "free" &&
      rootContext?.getActivePlanId() === plan.planId,
  );
  const isSiblingPlan = $derived(
    !isActiveProduct &&
      !isActivePlanOtherCycle &&
      rootContext?.getIsGroupSubscribed() === true &&
      productId != null &&
      plan?.category !== "free" &&
      plan?.category !== "enterprise",
  );
  const effectiveUnits = $derived(
    plan?.pricingModel === "unit"
      ? rootContext?.getShowUnitPicker()
        ? (rootContext?.getUnits() ?? 1)
        : rootContext?.getUnits()
      : undefined,
  );
  const price = $derived.by(() => {
    if (!plan) return null;
    if (plan.category === "free") return "Free";
    if (plan.category === "enterprise") return "Custom";
    return formatPriceWithInterval(productId, rootContext?.getProducts() ?? []);
  });
  const onCheckout = $derived.by(() => {
    if (!rootContext || !plan || !productId || isActiveProduct || isActiveFreePlan || isSiblingPlan || isActivePlanOtherCycle) {
      return undefined;
    }
    return () => rootContext.checkout({ plan, productId, units: effectiveUnits });
  });
  const onSwitch = $derived.by(() => {
    if (!rootContext || !plan || !productId || !(isSiblingPlan || isActivePlanOtherCycle)) {
      return undefined;
    }
    return () =>
      rootContext.switchPlan?.({
        plan,
        productId,
        units: plan.pricingModel === "unit"
          ? (rootContext.getSubscribedUnits() ?? effectiveUnits)
          : effectiveUnits,
      });
  });

  const itemContext: SubscriptionItemContextValue = {
    get plan() {
      return plan ?? fallbackPlan;
    },
    get isActive() {
      return isActiveProduct || isActiveFreePlan;
    },
    get isRecommended() {
      return plan?.recommended === true;
    },
    get selectedCycle() {
      return selectedCycle ?? "every-month";
    },
    get currentProductId() {
      return productId;
    },
    get price() {
      return price;
    },
    get onCheckout() {
      return onCheckout;
    },
    get onSwitch() {
      return onSwitch;
    },
  };

  setContext(SUBSCRIPTION_ITEM_CONTEXT_KEY, itemContext);
</script>

{#if rootContext && plan && visible}
  {#if children}
    <section class={className}>
      {@render children()}
    </section>
  {:else}
    <PricingCard
      {plan}
      {selectedCycle}
      activePlanId={rootContext.getActivePlanId()}
      subscriptionProductId={rootContext.getSubscriptionProductId()}
      subscriptionStatus={rootContext.getSubscriptionStatus()}
      subscriptionTrialEnd={rootContext.getSubscriptionTrialEnd()}
      products={rootContext.getProducts()}
      units={rootContext.getUnits()}
      showUnitPicker={rootContext.getShowUnitPicker()}
      subscribedUnits={rootContext.getSubscribedUnits()}
      isGroupSubscribed={rootContext.getIsGroupSubscribed()}
      disableCheckout={rootContext.getDisableCheckout()}
      disableSwitch={rootContext.getDisableSwitch()}
      disableUnits={rootContext.getDisableUnits()}
      className={className}
      onCheckout={(payload) => rootContext.checkout(payload)}
      onSwitchPlan={rootContext.switchPlan}
      onUpdateUnits={rootContext.updateUnits}
      onCancelSubscription={rootContext.cancelSubscription}
    />
  {/if}
{/if}
