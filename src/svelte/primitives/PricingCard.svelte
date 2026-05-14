<script lang="ts">
  import CheckoutButton from "./CheckoutButton.svelte";
  import NumberInput from "./NumberInput.svelte";
  import type { UIPlanEntry, RecurringCycle } from "../../core/types.js";
  import type { ConnectedProduct } from "../widgets/types.js";
  import {
    resolveProductIdForPlan,
    formatPriceWithInterval,
    formatUnitPriceBreakdown,
  } from "./shared.js";
  import { renderMarkdown } from "../../core/markdown.js";

  interface Props {
    plan: UIPlanEntry;
    selectedCycle?: RecurringCycle;
    activePlanId?: string | null;
    subscriptionProductId?: string | null;
    subscriptionStatus?: string | null;
    subscriptionTrialEnd?: string | null;
    products?: ConnectedProduct[];
    units?: number;
    showUnitPicker?: boolean;
    subscribedUnits?: number | null;
    isGroupSubscribed?: boolean;
    disableCheckout?: boolean;
    disableSwitch?: boolean;
    disableUnits?: boolean;
    className?: string;
    onCheckout?: (payload: {
      plan: UIPlanEntry;
      productId: string;
      units?: number;
    }) => Promise<void> | void;
    onSwitchPlan?: (payload: {
      plan: UIPlanEntry;
      productId: string;
      units?: number;
    }) => Promise<void> | void;
    onUpdateUnits?: (payload: { units: number }) => Promise<void> | void;
    onContactSales?: (payload: { plan: UIPlanEntry }) => Promise<void> | void;
    onCancelSubscription?: () => void;
  }

  let {
    plan,
    selectedCycle = undefined,
    activePlanId = undefined,
    subscriptionProductId = null,
    subscriptionStatus = null,
    subscriptionTrialEnd = null,
    products = [],
    units = undefined,
    showUnitPicker = false,
    subscribedUnits = null,
    isGroupSubscribed = false,
    disableCheckout = false,
    disableSwitch = false,
    disableUnits = false,
    className = "",
    onCheckout,
    onSwitchPlan,
    onUpdateUnits,
    onContactSales,
    onCancelSubscription,
  }: Props = $props();

  const isUnitPlan = $derived(plan.pricingModel === "unit");
  let unitCount = $derived(units ?? 1);
  let unitAdjustCount = $state(1);
  let editingUnits = $state(false);
  $effect(() => {
    unitAdjustCount = subscribedUnits ?? units ?? 1;
    editingUnits = false;
  });
  const effectiveUnits = $derived(
    isUnitPlan ? (showUnitPicker ? unitCount : units) : undefined,
  );

  const productId = $derived(resolveProductIdForPlan(plan, selectedCycle));
  const priceLabel = $derived(formatPriceWithInterval(productId, products));

  // Exact match: user is subscribed to THIS specific product (plan + cycle)
  const isActiveProduct = $derived(
    subscriptionProductId != null && productId != null && productId === subscriptionProductId,
  );
  const isTrialing = $derived(isActiveProduct && subscriptionStatus === "trialing");
  const trialDaysLeft = $derived.by(() => {
    if (!isTrialing || !subscriptionTrialEnd) return null;
    const end = new Date(subscriptionTrialEnd).getTime();
    const now = Date.now();
    const days = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    return days;
  });
  // Same plan but different billing cycle — offer to switch interval
  const isActivePlanOtherCycle = $derived(
    !isActiveProduct && activePlanId === plan.planId && productId != null,
  );
  // Free plan is active when activePlanId matches and the plan has no product (no subscription)
  const isActiveFreePlan = $derived(
    !isActiveProduct && plan.category === "free" && activePlanId === plan.planId,
  );
  // Sibling plan in the same <Subscription> group that already has a subscription
  const isSiblingPlan = $derived(
    !isActiveProduct && !isActivePlanOtherCycle && isGroupSubscribed && productId != null && plan.category !== "free" && plan.category !== "enterprise",
  );
  const showUnitCheckoutControls = $derived(
    isUnitPlan && showUnitPicker && !isActiveProduct && !isSiblingPlan,
  );
  const reserveUnitActionHeight = $derived(
    isUnitPlan && showUnitPicker && (isActiveProduct || isSiblingPlan || isActivePlanOtherCycle),
  );

  const inheritedUnits = $derived(
    isUnitPlan && (isActiveProduct || isSiblingPlan || isActivePlanOtherCycle)
      ? subscribedUnits
      : null,
  );
  const unitPriceBreakdown = $derived(
    inheritedUnits != null
      ? formatUnitPriceBreakdown(productId, products, inheritedUnits)
      : null,
  );
  const unitsChanged = $derived(
    isActiveProduct && isUnitPlan && subscribedUnits != null && unitAdjustCount !== subscribedUnits,
  );

  const checkoutLabel = $derived(
    isActivePlanOtherCycle
      ? "Switch interval"
      : isSiblingPlan
        ? "Switch plan"
        : plan.billingType === "onetime"
          ? "Buy now"
          : "Subscribe",
  );
  const handleCheckout = (payload: { productId: string }) => {
    if ((isSiblingPlan || isActivePlanOtherCycle) && onSwitchPlan) {
      onSwitchPlan({ plan, productId: payload.productId, units: isUnitPlan ? (subscribedUnits ?? effectiveUnits) : effectiveUnits });
    } else {
      onCheckout?.({ plan, productId: payload.productId, units: effectiveUnits });
    }
  };

  const splitPriceLabel = (value: string | null): { main: string; suffix: string | null; tail: string } | null => {
    if (!value) return null;
    const match = value.match(/^(.*?)(\/[a-z0-9]+)(.*)$/i);
    if (!match) return { main: value, suffix: null, tail: "" };
    return {
      main: match[1]?.trim() ?? value,
      suffix: match[2] ?? null,
      tail: match[3]?.trim() ?? "",
    };
  };

  const splitPrice = $derived(splitPriceLabel(unitPriceBreakdown?.total ?? priceLabel));

  const descriptionHtml = $derived(renderMarkdown(plan.description));
