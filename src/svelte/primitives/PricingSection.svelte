<script lang="ts">
  import BillingToggle from "./BillingToggle.svelte";
  import PricingCard from "./PricingCard.svelte";
  import type { UIPlanEntry, RecurringCycle } from "../../core/types.js";
  import {
    defaultBillingLabels,
    type BillingCurrencyFormatInput,
    type BillingLabels,
  } from "../../core/i18n.js";
  import type { ConnectedProduct } from "../widgets/types.js";
    import { SvelteSet } from "svelte/reactivity";

  interface Props {
    plans?: UIPlanEntry[];
    activePlanId?: string | null;
    selectedCycle?: RecurringCycle;
    products?: ConnectedProduct[];
    subscriptionProductId?: string | null;
    subscriptionStatus?: string | null;
    subscriptionTrialEnd?: string | null;
    units?: number;
    showUnitPicker?: boolean;
    showCycleToggle?: boolean;
    twoColumnLayout?: boolean;
    subscribedUnits?: number | null;
    isGroupSubscribed?: boolean;
    disableCheckout?: boolean;
    disableSwitch?: boolean;
    disableUnits?: boolean;
    className?: string;
    onCycleChange?: (cycle: RecurringCycle) => void;
    onCheckout?: (payload: {
      plan: UIPlanEntry;
      productId: string;
      units?: number;
    }) => Promise<void> | void;
    onSwitchPlan?: (payload: {
      plan: UIPlanEntry;
      productId?: string;
      freePlanId?: string;
      units?: number;
    }) => Promise<void> | void;
    onUpdateUnits?: (payload: { units: number }) => Promise<void> | void;
    onContactSales?: (payload: { plan: UIPlanEntry }) => Promise<void> | void;
    onCancelSubscription?: () => void;
    labels?: BillingLabels;
    formatCurrency?: (input: BillingCurrencyFormatInput) => string;
  }

  let {
    plans = [],
    activePlanId = null,
    selectedCycle = undefined,
    products = [],
    subscriptionProductId = null,
    subscriptionStatus = null,
    subscriptionTrialEnd = null,
    units = undefined,
    showUnitPicker = false,
    showCycleToggle = true,
    twoColumnLayout = false,
    subscribedUnits = null,
    isGroupSubscribed = false,
    disableCheckout = false,
    disableSwitch = false,
    disableUnits = false,
    className = "",
    onCycleChange,
    onCheckout,
    onSwitchPlan,
    onUpdateUnits,
    onContactSales,
    onCancelSubscription,
    labels = defaultBillingLabels,
    formatCurrency = undefined,
  }: Props = $props();

  const toUniqueCycles = (entries: UIPlanEntry[]) => {
    const set = new SvelteSet<RecurringCycle>();
    for (const plan of entries) {
      for (const cycle of plan.billingCycles ?? []) {
        set.add(cycle);
      }
    }
    return Array.from(set);
  };

  const availableCycles = $derived(toUniqueCycles(plans));
  const hasEnterprisePlan = $derived(plans.some((plan) => plan.category === "enterprise"));
  const effectiveCycle = $derived(selectedCycle ?? availableCycles[0]);
  const showToggle = $derived(showCycleToggle && availableCycles.length > 1);
</script>

<section class={className}>
  {#if showToggle}
    <div class="mb-[6.5rem] flex justify-center">
      <BillingToggle
        cycles={availableCycles}
        value={effectiveCycle}
        onValueChange={onCycleChange}
        {labels}
      />
    </div>
  {/if}

  <div class={`grid grid-cols-1 gap-1 ${showUnitPicker || twoColumnLayout ? "md:grid-cols-2" : hasEnterprisePlan ? "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : "sm:grid-cols-2 md:grid-cols-3"}`}>
    {#each plans as plan (plan.planId)}
      <PricingCard
        {plan}
        selectedCycle={effectiveCycle}
        {activePlanId}
        {subscriptionProductId}
        {subscriptionStatus}
        {subscriptionTrialEnd}
        {products}
        {units}
        {showUnitPicker}
        {subscribedUnits}
        {isGroupSubscribed}
        {disableCheckout}
        {disableSwitch}
        {disableUnits}
        {onCheckout}
        {onSwitchPlan}
        {onUpdateUnits}
        {onContactSales}
        {onCancelSubscription}
        {labels}
        {formatCurrency}
        className=""
      />
    {/each}
  </div>
</section>
