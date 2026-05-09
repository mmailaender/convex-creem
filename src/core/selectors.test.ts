import { describe, expect, it } from "vitest";
import {
  hasBillingAction,
  isOneTimeBilling,
  isEnterpriseBilling,
  shouldShowBillingCycleToggle,
  isTerminalPaymentStatus,
  derivePaymentRecoveryState,
  selectOwnedProductIds,
  resolveBasePlanId,
} from "./selectors.js";
import type { BillingSnapshot, SubscriptionSnapshot } from "./types.js";

const makeSnapshot = (
  overrides: Partial<BillingSnapshot> = {},
): BillingSnapshot => ({
  resolvedAt: new Date().toISOString(),
  activePlanId: null,
  activeCategory: "paid",
  billingType: "recurring",
  availableBillingCycles: [],
  payment: null,
  availableActions: [],
  ...overrides,
});

describe("hasBillingAction", () => {
  it("returns true when action is present", () => {
    const snapshot = makeSnapshot({ availableActions: ["checkout", "portal"] });
    expect(hasBillingAction(snapshot, "checkout")).toBe(true);
    expect(hasBillingAction(snapshot, "portal")).toBe(true);
  });

  it("returns false when action is absent", () => {
    const snapshot = makeSnapshot({ availableActions: ["checkout"] });
    expect(hasBillingAction(snapshot, "cancel")).toBe(false);
  });
});

describe("isOneTimeBilling", () => {
  it("returns true for onetime billing type", () => {
    expect(isOneTimeBilling(makeSnapshot({ billingType: "onetime" }))).toBe(
      true,
    );
  });

  it("returns false for recurring billing type", () => {
    expect(isOneTimeBilling(makeSnapshot({ billingType: "recurring" }))).toBe(
      false,
    );
  });
});

describe("isEnterpriseBilling", () => {
  it("returns true for enterprise category", () => {
    expect(
      isEnterpriseBilling(makeSnapshot({ activeCategory: "enterprise" })),
    ).toBe(true);
  });

  it("returns false for paid category", () => {
    expect(isEnterpriseBilling(makeSnapshot({ activeCategory: "paid" }))).toBe(
      false,
    );
  });
});

describe("shouldShowBillingCycleToggle", () => {
  it("returns true when recurring with multiple cycles and switch_interval action", () => {
    const snapshot = makeSnapshot({
      billingType: "recurring",
      availableBillingCycles: ["every-month", "every-year"],
      availableActions: ["switch_interval", "portal"],
    });
    expect(shouldShowBillingCycleToggle(snapshot)).toBe(true);
  });

  it("returns false when only one cycle available", () => {
    const snapshot = makeSnapshot({
      billingType: "recurring",
      availableBillingCycles: ["every-month"],
      availableActions: ["switch_interval"],
    });
    expect(shouldShowBillingCycleToggle(snapshot)).toBe(false);
  });

  it("returns false when onetime billing type", () => {
    const snapshot = makeSnapshot({
      billingType: "onetime",
      availableBillingCycles: ["every-month", "every-year"],
      availableActions: ["switch_interval"],
    });
    expect(shouldShowBillingCycleToggle(snapshot)).toBe(false);
  });

  it("returns false when switch_interval action is not available", () => {
    const snapshot = makeSnapshot({
      billingType: "recurring",
      availableBillingCycles: ["every-month", "every-year"],
      availableActions: ["portal"],
    });
    expect(shouldShowBillingCycleToggle(snapshot)).toBe(false);
  });
});

describe("isTerminalPaymentStatus", () => {
  it("returns true for paid", () => {
    expect(isTerminalPaymentStatus("paid")).toBe(true);
  });

  it("returns true for refunded", () => {
    expect(isTerminalPaymentStatus("refunded")).toBe(true);
  });

  it("returns true for partially_refunded", () => {
    expect(isTerminalPaymentStatus("partially_refunded")).toBe(true);
  });

  it("returns false for pending", () => {
    expect(isTerminalPaymentStatus("pending")).toBe(false);
  });
});

