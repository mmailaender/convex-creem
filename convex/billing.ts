import {
  appPlanActivateArgs,
  Creem,
  defineBillingCatalog,
  type ApiResolver,
} from "@mmailaender/convex-creem";
import { api, components } from "./_generated/api";
import { action, internalAction, mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

const demoCreditsProductId =
  process.env.CREEM_ONETIME_CREDITS ?? "prod_73CnZ794MaJ1DUn8MU0O5f";

const creemServer =
  process.env.CREEM_SERVER === "test" ? "test" : ("prod" as const);

const billingCatalog = defineBillingCatalog({
  version: "example-server",
  plans: [
    {
      planId: "trial",
      category: "trial",
      billingType: "custom",
      eligibilityScopeId: "base",
      eligibility: {
        oncePerEntity: true,
        hideWhenIneligible: true,
        expiresWhenScopeHasNonTrialPlan: true,
      },
    },
    {
      planId: "free",
      category: "free",
      billingType: "custom",
      eligibilityScopeId: "base",
    },
    {
      planId: "ai-credits-100",
      category: "paid",
      billingType: "onetime",
      creemProductIds: {
        custom: demoCreditsProductId,
      },
      creditGrant: {
        amount: "100",
        accountName: "credits",
        unitLabel: "credits",
        refundBehavior: "revoke_on_full_refund",
      },
    },
  ],
} as const);

export const creem = new Creem(components.creem, {
  server: creemServer,
  billingCatalog,
  // Demo cancellation should keep access until period end so
  // `subscription.scheduled_cancel` and resume flows are visible in examples.
  cancelMode: "scheduled",
});

// ── Auth resolver ───────────────────────────────────────────────
// Replace with your own auth logic (e.g. ctx.auth.getUserIdentity()).
// This example uses a demo user from the "users" table.
const resolve: ApiResolver = async (ctx) => {
  const user: {
    _id: Id<"users">;
    email: string;
  } = await ctx.runQuery(api.billing.getUserInfo);
  return {
    userId: user._id as string,
    email: user.email,
    entityId: user._id as string,
    // For org billing, resolve the org ID:
    // entityId: user.activeOrgId ?? user._id,
  };
};
export const getUserInfo = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.query("users").first();
    if (!user) throw new ConvexError("User not found");
    return user;
  },
});

export const plansActivate = mutation({
  args: appPlanActivateArgs,
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").first();
    if (!user) throw new ConvexError("User not found");

    await creem.appPlans.activate(ctx, {
      entityId: user._id as string,
      planId: args.planId,
      activatedByUserId: user._id as string,
    });

    return { success: true };
  },
});

// ── Quick-start: auto-generated Convex exports via api({ resolve }) ──
// Each export calls `resolve` to determine the authenticated user,
// then delegates to the corresponding creem class method.
// For full control, use creem.subscriptions.cancel(ctx, { entityId })
// etc. directly in your own action/query handlers.

const {
  uiModel,
  snapshot,
  checkouts,
  subscriptions,
  products,
  customers,
  transactions,
  orders,
  credits,
} = creem.api({ resolve });

// Component-specific
export { uiModel, snapshot };

// SDK-mirrored (flat exports with namespace prefix)
export const checkoutsCreate = checkouts.create;
export const subscriptionsUpdate = subscriptions.update;
export const subscriptionsCancel = subscriptions.cancel;
export const subscriptionsResume = subscriptions.resume;
export const subscriptionsCancelScheduledUpdate =
  subscriptions.cancelScheduledUpdate;
export const subscriptionsPause = subscriptions.pause;
export const subscriptionsList = subscriptions.list;
export const subscriptionsListAll = subscriptions.listAll;
export const productsList = products.list;
export const productsGet = products.get;
export const customersRetrieve = customers.retrieve;
export const customersPortalUrl = customers.portalUrl;
export const transactionsSearch = transactions.search;
export const ordersList = orders.list;
export const creditsCreateAccount = credits.createAccount;
export const creditsGetBalance = credits.getBalance;
export const creditsCredit = credits.credit;
export const creditsDebit = credits.debit;
export const creditsListEntries = credits.listEntries;

export const generateDemoImage = action({
  args: {},
  handler: async (ctx) => {
    const idempotencyKey = `demo_generate_image_${Date.now()}`;
    await ctx.runAction(api.billing.creditsDebit, {
      amount: "10",
      reference: "demo_generate_image",
      idempotencyKey,
    });
    return {
      id: idempotencyKey,
      creditsConsumed: "10",
    };
  },
});

export const syncBillingProducts = internalAction({
  args: {},
  handler: async (ctx) => {
    await creem.syncProducts(ctx);
    return { synced: true };
  },
});