</script>

<section
  class={`relative flex flex-col rounded-2xl bg-surface-base p-6 ${
    plan.recommended ? "border-2 border-primary-border-default" : ""
  } ${className}`}
>
  <div class="mb-3 flex h-5 items-center justify-between gap-2">
    <h3 class="title-s text-foreground-default">
      {plan.title ?? plan.planId}
    </h3>
    {#if isActiveProduct || isActiveFreePlan}
      <span class="badge-faded-sm">
        {#if isTrialing}
          Free trial{#if trialDaysLeft != null}&ensp;·&ensp;{trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left{/if}
        {:else}
          Current plan
        {/if}
      </span>
    {:else if plan.recommended}
      <span class="badge-filled-sm">
        Recommended
      </span>
    {/if}
  </div>

  <div class="flex items-baseline gap-1">
    {#if plan.category === "free"}
      <span class="heading-s text-foreground-default">Free</span>
    {:else if plan.category === "enterprise"}
      <span class="heading-s text-foreground-default">Custom</span>
    {:else if splitPrice}
      <span class="heading-s text-foreground-default">{splitPrice.main}</span>
      {#if splitPrice.suffix}
        <span class="title-s text-foreground-placeholder">{splitPrice.suffix}</span>
      {/if}
      {#if splitPrice.tail}
        <span class="title-s text-foreground-placeholder">{splitPrice.tail}</span>
      {/if}
    {/if}
  </div>
  {#if unitPriceBreakdown?.calculation}
    <p class="label-m mt-1 text-foreground-placeholder">
      {unitPriceBreakdown.calculation}
    </p>
  {/if}


  <div class={`mb-4 mt-6 ${showUnitCheckoutControls ? "flex flex-col gap-2" : "flex min-h-8 items-start"}`}>
    {#if showUnitCheckoutControls}
      <div class="flex w-full items-center justify-between rounded-xl bg-surface-subtle py-2 pl-4 pr-2">
        <span class="label-m text-foreground-default">Units:</span>
        <NumberInput
          value={unitCount}
          min={1}
          compact
          disabled={disableUnits}
          onValueChange={(next) => {
            if (next > 0) unitCount = next;
          }}
        />
      </div>
    {/if}

    <div
      class={`${showUnitCheckoutControls ? "w-full" : "flex min-h-8 items-start w-full"} ${
        reserveUnitActionHeight ? "min-h-[4.5rem]" : ""
      }`}
    >
    {#if isActiveProduct && isUnitPlan && showUnitPicker && onUpdateUnits}
      <div class="flex w-full flex-col gap-2">
        {#if editingUnits}
          <div class="flex w-full items-center justify-between rounded-xl bg-surface-subtle py-2 pl-4 pr-2">
            <span class="label-m text-foreground-default">Units:</span>
            <NumberInput
              value={unitAdjustCount}
              min={1}
              compact
              disabled={disableUnits}
              onValueChange={(next) => {
                if (next > 0) unitAdjustCount = next;
              }}
            />
          </div>
          <div class="flex w-full items-center gap-2">
            <button
              type="button"
              class="button-faded h-8 w-full"
              onclick={() => { unitAdjustCount = subscribedUnits ?? 1; editingUnits = false; }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={disableUnits || !unitsChanged}
              class="button-filled h-8 w-full disabled:cursor-not-allowed disabled:opacity-50"
              onclick={() => onUpdateUnits?.({ units: unitAdjustCount })}
            >
              Update
            </button>
          </div>
        {:else}
          <button type="button" class="button-faded w-full" onclick={() => editingUnits = true}>
            Change units
          </button>
          {#if onCancelSubscription}
            <button type="button" class="button-outline w-full" onclick={onCancelSubscription}>
              Cancel subscription
            </button>
          {/if}
        {/if}
      </div>
    {:else if isActiveProduct && onCancelSubscription}
      <button type="button" class="button-outline w-full" onclick={onCancelSubscription}>
        Cancel subscription
      </button>
    {:else if isActiveProduct || isActiveFreePlan}
      <!-- Keep CTA row height but intentionally empty when current plan has no action -->
    {:else if (isSiblingPlan || isActivePlanOtherCycle) && productId}
      <CheckoutButton
        {productId}
        disabled={disableSwitch}
        onCheckout={handleCheckout}
        className={`${plan.recommended ? "button-filled" : "button-faded"} w-full`}
      >
        {checkoutLabel}
      </CheckoutButton>
    {:else if plan.category === "enterprise"}
      {#if plan.contactUrl}
        <a
          href={plan.contactUrl}
          class="button-outline w-full"
        >
          Contact sales
        </a>
      {:else if onContactSales}
        <button
          type="button"
          class="button-outline w-full"
          onclick={() => onContactSales?.({ plan })}
        >
          Contact sales
        </button>
      {/if}
    {:else if productId}
        <CheckoutButton
          {productId}
          disabled={disableCheckout}
          onCheckout={handleCheckout}
          className={`${plan.recommended ? "button-filled" : "button-faded"} w-full`}
        >
          {checkoutLabel}
        </CheckoutButton>
      {:else if plan.category !== "free"}
        <span class="body-m text-foreground-muted">
          Configure a checkout handler to activate this plan.
        </span>
      {/if}
    </div>
  </div>

  {#if descriptionHtml}
    <div class="creem-prose w-full pt-4 body-m text-foreground-default">
      <!-- eslint-disable-next-line svelte/no-at-html-tags — merchant-authored markdown from Creem -->
      {@html descriptionHtml}
    </div>
  {/if}
</section>