describe("derivePaymentRecoveryState", () => {
  it("returns none for null input", () => {
    expect(derivePaymentRecoveryState(null)).toBe("none");
  });

  it("returns none for undefined input", () => {
    expect(derivePaymentRecoveryState(undefined)).toBe("none");
  });

  it("returns none for empty array", () => {
    expect(derivePaymentRecoveryState([])).toBe("none");
  });

  it("returns none for active subscription", () => {
    expect(
      derivePaymentRecoveryState({ status: "active" } as SubscriptionSnapshot),
    ).toBe("none");
  });

  it("returns warning for past_due subscription", () => {
    expect(
      derivePaymentRecoveryState({
        status: "past_due",
      } as SubscriptionSnapshot),
    ).toBe("warning");
  });

  it("returns blocked for unpaid subscription", () => {
    expect(
      derivePaymentRecoveryState({ status: "unpaid" } as SubscriptionSnapshot),
    ).toBe("blocked");
  });

  it("returns blocked for expired subscription", () => {
    expect(
      derivePaymentRecoveryState({ status: "expired" } as SubscriptionSnapshot),
    ).toBe("blocked");
  });

  it("returns blocked when one subscription is unpaid even if others are active", () => {
    expect(
      derivePaymentRecoveryState([
        { status: "active" } as SubscriptionSnapshot,
        { status: "unpaid" } as SubscriptionSnapshot,
      ]),
    ).toBe("blocked");
  });

  it("returns warning when one subscription is past_due and others are active", () => {
    expect(
      derivePaymentRecoveryState([
        { status: "active" } as SubscriptionSnapshot,
        { status: "past_due" } as SubscriptionSnapshot,
      ]),
    ).toBe("warning");
  });

  it("returns none for trialing subscription", () => {
    expect(
      derivePaymentRecoveryState({
        status: "trialing",
      } as SubscriptionSnapshot),
    ).toBe("none");
  });

  it("returns none for scheduled_cancel subscription", () => {
    expect(
      derivePaymentRecoveryState({
        status: "scheduled_cancel",
      } as SubscriptionSnapshot),
    ).toBe("none");
  });

  it("blocked takes priority over warning", () => {
    expect(
      derivePaymentRecoveryState([
        { status: "past_due" } as SubscriptionSnapshot,
        { status: "expired" } as SubscriptionSnapshot,
      ]),
    ).toBe("blocked");
  });
});

describe("selectOwnedProductIds", () => {
  it("returns empty array for null", () => {
    expect(selectOwnedProductIds(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(selectOwnedProductIds(undefined)).toEqual([]);
  });

  it("returns empty array for empty array", () => {
    expect(selectOwnedProductIds([])).toEqual([]);
  });

  it("passes through string arrays unchanged", () => {
    expect(selectOwnedProductIds(["prod_1", "prod_2"])).toEqual([
      "prod_1",
      "prod_2",
    ]);
  });

  it("filters order objects to paid status only", () => {
    expect(
      selectOwnedProductIds([
        { productId: "prod_1", status: "paid" },
        { productId: "prod_2", status: "pending" },
        { productId: "prod_3", status: "paid" },
      ]),
    ).toEqual(["prod_1", "prod_3"]);
  });

  it("skips orders without productId", () => {
    expect(
      selectOwnedProductIds([
        { status: "paid" },
        { productId: "prod_1", status: "paid" },
      ]),
    ).toEqual(["prod_1"]);
  });
});

describe("resolveBasePlanId", () => {
  const findPlan = (productId: string) => {
    const map: Record<string, { planId: string }> = {
      prod_pro: { planId: "pro" },
      prod_basic: { planId: "basic" },
    };
    return map[productId];
  };

  it("returns null for null subscriptions", () => {
    expect(resolveBasePlanId(null, findPlan)).toBeNull();
  });

  it("returns null for empty subscriptions", () => {
    expect(resolveBasePlanId([], findPlan)).toBeNull();
  });

  it("resolves plan ID from active subscription", () => {
    expect(
      resolveBasePlanId(
        [{ productId: "prod_pro", status: "active" }],
        findPlan,
      ),
    ).toBe("pro");
  });

  it("resolves plan ID from trialing subscription", () => {
    expect(
      resolveBasePlanId(
        [{ productId: "prod_basic", status: "trialing" }],
        findPlan,
      ),
    ).toBe("basic");
  });

  it("resolves plan ID from past_due subscription", () => {
    expect(
      resolveBasePlanId(
        [{ productId: "prod_pro", status: "past_due" }],
        findPlan,
      ),
    ).toBe("pro");
  });

  it("resolves plan ID from scheduled_cancel subscription", () => {
    expect(
      resolveBasePlanId(
        [{ productId: "prod_pro", status: "scheduled_cancel" }],
        findPlan,
      ),
    ).toBe("pro");
  });

  it("skips canceled subscriptions", () => {
    expect(
      resolveBasePlanId(
        [{ productId: "prod_pro", status: "canceled" }],
        findPlan,
      ),
    ).toBeNull();
  });

  it("returns first matching active subscription", () => {
    expect(
      resolveBasePlanId(
        [
          { productId: "prod_basic", status: "active" },
          { productId: "prod_pro", status: "active" },
        ],
        findPlan,
      ),
    ).toBe("basic");
  });

  it("returns null when no subscription matches a plan", () => {
    expect(
      resolveBasePlanId(
        [{ productId: "prod_unknown", status: "active" }],
        findPlan,
      ),
    ).toBeNull();
  });
});
