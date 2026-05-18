import { useMemo } from "react";
import { BillingToggle } from "./BillingToggle.js";
import { PricingCard } from "./PricingCard.js";
import type { UIPlanEntry, RecurringCycle } from "../../core/types.js";
import {
  defaultBillingLabels,
  type BillingCurrencyFormatInput,
  type BillingLabels,
} from "../../core/i18n.js";
import type { ConnectedProduct } from "../widgets/types.js";

export const PricingSection = ({
  plans = [],
  activePlanId,
  selectedCycle,
  products = [],
  subscriptionProductId,
  subscriptionStatus,
  subscriptionTrialEnd,
  units,
  showUnitPicker = false,
  showCycleToggle = true,
  twoColumnLayout = false,
  subscribedUnits,
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
  formatCurrency,
}: {
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
}) => {
  const availableCycles = useMemo(() => {
    const set = new Set<RecurringCycle>();
    for (const plan of plans) {
      for (const cycle of plan.billingCycles ?? []) {
        set.add(cycle);
      }
    }
    return Array.from(set);
  }, [plans]);

  const hasEnterprisePlan = plans.some((p) => p.category === "enterprise");
  const effectiveCycle = selectedCycle ?? availableCycles[0];
  const showToggle = showCycleToggle && availableCycles.length > 1;

  return (
    <section className={className}>
      {showToggle && (
        <div className="mb-[6.5rem] flex justify-center">
          <BillingToggle
            cycles={availableCycles}
            value={effectiveCycle}
            onValueChange={onCycleChange}
            labels={labels}
          />
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-1 ${
          showUnitPicker || twoColumnLayout
            ? "md:grid-cols-2"
            : hasEnterprisePlan
              ? "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
              : "sm:grid-cols-2 md:grid-cols-3"
        }`}
      >
        {plans.map((plan) => (
          <PricingCard
            key={plan.planId}
            plan={plan}
            selectedCycle={effectiveCycle}
            activePlanId={activePlanId}
            subscriptionProductId={subscriptionProductId}
            subscriptionStatus={subscriptionStatus}
            subscriptionTrialEnd={subscriptionTrialEnd}
            products={products}
            units={units}
            showUnitPicker={showUnitPicker}
            subscribedUnits={subscribedUnits}
            isGroupSubscribed={isGroupSubscribed}
            disableCheckout={disableCheckout}
            disableSwitch={disableSwitch}
            disableUnits={disableUnits}
            onCheckout={onCheckout}
            onSwitchPlan={onSwitchPlan}
            onUpdateUnits={onUpdateUnits}
            onContactSales={onContactSales}
            onCancelSubscription={onCancelSubscription}
            labels={labels}
            formatCurrency={formatCurrency}
          />
        ))}
      </div>
    </section>
  );
};
