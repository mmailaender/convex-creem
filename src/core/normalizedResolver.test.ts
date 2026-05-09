import { describe, it, expect } from "vitest";
import { resolveNormalizedSnapshot } from "./normalizedResolver.js";
import type { PlanCatalog, SubscriptionSnapshot } from "./types.js";

const catalog: PlanCatalog = {
  version: "1",
  defaultPlanId: "free",
  plans: [
    { planId: "free", category: "free" },
    {
      planId: "basic",
      category: "paid",
      billingType: "recurring",
      billingCycles: ["every-month", "every-year"],
      creemProductIds: {
        "every-month": "prod_basic_m",
        "every-year": "prod_basic_y",
      },
    },
    {
      planId: "addon",
      category: "paid",
      billingType: "recurring",
      creemProductIds: { "every-month": "prod_addon_m" },
      metadata: { kind: "addon" },
    },
  ],
};

describe("resolveNormalizedSnapshot", () => {
  it("returns empty arrays with no subscriptions or orders", () => {
    const result = resolveNormalizedSnapshot({
      entityId: "e1",
      catalog,
      now: "2025-01-01T00:00:00Z",
    });
    expect(result.subscriptions).toHaveLength(0);
    expect(result.orders).toHaveLength(0);
    expect(result.paymentRecoveryState).toBe("none");
    expect(result.availableBillingActions).toContain("checkout");
    expect(result.entityId).toBe("e1");
    expect(result.catalogVersion).toBe("1");
  });

  it("maps subscriptions with plan IDs from catalog", () => {
    const subs: SubscriptionSnapshot[] = [
      {
        id: "sub_1",
        productId: "prod_basic_m",
        status: "active",
        recurringInterval: "every-month",
        units: 5,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: "2025-02-01T00:00:00Z",
      },
      {
        id: "sub_2",
        productId: "prod_addon_m",
        status: "active",
        recurringInterval: "every-month",
      },
    ];
    const result = resolveNormalizedSnapshot({
      entityId: "e1",
      catalog,
      subscriptions: subs,
      now: "2025-01-15T00:00:00Z",
    });
    expect(result.subscriptions).toHaveLength(2);

    const basic = result.subscriptions.find((s) => s.planId === "basic");
    expect(basic).toBeDefined();
    expect(basic!.productId).toBe("prod_basic_m");
    expect(basic!.subscriptionId).toBe("sub_1");
    expect(basic!.status).toBe("active");
    expect(basic!.recurringCycle).toBe("every-month");
    expect(basic!.units).toBe(5);

    const addon = result.subscriptions.find((s) => s.planId === "addon");
    expect(addon).toBeDefined();
    expect(addon!.kind).toBe("addon");

    expect(result.paymentRecoveryState).toBe("none");
    expect(result.availableBillingActions).toContain("portal");
    expect(result.availableBillingActions).toContain("cancel");
  });

  it("maps orders with plan IDs from catalog", () => {
    const result = resolveNormalizedSnapshot({
      entityId: "e1",
      catalog,
      orders: [
        { orderId: "ord_1", productId: "prod_basic_m", status: "paid" },
        { orderId: "ord_2", productId: "prod_unknown", status: "paid" },
      ],
    });
    expect(result.orders).toHaveLength(2);
    expect(result.orders[0].planId).toBe("basic");
    expect(result.orders[1].planId).toBeNull();
    expect(result.availableBillingActions).toContain("checkout");
  });

  it("derives warning recovery state from past_due subscriptions", () => {
    const subs: SubscriptionSnapshot[] = [
      { id: "sub_1", productId: "prod_basic_m", status: "past_due" },
    ];
    const result = resolveNormalizedSnapshot({
      entityId: "e1",
      catalog,
      subscriptions: subs,
    });
    expect(result.paymentRecoveryState).toBe("warning");
  });

  it("derives blocked recovery state from unpaid subscriptions", () => {
    const subs: SubscriptionSnapshot[] = [
      { id: "sub_1", productId: "prod_basic_m", status: "unpaid" },
    ];
    const result = resolveNormalizedSnapshot({
      entityId: "e1",
      catalog,
      subscriptions: subs,
    });
    expect(result.paymentRecoveryState).toBe("blocked");
  });

  it("includes reactivate action for canceled subscriptions alongside active", () => {
    const subs: SubscriptionSnapshot[] = [
      { id: "sub_1", productId: "prod_basic_m", status: "active" },
      { id: "sub_2", productId: "prod_addon_m", status: "canceled" },
    ];
    const result = resolveNormalizedSnapshot({
      entityId: "e1",
      catalog,
      subscriptions: subs,
    });
    expect(result.availableBillingActions).toContain("reactivate");
    expect(result.availableBillingActions).toContain("cancel");
  });

  it("offers checkout when only canceled subscriptions exist", () => {
    const subs: SubscriptionSnapshot[] = [
      { id: "sub_1", productId: "prod_basic_m", status: "canceled" },
    ];
    const result = resolveNormalizedSnapshot({
      entityId: "e1",
      catalog,
      subscriptions: subs,
    });
    expect(result.availableBillingActions).toContain("checkout");
    expect(result.availableBillingActions).toContain("reactivate");
  });

  it("handles subscriptions with unknown product IDs gracefully", () => {
    const subs: SubscriptionSnapshot[] = [
      { id: "sub_1", productId: "prod_unknown", status: "active" },
    ];
    const result = resolveNormalizedSnapshot({
      entityId: "e1",
      catalog,
      subscriptions: subs,
    });
    expect(result.subscriptions[0].planId).toBeNull();
    expect(result.subscriptions[0].productId).toBe("prod_unknown");
  });
});
