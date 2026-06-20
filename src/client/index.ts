import "./polyfill.js";
import { Creem as CreemSDK } from "creem";
import type {
  AccountResponseDto,
  CheckoutEntity,
  CustomerEntity,
  RefundEntity,
  SubscriptionEntity,
  TransactionListEntity,
  WebhookEventEntity,
} from "creem/models/components";
import {
  constructWebhookEventEntity,
  WebhookVerificationError,
} from "creem/webhooks";
import { getEntityId } from "./helpers.js";
import {
  type CreemWebhookEvent,
  getEventType,
  getCustomerId,
  getConvexEntityId,
} from "./parsers.js";
import {
  type FunctionReference,
  type HttpRouter,
  actionGeneric,
  httpActionGeneric,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import { ConvexError, type Infer, v } from "convex/values";
import schema from "../component/schema.js";
import {
  type RunMutationCtx,
  type RunSchedulerMutationCtx,
  type RunQueryCtx,
  convertToDatabaseSubscription,
  convertToOrder,
  type RunActionCtx,
} from "../component/util.js";
import type { ComponentApi } from "../component/_generated/component.js";
import { resolveBillingSnapshot } from "../core/resolver.js";
import {
  findCreditGrantByProductId,
  findPlanById,
  isAppOwnedPlan,
  normalizePlanCatalog,
} from "../core/catalog.js";
import type {
  AppPlanActivation,
  AppPlanAssignment,
  CreditGrant,
  BillingSnapshot,
  PlanCatalog,
  ScheduledSubscriptionUpdate,
  SubscriptionSnapshot,
} from "../core/types.js";

export * from "../core/index.js";
export type { RunSchedulerMutationCtx } from "../component/util.js";
export {
  getEntityId,
  lowerCaseHeaders,
  toHex,
  constantTimeEqual,
  normalizeSignature,
} from "./helpers.js";
export {
  type CreemWebhookEvent,
  getEventType,
  getEventData,
  getCustomerId,
  getConvexEntityId,
  parseSubscription,
  parseCheckout,
  parseProduct,
  parseGeneratedWebhookEvent,
  parseRefund,
} from "./parsers.js";

type GeneratedSubscriptionWebhookEvent = Extract<
  WebhookEventEntity,
  { eventType: `subscription.${string}` }
>;

const isGeneratedSubscriptionWebhookEvent = (
  event: WebhookEventEntity | null,
): event is GeneratedSubscriptionWebhookEvent =>
  !!event && subscriptionWebhookEvents.has(event.eventType);

const getCustomerCreditAccounts = (
  response:
    | { result: { data: Array<AccountResponseDto> } }
    | { data?: Array<AccountResponseDto> },
) => ("result" in response ? response.result.data : (response.data ?? []));

const unwrapTransactionSearchPage = (
  page: TransactionListEntity | { result: TransactionListEntity },
): TransactionListEntity => ("result" in page ? page.result : page);

/** Convex validator for the `subscriptions` table. Use with `v.object(subscriptionValidator.fields)` in custom functions. */
export const subscriptionValidator = schema.tables.subscriptions.validator;
/** TypeScript type for a subscription document (inferred from the Convex schema). */
export type Subscription = Infer<typeof subscriptionValidator>;

// ── Shared arg validators for custom actions / mutations ──────────────
// Use these when writing your own Convex functions that wrap creem methods
// (e.g. for RBAC). They match exactly what the connected widgets send.

/**
 * Convex arg validator for checkout creation.
 * Matches the args sent by `<Subscription.Root>` and `<Product.Root>` widgets.
 * Use in your own `action()` definitions for custom RBAC wrappers.
 */
export const checkoutCreateArgs = {
  productId: v.string(),
  successUrl: v.optional(v.string()),
  fallbackSuccessUrl: v.optional(v.string()),
  units: v.optional(v.number()),
  metadata: v.optional(v.record(v.string(), v.string())),
  discountCode: v.optional(v.string()),
  theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
};

/**
 * Convex arg validator for subscription updates (plan switch or unit change).
 * Matches the args sent by `<Subscription.Root>` widgets.
 */
export const subscriptionUpdateArgs = {
  subscriptionId: v.optional(v.string()),
  productId: v.optional(v.string()),
  freePlanId: v.optional(v.string()),
  units: v.optional(v.number()),
  updateBehavior: v.optional(
    v.union(
      v.literal("proration-charge-immediately"),
      v.literal("proration-charge"),
      v.literal("proration-none"),
      v.literal("period-end"),
      v.literal("immediate"),
    ),
  ),
};

/**
 * Convex arg validator for subscription cancellation.
 * Matches the args sent by `<Subscription.Root>` cancel button.
 */
export const subscriptionCancelArgs = {
  subscriptionId: v.optional(v.string()),
  revokeImmediately: v.optional(v.boolean()),
};

/**
 * Convex arg validator for subscription resume.
 * Matches the args sent by `<Subscription.Root>` resume button.
 */
export const subscriptionResumeArgs = {
  subscriptionId: v.optional(v.string()),
};

export const subscriptionCancelScheduledUpdateArgs = {
  subscriptionId: v.optional(v.string()),
};

/**
 * Convex arg validator for subscription pause.
 * Matches the args sent by `<Subscription.Root>` pause button.
 */
export const subscriptionPauseArgs = {
  subscriptionId: v.optional(v.string()),
};

/**
 * Convex arg validator for app-owned plan activation.
 * Matches the args sent by `<Subscription.Root>` for `category: "free"`,
 * `category: "trial"`, and other custom app-owned plans.
 */
export const appPlanActivateArgs = {
  planId: v.string(),
};

/**
 * Convex arg validator for transaction history search.
 * Matches the args sent by `<BillingHistory>` widgets.
 */
export const transactionsSearchArgs = {
  customerId: v.optional(v.string()),
  orderId: v.optional(v.string()),
  productId: v.optional(v.string()),
  pageNumber: v.optional(v.number()),
  pageSize: v.optional(v.number()),
};

// ── Credits arg validators ────────────────────────────────────────────

/**
 * Convex arg validator for creating a credits account.
 * Matches the args sent by credits widgets or custom functions.
 */
export const creditsCreateAccountArgs = {
  name: v.optional(v.string()),
  unitLabel: v.optional(v.string()),
  initialBalance: v.optional(v.string()),
};

/**
 * Convex arg validator for getting credits balance.
 */
export const creditsGetBalanceArgs = {
  accountId: v.optional(v.string()),
};
const CUSTOMER_CHECKOUT_REQUIRED_ERROR = {
  message: "Customer not found — complete a checkout first",
} as const;

/**
 * Convex arg validator for crediting an account.
 */
export const creditsCreditArgs = {
  accountId: v.optional(v.string()),
  amount: v.string(),
  reference: v.string(),
  idempotencyKey: v.string(),
};

/**
 * Convex arg validator for debiting an account.
 */
export const creditsDebitArgs = {
  accountId: v.optional(v.string()),
  amount: v.string(),
  reference: v.string(),
  idempotencyKey: v.string(),
};

/**
 * Convex arg validator for listing credit entries (history).
 */
export const creditsListEntriesArgs = {
  accountId: v.optional(v.string()),
  limit: v.optional(v.number()),
  startingAfter: v.optional(v.string()),
};

/** Function reference type for internal mutations that receive a subscription document. */
export type SubscriptionHandler = FunctionReference<
  "mutation",
  "internal",
  { subscription: Subscription }
>;

/**
 * Map of webhook event type → handler function.
 * Handlers run **after** the component's built-in processing (customer/subscription/order upserts).
 * The `ctx` is a Convex action context — use `ctx.runQuery`,
 * `ctx.runMutation`, or `ctx.runAction` for app-specific work.
 *
 * @example
 * ```ts
 * creem.registerRoutes(http, {
 *   events: {
 *     "checkout.completed": async (ctx, event) => {
 *       // Grant entitlements, send emails, log analytics
 *     },
 *   },
 * });
 * ```
 */
export type WebhookEventHandlers = Record<
  string,
  (ctx: RunActionCtx, event: CreemWebhookEvent) => Promise<void> | void
>;

const subscriptionWebhookEvents = new Set([
  "subscription.active",
  "subscription.paid",
  "subscription.canceled",
  "subscription.scheduled_cancel",
  "subscription.past_due",
  "subscription.expired",
  "subscription.trialing",
  "subscription.paused",
  "subscription.unpaid",
  "subscription.update",
]);

const supportedWebhookEvents = new Set([
  "checkout.completed",
  ...subscriptionWebhookEvents,
  "refund.created",
  "dispute.created",
]);

/**
 * Callback that resolves the authenticated user for `creem.api({ resolve })`.
 * Called on every generated Convex function to determine the billing entity.
 *
 * - `userId` — your app's user ID (stored in checkout metadata as `convexUserId`)
 * - `email` — user's email (passed to Creem for customer creation)
 * - `entityId` — billing entity ID. For personal billing, same as `userId`.
 *   For org billing, return the org ID so all billing scopes to the organization.
 *
 * @example
 * ```ts
 * const resolve: ApiResolver = async (ctx) => {
 *   const user = await ctx.runQuery(api.users.currentUser);
 *   return { userId: user._id, email: user.email, entityId: user._id };
 * };
 * ```
 */
export type ApiResolver = (ctx: RunQueryCtx) => Promise<{
  userId: string;
  email: string;
  entityId: string;
  activePlanId?: string | null;
  activeFreePlanId?: string | null;
}>;

/**
 * Configuration for the Creem Convex component.
 * All fields are optional — environment variables are used as fallbacks.
 */
type CreemConfig = {
  /**
   * Default cancel mode for subscriptions.
   * - `"immediate"` — cancel and revoke access now
   * - `"scheduled"` — cancel at end of current billing period
   * - Omit to use Creem's store-level default.
   */
  cancelMode?: "immediate" | "scheduled";
  /** Creem API key. Falls back to `CREEM_API_KEY` env var. */
  apiKey?: string;
  /** Creem webhook signing secret. Falls back to `CREEM_WEBHOOK_SECRET` env var. */
  webhookSecret?: string;
  /** Creem SDK server. Falls back to `CREEM_SERVER` env var and defaults to production. */
  server?: "test" | "prod";
  /** Creem SDK server URL override (for test/staging). Falls back to `CREEM_SERVER_URL` env var. */
  serverURL?: string;
  /** Optional app-owned billing catalog used for server-side fulfillment such as Customer Credits grants. */
  billingCatalog?: PlanCatalog;
};

const resolveCreemServer = (
  server: string | undefined,
): "test" | "prod" | undefined => {
  if (!server) return undefined;
  if (server === "test" || server === "prod") return server;
  throw new Error(`Invalid Creem server ${server}`);
};

/**
 * Main entry point for the Creem–Convex integration.
 *
 * Instantiate once in your `convex/billing.ts` and use its methods
 * to manage subscriptions, checkouts, products, customers, and orders.
 *
 * **Two usage patterns:**
 * 1. **Quick start** — call `creem.api({ resolve })` to generate ready-to-export Convex functions
 * 2. **Full control** — use namespace getters (`creem.subscriptions.*`, `creem.checkouts.*`, etc.)
 *    directly in your own Convex functions for custom auth/RBAC
 *
 * @example
 * ```ts
 * import { Creem } from "@mmailaender/convex-creem";
 * import { components } from "./_generated/api";
 *
 * export const creem = new Creem(components.creem);
 * ```
 */
export class Creem {
  /** Direct access to the Creem SDK client, pre-configured with your API key. Use for resources without webhook sync (licenses, discounts, transactions). */
  public sdk: CreemSDK;
  private apiKey: string;
  private webhookSecret: string;
  private server?: "test" | "prod";
  private serverURL?: string;
  private billingCatalog?: PlanCatalog;

  constructor(
    public component: ComponentApi,
    private config: CreemConfig = {},
  ) {
    this.apiKey = config.apiKey ?? process.env["CREEM_API_KEY"] ?? "";
    this.webhookSecret =
      config.webhookSecret ?? process.env["CREEM_WEBHOOK_SECRET"] ?? "";
    this.server =
      config.server ?? resolveCreemServer(process.env["CREEM_SERVER"]);
    this.serverURL = config.serverURL ?? process.env["CREEM_SERVER_URL"];
    this.billingCatalog = normalizePlanCatalog(config.billingCatalog);

    this.sdk = new CreemSDK({
      apiKey: this.apiKey,
      ...(this.server ? { server: this.server } : {}),
      ...(this.serverURL ? { serverURL: this.serverURL } : {}),
    });
  }
  private getCustomerByEntityId(ctx: RunQueryCtx, entityId: string) {
    return ctx.runQuery(this.component.lib.getCustomerByEntityId, { entityId });
  }

  /** Pull all products from the Creem API into the Convex database. Typically called once via `internalAction` or the CLI. */
  async syncProducts(ctx: RunActionCtx) {
    await ctx.runAction(this.component.lib.syncProducts, {
      apiKey: this.apiKey,
      server: this.server,
      serverURL: this.serverURL,
    });
  }

  private async createCheckoutSession(
    ctx: RunMutationCtx,
    {
      productId,
      entityId,
      userId,
      email,
      successUrl,
      units,
      metadata,
    }: {
      productId: string;
      entityId: string;
      userId: string;
      email: string;
      successUrl?: string;
      units?: number;
      metadata?: Record<string, string>;
    },
  ): Promise<CheckoutEntity> {
    const dbCustomer = await ctx.runQuery(
      this.component.lib.getCustomerByEntityId,
      {
        entityId,
      },
    );

    const checkout = await this.sdk.checkouts.create({
      productId,
      ...(successUrl ? { successUrl } : {}),
      units,
      metadata: {
        ...(metadata ?? {}),
        convexUserId: userId,
        convexBillingEntityId: entityId,
      },
      customer: dbCustomer ? { id: dbCustomer.id } : { email },
    });

    if (!dbCustomer) {
      const customerId = getEntityId(checkout.customer);
      if (customerId) {
        const customerObj =
          typeof checkout.customer === "object" ? checkout.customer : undefined;
        await ctx.runMutation(this.component.lib.insertCustomer, {
          id: customerId,
          entityId,
          email: customerObj?.email,
          name: customerObj?.name ?? undefined,
          country: customerObj?.country,
          mode: customerObj?.mode,
        });
      }
    }

    return checkout;
  }

  private async createCustomerPortalSession(
    ctx: RunActionCtx,
    { entityId }: { entityId: string },
  ) {
    const customer = await ctx.runQuery(
      this.component.lib.getCustomerByEntityId,
      { entityId },
    );

    if (!customer) {
      throw new ConvexError("Customer not found");
    }

    const portal = await this.sdk.customers.generateBillingLinks({
      customerId: customer.id,
    });
    return { url: portal.customerPortalLink };
  }

  private listProducts(
    ctx: RunQueryCtx,
    { includeArchived }: { includeArchived?: boolean } = {},
  ) {
    return ctx.runQuery(this.component.lib.listProducts, {
      includeArchived,
    });
  }
  private async getCurrentSubscription(
    ctx: RunQueryCtx,
    { entityId }: { entityId: string },
  ) {
    const subscription = await ctx.runQuery(
      this.component.lib.getCurrentSubscription,
      {
        entityId,
      },
    );
    if (!subscription) {
      return null;
    }
    const product = await ctx.runQuery(this.component.lib.getProduct, {
      id: subscription.productId,
    });
    if (!product) {
      throw new ConvexError("Product not found");
    }
    return {
      ...subscription,
      product,
    };
  }
  /** Return active subscriptions for an entity, excluding ended and expired trials. */
  private listUserSubscriptions(
    ctx: RunQueryCtx,
    { entityId }: { entityId: string },
  ) {
    return ctx.runQuery(this.component.lib.listUserSubscriptions, {
      entityId,
    });
  }
  /** Return one-time orders for an entity. */
  private listUserOrders(ctx: RunQueryCtx, { entityId }: { entityId: string }) {
    return ctx.runQuery(this.component.lib.listUserOrders, {
      entityId,
    });
  }
  /** Return all subscriptions for an entity, including ended and expired trials. */
  private listAllUserSubscriptions(
    ctx: RunQueryCtx,
    { entityId }: { entityId: string },
  ) {
    return ctx.runQuery(this.component.lib.listAllUserSubscriptions, {
      entityId,
    });
  }
  private getProduct(ctx: RunQueryCtx, { productId }: { productId: string }) {
    return ctx.runQuery(this.component.lib.getProduct, { id: productId });
  }
  private listAppPlanActivations(
    ctx: RunQueryCtx,
    { entityId }: { entityId: string },
  ) {
    return ctx.runQuery(this.component.lib.listAppPlanActivations, {
      entityId,
    });
  }
  private listAppPlanAssignments(
    ctx: RunQueryCtx,
    { entityId }: { entityId: string },
  ) {
    return ctx.runQuery(this.component.lib.listAppPlanAssignments, {
      entityId,
    });
  }
  private toSubscriptionSnapshot(
    subscription: Subscription,
  ): SubscriptionSnapshot {
    return {
      id: subscription.id,
      productId: subscription.productId,
      status: subscription.status,
      recurringInterval: subscription.recurringInterval,
      units: subscription.seats,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEnd: subscription.trialEnd ?? null,
    };
  }

  /**
   * App-owned plan activation namespace.
   *
   * The component records activation history for eligibility and current
   * app-plan assignments for free, trial, or custom app-owned plans.
   */
  get appPlans() {
    return {
      /** List activation-history rows used for app-owned plan eligibility. */
      listActivations: (ctx: RunQueryCtx, { entityId }: { entityId: string }) =>
        this.listAppPlanActivations(ctx, { entityId }),
      /** List current, scheduled, and ended app-owned plan assignments. */
      listAssignments: (ctx: RunQueryCtx, { entityId }: { entityId: string }) =>
        this.listAppPlanAssignments(ctx, { entityId }),
      /** Return activation history for one app-owned plan. */
      getActivation: (
        ctx: RunQueryCtx,
        { entityId, planId }: { entityId: string; planId: string },
      ) =>
        ctx.runQuery(this.component.lib.getAppPlanActivation, {
          entityId,
          planId,
        }),
      /**
       * Activate an app-owned plan for the entity.
       *
       * This records activation history first, then writes an active
       * assignment. If the plan or explicit option is once-per-entity, repeated
       * activation throws a `ConvexError` before assignment state changes.
       */
      activate: async (
        ctx: RunMutationCtx,
        {
          entityId,
          planId,
          activatedByUserId,
          oncePerEntity,
        }: {
          entityId: string;
          planId: string;
          activatedByUserId?: string;
          oncePerEntity?: boolean;
        },
      ): Promise<AppPlanAssignment> => {
        const plan = findPlanById(this.billingCatalog, planId);
        if (this.billingCatalog && !plan) {
          throw new ConvexError(`Unknown app-owned plan: ${planId}`);
        }
        if (plan && !isAppOwnedPlan(plan)) {
          throw new ConvexError(`Plan "${planId}" is not an app-owned plan`);
        }

        await ctx.runMutation(this.component.lib.recordAppPlanActivation, {
          entityId,
          planId,
          activatedByUserId,
          oncePerEntity: oncePerEntity ?? plan?.eligibility?.oncePerEntity,
        });
        return await ctx.runMutation(this.component.lib.assignAppPlan, {
          entityId,
          planId,
          status: "active",
          source: plan?.category ?? "manual",
          assignedByUserId: activatedByUserId,
        });
      },
    };
  }

  /**
   * Resolve the backend billing snapshot for a billing entity.
   *
   * This is the public app-facing billing state contract. It keeps subscriptions
   * and one-time orders as arrays so apps can derive their own plan state without
   * depending on widget convenience fields.
   */
  async getBillingSnapshot(
    ctx: RunQueryCtx,
    {
      entityId,
    }: {
      entityId: string;
    },
  ): Promise<BillingSnapshot> {
    const [subscriptions, orders, appPlanAssignments] = await Promise.all([
      this.listAllUserSubscriptions(ctx, { entityId }),
      this.listUserOrders(ctx, { entityId }),
      this.listAppPlanAssignments(ctx, { entityId }),
    ]);

    return resolveBillingSnapshot({
      entityId,
      catalog: this.billingCatalog,
      subscriptions: (subscriptions ?? []).map((subscription) =>
        this.toSubscriptionSnapshot(subscription),
      ),
      orders: (orders ?? []).map((order) => ({
        orderId: order.id,
        productId: order.productId,
        status: order.status,
      })),
      appPlanAssignments: appPlanAssignments ?? [],
    });
  }

  private async constructWebhookEvent(
    body: string,
    headers: Record<string, string>,
  ) {
    if (!this.webhookSecret) {
      throw new ConvexError("Missing CREEM_WEBHOOK_SECRET");
    }
    return constructWebhookEventEntity(body, headers, this.webhookSecret);
  }

  /** Upsert a customer record if we have both entityId and customerId. */
  private async upsertCustomerFromWebhook(
    ctx: RunMutationCtx,
    customerId: string | null,
    entityId: string | null,
    customerEntity?: CustomerEntity | null,
  ) {
    if (!customerId || !entityId) return;
    try {
      await ctx.runMutation(this.component.lib.insertCustomer, {
        id: customerId,
        entityId,
        email: customerEntity?.email,
        name: customerEntity?.name ?? undefined,
        country: customerEntity?.country,
        mode: customerEntity?.mode,
        createdAt: customerEntity?.createdAt
          ? customerEntity.createdAt instanceof Date
            ? customerEntity.createdAt.toISOString()
            : String(customerEntity.createdAt)
          : undefined,
        updatedAt: customerEntity?.updatedAt
          ? customerEntity.updatedAt instanceof Date
            ? customerEntity.updatedAt.toISOString()
            : String(customerEntity.updatedAt)
          : undefined,
      });
    } catch {
      // insertCustomer is idempotent; ignore duplicate errors
    }
  }

  /** Resolve the default credits account ID for an entity. Finds or creates it. */
  private async resolveDefaultCreditAccountId(
    ctx: RunActionCtx,
    entityId: string,
  ): Promise<string> {
    const customer = await ctx.runQuery(
      this.component.lib.getCustomerByEntityId,
      { entityId },
    );
    if (!customer) {
      throw new ConvexError(CUSTOMER_CHECKOUT_REQUIRED_ERROR);
    }
    // Try to find existing default account
    const accounts = await this.sdk.customerCredits.listAccounts(
      10,
      customer.id,
    );
    const accountData = getCustomerCreditAccounts(accounts);
    const existing = accountData.find(
      (a) => a.name === "default" || a.name === "credits",
    );
    if (existing) return existing.id;
    // Auto-create a default credits account
    const created = await this.sdk.customerCredits.createAccount({
      customerId: customer.id,
      name: "credits",
      unitLabel: "credits",
    });
    return created.id;
  }

  private async resolveCreditAccountIdForCustomer(
    customerId: string,
    grant?: CreditGrant,
    { createIfMissing = true }: { createIfMissing?: boolean } = {},
  ): Promise<string | null> {
    const accountName = grant?.accountName ?? "credits";
    const accounts = await this.sdk.customerCredits.listAccounts(
      10,
      customerId,
    );
    const accountData = getCustomerCreditAccounts(accounts);
    const existing = accountData.find((a) => a.name === accountName);
    if (existing) return existing.id;

    const fallback =
      accountName === "credits"
        ? accountData.find((a) => a.name === "default")
        : undefined;
    if (fallback) return fallback.id;
    if (!createIfMissing) return null;

    const created = await this.sdk.customerCredits.createAccount({
      customerId,
      name: accountName,
      unitLabel: grant?.unitLabel ?? "credits",
    });
    return created.id;
  }

  private getCreditGrantForProduct(productId: string | undefined) {
    return findCreditGrantByProductId(this.billingCatalog, productId);
  }

  private async tolerateCustomerCreditsResponseValidation<T>(
    operation: () => Promise<T>,
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "ResponseValidationError"
      ) {
        return null;
      }
      throw error;
    }
  }

  private async creditCheckoutCustomerCredits(checkout: CheckoutEntity) {
    const order =
      checkout.order && typeof checkout.order === "object"
        ? (checkout.order as Record<string, unknown>)
        : undefined;
    const productId =
      typeof order?.product === "string"
        ? order.product
        : (getEntityId(checkout.product) ?? undefined);
    const grant = this.getCreditGrantForProduct(productId);
    const amount = grant?.amount.trim();
    if (!grant) {
      if (this.billingCatalog && productId) {
        console.warn(
          `[creem-webhook] no creditGrant configured for checkout product ${productId}`,
        );
      }
      return;
    }
    if (!amount) return;

    const customerId =
      typeof order?.customer === "string"
        ? order.customer
        : getCustomerId(
            typeof checkout.customer === "object" ? checkout.customer : null,
          );
    if (!customerId) return;

    const accountId = await this.resolveCreditAccountIdForCustomer(
      customerId,
      grant,
    );
    if (!accountId) return;
    await this.credits.credit(accountId, {
      amount,
      reference: `checkout:${checkout.id}`,
      idempotencyKey: `creem:checkout:${checkout.id}:credits:${productId}:${amount}`,
    });
  }

  private getRefundCreditDebitAmount(
    grant: CreditGrant,
    refundAmount: unknown,
    orderAmount: unknown,
  ): string | null {
    const amount = grant.amount.trim();
    const refundBehavior = grant.refundBehavior ?? "revoke_on_full_refund";
    if (!amount || refundBehavior === "none") return null;
    if (refundBehavior === "debit") return amount;

    const hasRefundAmounts =
      typeof refundAmount === "number" && typeof orderAmount === "number";

    if (refundBehavior === "revoke_on_full_refund") {
      if (!hasRefundAmounts || refundAmount <= 0 || orderAmount <= 0) {
        return null;
      }
      return refundAmount >= orderAmount ? amount : null;
    }

    if (!hasRefundAmounts) {
      return amount;
    }
    if (refundAmount <= 0 || orderAmount <= 0) return null;

    const grantAmount = BigInt(amount);
    const debitAmount =
      (grantAmount * BigInt(Math.min(refundAmount, orderAmount))) /
      BigInt(orderAmount);
    return debitAmount > 0n ? debitAmount.toString() : null;
  }

  private async debitRefundedCustomerCredits(refund: RefundEntity) {
    if (refund.status && refund.status !== "succeeded") return;
    const order =
      refund.order && typeof refund.order === "object"
        ? refund.order
        : undefined;
    const productId = order?.product;
    const grant = this.getCreditGrantForProduct(productId);
    if (!grant) return;

    const amount = this.getRefundCreditDebitAmount(
      grant,
      refund.refundAmount,
      order?.amountPaid ?? order?.amount,
    );
    if (!amount) return;

    const customerId = order?.customer ?? "";
    if (!customerId) return;

    const refundId = refund.id;
    const accountId = await this.resolveCreditAccountIdForCustomer(
      customerId,
      grant,
      { createIfMissing: false },
    );
    if (!accountId) return;
    await this.credits.debit(accountId, {
      amount,
      reference: `refund:${refundId}`,
      idempotencyKey: `creem:refund:${refundId}:credits:${productId}:${amount}`,
    });
  }

  private async cancelPendingScheduledUpdateSideEffects(
    ctx: RunSchedulerMutationCtx,
    args: {
      entityId: string;
      subscription: {
        id: string;
        status?: string;
        cancelAtPeriodEnd?: boolean;
      };
      keepScheduledCancellation: boolean;
    },
  ): Promise<boolean> {
    const pendingUpdates = (await ctx.runMutation(
      this.component.lib.cancelPendingScheduledSubscriptionUpdates,
      {
        entityId: args.entityId,
        subscriptionId: args.subscription.id,
      },
    )) as ScheduledSubscriptionUpdate[];
    const targetPlanIds = Array.from(
      new Set(
        pendingUpdates
          .map((update) => update.targetPlanId)
          .filter((planId): planId is string => Boolean(planId)),
      ),
    );

    for (const planId of targetPlanIds) {
      await ctx.runMutation(
        this.component.lib.cancelScheduledAppPlanAssignment,
        {
          subscriptionId: args.subscription.id,
          planId,
        },
      );
    }

    const shouldClearScheduledCancellation =
      !args.keepScheduledCancellation &&
      (targetPlanIds.length > 0 ||
        args.subscription.cancelAtPeriodEnd === true ||
        args.subscription.status === "scheduled_cancel");

    if (!shouldClearScheduledCancellation) return false;

    await ctx.runMutation(this.component.lib.patchSubscription, {
      subscriptionId: args.subscription.id,
      ...(args.subscription.status
        ? {
            status:
              args.subscription.status === "scheduled_cancel"
                ? "active"
                : args.subscription.status,
          }
        : {}),
      cancelAtPeriodEnd: false,
    });
    await ctx.scheduler.runAfter(
      0,
      this.component.lib.executeSubscriptionLifecycle,
      {
        apiKey: this.apiKey,
        server: this.server,
        serverURL: this.serverURL,
        subscriptionId: args.subscription.id,
        operation: "resume",
        ...(args.subscription.status
          ? { previousStatus: args.subscription.status }
          : {}),
        ...(args.subscription.cancelAtPeriodEnd !== undefined
          ? { previousCancelAtPeriodEnd: args.subscription.cancelAtPeriodEnd }
          : {}),
      },
    );
    return true;
  }

  private async schedulePeriodEndSubscriptionUpdate(
    ctx: RunSchedulerMutationCtx,
    args: {
      entityId: string;
      subscription: {
        id: string;
        currentPeriodEnd: string | null;
        status?: string;
        cancelAtPeriodEnd?: boolean;
      };
      productId?: string;
      freePlanId?: string;
      units?: number;
    },
  ) {
    if (!args.subscription.currentPeriodEnd) {
      throw new ConvexError(
        "Cannot schedule period-end update without currentPeriodEnd",
      );
    }
    const effectiveAt = new Date(args.subscription.currentPeriodEnd);
    if (Number.isNaN(effectiveAt.getTime())) {
      throw new ConvexError("Subscription currentPeriodEnd is invalid");
    }

    const scheduledUpdateId = await ctx.runMutation(
      this.component.lib.createScheduledSubscriptionUpdate,
      {
        entityId: args.entityId,
        subscriptionId: args.subscription.id,
        ...(args.productId ? { targetProductId: args.productId } : {}),
        ...(args.freePlanId ? { targetPlanId: args.freePlanId } : {}),
        ...(args.units !== undefined ? { targetUnits: args.units } : {}),
        effectiveAt: args.subscription.currentPeriodEnd,
      },
    );

    if (args.freePlanId) {
      await ctx.runMutation(this.component.lib.assignAppPlan, {
        entityId: args.entityId,
        planId: args.freePlanId,
        status: "scheduled",
        startsAt: args.subscription.currentPeriodEnd,
        source: "paid_to_free",
        subscriptionId: args.subscription.id,
      });
    }

    const scheduledFunctionId = await ctx.scheduler.runAt(
      effectiveAt,
      this.component.lib.applyScheduledSubscriptionUpdate,
      {
        apiKey: this.apiKey,
        server: this.server,
        serverURL: this.serverURL,
        scheduledUpdateId,
      },
    );

    await ctx.runMutation(
      this.component.lib.setScheduledSubscriptionUpdateJob,
      {
        scheduledUpdateId,
        scheduledFunctionId,
      },
    );

    if (args.freePlanId) {
      await ctx.runMutation(this.component.lib.patchSubscription, {
        subscriptionId: args.subscription.id,
        cancelAtPeriodEnd: true,
      });
      await ctx.scheduler.runAfter(
        0,
        this.component.lib.executeSubscriptionLifecycle,
        {
          apiKey: this.apiKey,
          server: this.server,
          serverURL: this.serverURL,
          subscriptionId: args.subscription.id,
          operation: "cancel",
          cancelMode: "scheduled",
          scheduledUpdateId,
          previousStatus: args.subscription.status,
          previousCancelAtPeriodEnd: args.subscription.cancelAtPeriodEnd,
        },
      );
    }
  }

  // ── Namespace getters (public API) ─────────────────────────

  /**
   * Subscription management namespace.
   *
   * All methods take explicit `entityId` — use them directly in your own
   * Convex functions, or let `creem.api({ resolve })` handle auth for you.
   *
   * - `.getCurrent()` — current active subscription with product join (Convex DB)
   * - `.list()` — active subscriptions, excludes ended + expired trials (Convex DB)
   * - `.listAll()` — all subscriptions including ended (Convex DB)
   * - `.update()` — plan switch (`productId`) or unit change (`units`) (Creem API, optimistic)
   * - `.cancel()` — cancel subscription (Creem API, optimistic)
   * - `.pause()` — pause an active subscription (Creem API, optimistic)
   * - `.resume()` — resume a paused or scheduled-cancel subscription (Creem API, optimistic)
   */
  get subscriptions() {
    type UpdateBehavior =
      | "proration-charge-immediately"
      | "proration-charge"
      | "proration-none"
      | "period-end"
      | "immediate";
    return {
      getCurrent: (ctx: RunQueryCtx, { entityId }: { entityId: string }) =>
        this.getCurrentSubscription(ctx, { entityId }),
      list: (ctx: RunQueryCtx, { entityId }: { entityId: string }) =>
        this.listUserSubscriptions(ctx, { entityId }),
      listAll: (ctx: RunQueryCtx, { entityId }: { entityId: string }) =>
        this.listAllUserSubscriptions(ctx, { entityId }),
      update: async (
        ctx: RunSchedulerMutationCtx,
        args: {
          entityId: string;
          subscriptionId?: string;
          productId?: string;
          freePlanId?: string;
          units?: number;
          updateBehavior?: UpdateBehavior;
        },
      ) => {
        const targetCount =
          (args.productId ? 1 : 0) +
          (args.freePlanId ? 1 : 0) +
          (args.units !== undefined ? 1 : 0);
        if (targetCount !== 1) {
          throw new ConvexError(
            "Provide exactly one update target: productId, freePlanId, or units",
          );
        }
        const updateBehavior =
          args.updateBehavior ?? (args.freePlanId ? "period-end" : undefined);
        if (
          args.freePlanId &&
          updateBehavior !== "period-end" &&
          updateBehavior !== "immediate"
        ) {
          throw new ConvexError(
            'freePlanId updates support updateBehavior: "period-end" or "immediate"',
          );
        }
        if (!args.freePlanId && updateBehavior === "immediate") {
          throw new ConvexError(
            'updateBehavior: "immediate" is only supported for freePlanId updates',
          );
        }

        // Resolve current subscription
        const subscription = args.subscriptionId
          ? await ctx.runQuery(this.component.lib.getSubscription, {
              id: args.subscriptionId,
            })
          : await ctx.runQuery(this.component.lib.getCurrentSubscription, {
              entityId: args.entityId,
            });
        if (!subscription) throw new ConvexError("Subscription not found");

        const resumeScheduledCancellation =
          updateBehavior !== "period-end" || !args.freePlanId
            ? await this.cancelPendingScheduledUpdateSideEffects(ctx, {
                entityId: args.entityId,
                subscription,
                keepScheduledCancellation: Boolean(args.freePlanId),
              })
            : false;

        if (updateBehavior === "period-end") {
          await this.schedulePeriodEndSubscriptionUpdate(ctx, {
            entityId: args.entityId,
            subscription,
            productId: args.productId,
            freePlanId: args.freePlanId,
            units: args.units,
          });
          return;
        }

        if (args.freePlanId && updateBehavior === "immediate") {
          await ctx.runMutation(this.component.lib.patchSubscription, {
            subscriptionId: subscription.id,
            status: "canceled",
            cancelAtPeriodEnd: false,
          });
          await ctx.runMutation(this.component.lib.assignAppPlan, {
            entityId: args.entityId,
            planId: args.freePlanId,
            status: "active",
            source: "paid_to_free",
            subscriptionId: subscription.id,
          });
          await ctx.scheduler.runAfter(
            0,
            this.component.lib.executeSubscriptionLifecycle,
            {
              apiKey: this.apiKey,
              server: this.server,
              serverURL: this.serverURL,
              subscriptionId: subscription.id,
              operation: "cancel",
              cancelMode: "immediate",
              previousStatus: subscription.status,
              previousCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            },
          );
          return;
        }

        // Write optimistic state
        await ctx.runMutation(this.component.lib.patchSubscription, {
          subscriptionId: subscription.id,
          ...(args.units != null ? { seats: args.units } : {}),
          ...(args.productId ? { productId: args.productId } : {}),
          ...(args.productId && args.units == null
            ? { seats: subscription.seats ?? null }
            : {}),
        });

        // Schedule the Creem API call (runs async, reverts on error)
        await ctx.scheduler.runAfter(
          0,
          this.component.lib.executeSubscriptionUpdate,
          {
            apiKey: this.apiKey,
            server: this.server,
            serverURL: this.serverURL,
            subscriptionId: subscription.id,
            productId: args.productId,
            units: args.units,
            updateBehavior,
            resumeScheduledCancellation,
            previousSeats: subscription.seats ?? undefined,
            previousProductId: subscription.productId,
          },
        );
      },
      cancel: async (
        ctx: RunSchedulerMutationCtx,
        args: {
          entityId: string;
          subscriptionId?: string;
          revokeImmediately?: boolean;
        },
      ) => {
        const subscription = args.subscriptionId
          ? await ctx.runQuery(this.component.lib.getSubscription, {
              id: args.subscriptionId,
            })
          : await ctx.runQuery(this.component.lib.getCurrentSubscription, {
              entityId: args.entityId,
            });
        if (!subscription) throw new ConvexError("Subscription not found");
        if (
          subscription.status !== "active" &&
          subscription.status !== "trialing"
        ) {
          throw new ConvexError("Subscription is not active");
        }

        // Resolve cancel mode: explicit arg > config default > omit (Creem decides)
        const immediate =
          args.revokeImmediately ??
          (this.config.cancelMode === "immediate" ? true : undefined);
        const isImmediate = immediate === true;

        // Write optimistic state
        await ctx.runMutation(this.component.lib.patchSubscription, {
          subscriptionId: subscription.id,
          ...(isImmediate
            ? { status: "canceled", cancelAtPeriodEnd: false }
            : { cancelAtPeriodEnd: true }),
        });

        // Resolve cancel mode string for the action
        const cancelMode = isImmediate
          ? "immediate"
          : immediate === false || this.config.cancelMode === "scheduled"
            ? "scheduled"
            : undefined;

        // Schedule the Creem API call
        await ctx.scheduler.runAfter(
          0,
          this.component.lib.executeSubscriptionLifecycle,
          {
            apiKey: this.apiKey,
            server: this.server,
            serverURL: this.serverURL,
            subscriptionId: subscription.id,
            operation: "cancel",
            cancelMode,
            previousStatus: subscription.status,
            previousCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          },
        );
      },
      pause: async (
        ctx: RunSchedulerMutationCtx,
        args: { entityId: string; subscriptionId?: string },
      ) => {
        const subscription = args.subscriptionId
          ? await ctx.runQuery(this.component.lib.getSubscription, {
              id: args.subscriptionId,
            })
          : await ctx.runQuery(this.component.lib.getCurrentSubscription, {
              entityId: args.entityId,
            });
        if (!subscription) throw new ConvexError("Subscription not found");
        if (
          subscription.status !== "active" &&
          subscription.status !== "trialing"
        ) {
          throw new ConvexError("Subscription is not active");
        }

        // Write optimistic state
        await ctx.runMutation(this.component.lib.patchSubscription, {
          subscriptionId: subscription.id,
          status: "paused",
        });

        // Schedule the Creem API call
        await ctx.scheduler.runAfter(
          0,
          this.component.lib.executeSubscriptionLifecycle,
          {
            apiKey: this.apiKey,
            server: this.server,
            serverURL: this.serverURL,
            subscriptionId: subscription.id,
            operation: "pause",
            previousStatus: subscription.status,
          },
        );
      },
      resume: async (
        ctx: RunSchedulerMutationCtx,
        args: { entityId: string; subscriptionId?: string },
      ) => {
        const subscription = args.subscriptionId
          ? await ctx.runQuery(this.component.lib.getSubscription, {
              id: args.subscriptionId,
            })
          : await ctx.runQuery(this.component.lib.getCurrentSubscription, {
              entityId: args.entityId,
            });
        if (!subscription) throw new ConvexError("Subscription not found");
        if (
          subscription.status !== "scheduled_cancel" &&
          subscription.status !== "paused"
        ) {
          throw new ConvexError("Subscription is not in a resumable state");
        }

        // Write optimistic state
        await ctx.runMutation(this.component.lib.patchSubscription, {
          subscriptionId: subscription.id,
          status: "active",
          cancelAtPeriodEnd: false,
        });

        // Schedule the Creem API call
        await ctx.scheduler.runAfter(
          0,
          this.component.lib.executeSubscriptionLifecycle,
          {
            apiKey: this.apiKey,
            server: this.server,
            serverURL: this.serverURL,
            subscriptionId: subscription.id,
            operation: "resume",
            previousStatus: subscription.status,
            previousCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          },
        );
      },
      cancelScheduledUpdate: async (
        ctx: RunSchedulerMutationCtx,
        args: { entityId: string; subscriptionId?: string },
      ): Promise<{ canceled: boolean }> => {
        const subscription = args.subscriptionId
          ? await ctx.runQuery(this.component.lib.getSubscription, {
              id: args.subscriptionId,
            })
          : await ctx.runQuery(this.component.lib.getCurrentSubscription, {
              entityId: args.entityId,
            });
        if (!subscription) throw new ConvexError("Subscription not found");

        const canceledUpdate = await ctx.runMutation(
          this.component.lib.cancelScheduledSubscriptionUpdate,
          {
            entityId: args.entityId,
            subscriptionId: subscription.id,
          },
        );
        if (!canceledUpdate) return { canceled: false };

        if (canceledUpdate.targetPlanId) {
          await ctx.runMutation(
            this.component.lib.cancelScheduledAppPlanAssignment,
            {
              subscriptionId: subscription.id,
              planId: canceledUpdate.targetPlanId,
            },
          );
          await ctx.runMutation(this.component.lib.patchSubscription, {
            subscriptionId: subscription.id,
            status:
              subscription.status === "scheduled_cancel"
                ? "active"
                : subscription.status,
            cancelAtPeriodEnd: false,
          });
          await ctx.scheduler.runAfter(
            0,
            this.component.lib.executeSubscriptionLifecycle,
            {
              apiKey: this.apiKey,
              server: this.server,
              serverURL: this.serverURL,
              subscriptionId: subscription.id,
              operation: "resume",
              previousStatus: subscription.status,
              previousCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            },
          );
        }

        return { canceled: true };
      },
      /**
       * Cancel to free plan — temporary workaround until Creem supports native free plans.
       *
       * Schedules the active subscription for cancellation at period end, then
       * the app should activate its app-owned free plan via the
       * `subscription.canceled` or `subscription.scheduled_cancel` webhook event.
       *
       * This is NOT a general plan-change API. For paid→paid transitions use `.update()`.
       * For normal cancellation use `.cancel()`. This method exists solely as the
       * intermediate bridge for "paid subscription ends → app activates free plan".
       *
       * @param ctx - Convex mutation context with scheduler
       * @param args.entityId - Billing entity ID
       * @param args.subscriptionId - Optional subscription ID (resolves current if omitted)
       * @param args.freePlanId - Stable plan ID for the free plan (e.g. `"free"`)
       * @returns The freePlanId, to be used by the app in webhook handlers
       */
      cancelToFreePlan: async (
        ctx: RunSchedulerMutationCtx,
        args: {
          entityId: string;
          subscriptionId?: string;
          freePlanId: string;
        },
      ): Promise<{ freePlanId: string }> => {
        const subscription = args.subscriptionId
          ? await ctx.runQuery(this.component.lib.getSubscription, {
              id: args.subscriptionId,
            })
          : await ctx.runQuery(this.component.lib.getCurrentSubscription, {
              entityId: args.entityId,
            });
        if (!subscription) throw new ConvexError("Subscription not found");
        if (
          subscription.status !== "active" &&
          subscription.status !== "trialing"
        ) {
          throw new ConvexError("Subscription is not active");
        }

        await this.schedulePeriodEndSubscriptionUpdate(ctx, {
          entityId: args.entityId,
          subscription,
          freePlanId: args.freePlanId,
        });

        return { freePlanId: args.freePlanId };
      },
    };
  }

  /**
   * Checkout namespace.
   *
   * - `.create()` — create a checkout URL with 3-tier `successUrl` resolution and optional `theme` (Creem API)
   */
  get checkouts() {
    return {
      create: async (
        ctx: RunActionCtx,
        args: {
          entityId: string;
          userId: string;
          email: string;
          productId: string;
          successUrl?: string;
          fallbackSuccessUrl?: string;
          units?: number;
          metadata?: Record<string, string>;
          discountCode?: string;
          theme?: "light" | "dark";
        },
      ): Promise<{ url: string }> => {
        // 3-tier successUrl resolution
        let resolvedSuccessUrl = args.successUrl;
        if (!resolvedSuccessUrl) {
          const product = await ctx.runQuery(this.component.lib.getProduct, {
            id: args.productId,
          });
          resolvedSuccessUrl = product?.defaultSuccessUrl ?? undefined;
        }
        if (!resolvedSuccessUrl) {
          resolvedSuccessUrl = args.fallbackSuccessUrl;
        }

        const checkout = await this.createCheckoutSession(ctx, {
          productId: args.productId,
          entityId: args.entityId,
          userId: args.userId,
          email: args.email,
          ...(resolvedSuccessUrl ? { successUrl: resolvedSuccessUrl } : {}),
          units: args.units,
          metadata: args.metadata,
        });
        let checkoutUrl = checkout.checkoutUrl;
        if (!checkoutUrl)
          throw new ConvexError("Checkout URL missing from Creem response");
        if (args.theme) {
          const separator = checkoutUrl.includes("?") ? "&" : "?";
          checkoutUrl = `${checkoutUrl}${separator}theme=${args.theme}`;
        }
        return { url: checkoutUrl };
      },
    };
  }

  /**
   * Product namespace. All reads come from the local Convex DB (synced via webhooks).
   *
   * - `.list()` — all synced products (public, no `entityId` needed)
   * - `.get()` — single product by Creem product ID
   */
  get products() {
    return {
      list: (ctx: RunQueryCtx, options?: { includeArchived?: boolean }) =>
        this.listProducts(ctx, options),
      get: (ctx: RunQueryCtx, { productId }: { productId: string }) =>
        this.getProduct(ctx, { productId }),
    };
  }

  /**
   * Customer namespace.
   *
   * - `.retrieve()` — customer record by billing entity (Convex DB)
   * - `.portalUrl()` — generate a Creem customer billing portal URL (Creem API)
   */
  get customers() {
    return {
      retrieve: (ctx: RunQueryCtx, { entityId }: { entityId: string }) =>
        this.getCustomerByEntityId(ctx, entityId),
      portalUrl: (ctx: RunActionCtx, { entityId }: { entityId: string }) =>
        this.createCustomerPortalSession(ctx, { entityId }),
    };
  }

  /**
   * Order namespace.
   *
   * - `.list()` — one-time orders for a billing entity (Convex DB)
   */
  get orders() {
    return {
      list: (ctx: RunQueryCtx, { entityId }: { entityId: string }) =>
        this.listUserOrders(ctx, { entityId }),
    };
  }

  /**
   * Credits namespace. Wraps Creem Customer Credits API.
   *
   * - `.createAccount()` — create a credits account for a customer
   * - `.getBalance()` — get current balance
   * - `.credit()` — add credits
   * - `.debit()` — consume/spend credits
   * - `.listEntries()` — paginated transaction history
   * - `.listAccounts()` — list all accounts for a customer
   */
  get credits() {
    return {
      createAccount: async (args: {
        customerId: string;
        name?: string;
        unitLabel?: string;
        initialBalance?: string;
      }) => {
        return await this.sdk.customerCredits.createAccount({
          customerId: args.customerId,
          name: args.name,
          unitLabel: args.unitLabel,
          initialBalance: args.initialBalance,
        });
      },
      getBalance: async (accountId: string) => {
        return await this.sdk.customerCredits.getAccountBalance(accountId);
      },
      credit: async (
        accountId: string,
        args: { amount: string; reference: string; idempotencyKey: string },
      ) => {
        return await this.tolerateCustomerCreditsResponseValidation(() =>
          this.sdk.customerCredits.creditAccount(accountId, args),
        );
      },
      debit: async (
        accountId: string,
        args: { amount: string; reference: string; idempotencyKey: string },
      ) => {
        return await this.tolerateCustomerCreditsResponseValidation(() =>
          this.sdk.customerCredits.debitAccount(accountId, args),
        );
      },
      listEntries: async (
        accountId: string,
        limit?: number,
        startingAfter?: string,
      ) => {
        return await this.sdk.customerCredits.listEntries(
          accountId,
          limit,
          startingAfter,
        );
      },
      listAccounts: async (customerId?: string, limit?: number) => {
        return await this.sdk.customerCredits.listAccounts(limit, customerId);
      },
    };
  }

  // ── Component helpers (public, flat) ──────────────────────

  /**
   * Composite billing model for connected widgets.
   *
   * Aggregates the snapshot, products, subscriptions, and orders into a single
   * object that `<Subscription.Root>` and `<Product.Root>` consume.
   *
   * Graceful when `entityId` is `null` — returns public product catalog only
   * (useful for unauthenticated pricing pages).
   *
   * @param ctx - Convex query context
   * @param options.entityId - Billing entity ID, or `null` for public-only data
   * @param options.user - User info for the UI (widgets display email, etc.)
   */
  async getBillingModel(
    ctx: RunQueryCtx,
    {
      entityId,
      user,
      activePlanId,
      activeFreePlanId,
    }: {
      entityId: string | null;
      user?: { _id: string; email: string } | null;
      activePlanId?: string | null;
      activeFreePlanId?: string | null;
    },
  ) {
    const products = await this.listProducts(ctx);
    if (!entityId) {
      return {
        user: user ?? null,
        catalog: this.billingCatalog ?? null,
        snapshot: null as BillingSnapshot | null,
        allProducts: products,
        ownedProductIds: [] as string[],
        subscriptionProductId: null as string | null,
        activePlanId: activePlanId ?? activeFreePlanId ?? null,
        activeFreePlanId: activeFreePlanId ?? null,
        appPlanActivations: [] as AppPlanActivation[],
        appPlanAssignments: [] as AppPlanAssignment[],
        activeSubscriptions: [] as Array<{
          id: string;
          productId: string;
          status: string;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: string | null;
          currentPeriodStart: string;
          units: number | null;
          recurringInterval: string | null;
          trialEnd: string | null;
        }>,
        scheduledSubscriptionUpdates: [] as Array<
          Infer<typeof schema.tables.scheduledSubscriptionUpdates.validator>
        >,
        hasCreemCustomer: false,
      };
    }
    const [
      snapshot,
      subscription,
      activeSubscriptions,
      customer,
      scheduledSubscriptionUpdates,
      appPlanActivations,
      appPlanAssignments,
    ] = await Promise.all([
      this.getBillingSnapshot(ctx, { entityId }),
      this.getCurrentSubscription(ctx, { entityId }),
      this.listUserSubscriptions(ctx, { entityId }),
      this.getCustomerByEntityId(ctx, entityId),
      ctx.runQuery(this.component.lib.listPendingScheduledSubscriptionUpdates, {
        entityId,
      }),
      this.listAppPlanActivations(ctx, { entityId }),
      this.listAppPlanAssignments(ctx, { entityId }),
    ]);
    const ownedProductIds = [
      ...new Set(
        snapshot.orders
          .filter((order) => order.status === "paid")
          .map((order) => order.productId),
      ),
    ];
    const activeAssignedPlanId =
      (appPlanAssignments ?? []).find(
        (assignment) => assignment.status === "active",
      )?.planId ?? null;
    return {
      user: user ?? null,
      catalog: this.billingCatalog ?? null,
      snapshot,
      allProducts: products,
      ownedProductIds,
      subscriptionProductId: subscription?.productId ?? null,
      activePlanId: activePlanId ?? activeFreePlanId ?? activeAssignedPlanId,
      activeFreePlanId: activeFreePlanId ?? null,
      appPlanActivations: appPlanActivations ?? [],
      appPlanAssignments: appPlanAssignments ?? [],
      activeSubscriptions: activeSubscriptions.map((s) => ({
        id: s.id,
        productId: s.productId,
        status: s.status,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd,
        currentPeriodEnd: s.currentPeriodEnd,
        currentPeriodStart: s.currentPeriodStart,
        units: s.seats,
        recurringInterval: s.recurringInterval,
        trialEnd: s.trialEnd ?? null,
      })),
      scheduledSubscriptionUpdates: scheduledSubscriptionUpdates ?? [],
      hasCreemCustomer: customer != null,
    };
  }

  // ── api({ resolve }) convenience ──────────────────────────

  /**
   * Generate ready-to-export Convex function definitions.
   *
   * Each function calls your `resolve` callback to authenticate the user
   * and determine the billing entity, then delegates to the corresponding
   * namespace method. Destructure and re-export in your `convex/billing.ts`.
   *
   * For full control, use the namespace getters directly instead
   * (e.g. `creem.subscriptions.cancel(ctx, { entityId })`).
   *
   * @param options.resolve - Auth callback that returns `{ userId, email, entityId }`
   * @returns Object with `uiModel`, `snapshot`, `checkouts`, `subscriptions`, `products`, `customers`, `orders`
   *
   * @example
   * ```ts
   * const { uiModel, checkouts, subscriptions } = creem.api({ resolve });
   * export { uiModel };
   * export const checkoutsCreate = checkouts.create;
   * ```
   */
  api({ resolve }: { resolve: ApiResolver }) {
    return {
      uiModel: queryGeneric({
        args: {},
        returns: v.any(),
        handler: async (ctx) => {
          let resolved: {
            userId: string;
            email: string;
            entityId: string;
            activePlanId?: string | null;
            activeFreePlanId?: string | null;
          } | null = null;
          try {
            resolved = await resolve(ctx);
          } catch {
            // No authenticated user — return unauthenticated model
          }
          return await this.getBillingModel(ctx, {
            entityId: resolved?.entityId ?? null,
            user: resolved
              ? { _id: resolved.userId, email: resolved.email }
              : null,
            activeFreePlanId: resolved?.activeFreePlanId,
            activePlanId: resolved?.activePlanId,
          });
        },
      }),
      snapshot: queryGeneric({
        args: {},
        returns: v.any(),
        handler: async (ctx) => {
          let resolved: { entityId: string } | null;
          try {
            resolved = await resolve(ctx);
          } catch {
            return null;
          }
          if (!resolved) return null;
          return await this.getBillingSnapshot(ctx, {
            entityId: resolved.entityId,
          });
        },
      }),
      checkouts: {
        create: actionGeneric({
          args: checkoutCreateArgs,
          returns: v.object({ url: v.string() }),
          handler: async (ctx, args) => {
            const { entityId, userId, email } = await resolve(ctx);
            return await this.checkouts.create(ctx, {
              entityId,
              userId,
              email,
              ...args,
            });
          },
        }),
      },
      subscriptions: {
        update: mutationGeneric({
          args: subscriptionUpdateArgs,
          handler: async (ctx, args) => {
            const { entityId } = await resolve(ctx);
            const targetCount =
              (args.productId ? 1 : 0) +
              (args.freePlanId ? 1 : 0) +
              (args.units !== undefined ? 1 : 0);
            if (targetCount !== 1) {
              throw new ConvexError(
                "Provide exactly one update target: productId, freePlanId, or units",
              );
            }
            const updateBehavior =
              args.updateBehavior ??
              (args.freePlanId ? "period-end" : undefined);
            if (
              args.freePlanId &&
              updateBehavior !== "period-end" &&
              updateBehavior !== "immediate"
            ) {
              throw new ConvexError(
                'freePlanId updates support updateBehavior: "period-end" or "immediate"',
              );
            }
            if (!args.freePlanId && updateBehavior === "immediate") {
              throw new ConvexError(
                'updateBehavior: "immediate" is only supported for freePlanId updates',
              );
            }

            // Resolve current subscription
            const subscription = args.subscriptionId
              ? await ctx.runQuery(this.component.lib.getSubscription, {
                  id: args.subscriptionId,
                })
              : await ctx.runQuery(this.component.lib.getCurrentSubscription, {
                  entityId,
                });
            if (!subscription) throw new ConvexError("Subscription not found");

            const resumeScheduledCancellation =
              updateBehavior !== "period-end" || !args.freePlanId
                ? await this.cancelPendingScheduledUpdateSideEffects(ctx, {
                    entityId,
                    subscription,
                    keepScheduledCancellation: Boolean(args.freePlanId),
                  })
                : false;

            if (updateBehavior === "period-end") {
              await this.schedulePeriodEndSubscriptionUpdate(ctx, {
                entityId,
                subscription,
                productId: args.productId,
                freePlanId: args.freePlanId,
                units: args.units,
              });
              return;
            }

            if (args.freePlanId && updateBehavior === "immediate") {
              await ctx.runMutation(this.component.lib.patchSubscription, {
                subscriptionId: subscription.id,
                status: "canceled",
                cancelAtPeriodEnd: false,
              });
              await ctx.runMutation(this.component.lib.assignAppPlan, {
                entityId,
                planId: args.freePlanId,
                status: "active",
                source: "paid_to_free",
                subscriptionId: subscription.id,
              });
              await ctx.scheduler.runAfter(
                0,
                this.component.lib.executeSubscriptionLifecycle,
                {
                  apiKey: this.apiKey,
                  server: this.server,
                  serverURL: this.serverURL,
                  subscriptionId: subscription.id,
                  operation: "cancel",
                  cancelMode: "immediate",
                  previousStatus: subscription.status,
                  previousCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                },
              );
              return;
            }

            // Write optimistic state
            // For plan switches, also protect current units from stale webhook data
            await ctx.runMutation(this.component.lib.patchSubscription, {
              subscriptionId: subscription.id,
              ...(args.units != null ? { seats: args.units } : {}),
              ...(args.productId ? { productId: args.productId } : {}),
              ...(args.productId && args.units == null
                ? { seats: subscription.seats ?? null }
                : {}),
            });

            // Schedule the Creem API call (runs async, reverts on error)
            await ctx.scheduler.runAfter(
              0,
              this.component.lib.executeSubscriptionUpdate,
              {
                apiKey: this.apiKey,
                server: this.server,
                serverURL: this.serverURL,
                subscriptionId: subscription.id,
                productId: args.productId,
                units: args.units,
                updateBehavior,
                resumeScheduledCancellation,
                previousSeats: subscription.seats ?? undefined,
                previousProductId: subscription.productId,
              },
            );
          },
        }),
        cancel: mutationGeneric({
          args: subscriptionCancelArgs,
          handler: async (ctx, args) => {
            const { entityId } = await resolve(ctx);
            const subscription = args.subscriptionId
              ? await ctx.runQuery(this.component.lib.getSubscription, {
                  id: args.subscriptionId,
                })
              : await ctx.runQuery(this.component.lib.getCurrentSubscription, {
                  entityId,
                });
            if (!subscription) throw new ConvexError("Subscription not found");
            if (
              subscription.status !== "active" &&
              subscription.status !== "trialing"
            ) {
              throw new ConvexError("Subscription is not active");
            }

            // Resolve cancel mode: explicit arg > config default > omit (Creem decides)
            const immediate =
              args.revokeImmediately ??
              (this.config.cancelMode === "immediate" ? true : undefined);
            const isImmediate = immediate === true;

            // Write optimistic state
            await ctx.runMutation(this.component.lib.patchSubscription, {
              subscriptionId: subscription.id,
              ...(isImmediate
                ? { status: "canceled", cancelAtPeriodEnd: false }
                : { cancelAtPeriodEnd: true }),
            });

            // Resolve cancel mode string for the action
            const cancelMode = isImmediate
              ? "immediate"
              : immediate === false || this.config.cancelMode === "scheduled"
                ? "scheduled"
                : undefined;

            // Schedule the Creem API call
            await ctx.scheduler.runAfter(
              0,
              this.component.lib.executeSubscriptionLifecycle,
              {
                apiKey: this.apiKey,
                server: this.server,
                serverURL: this.serverURL,
                subscriptionId: subscription.id,
                operation: "cancel",
                cancelMode,
                previousStatus: subscription.status,
                previousCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              },
            );
          },
        }),
        resume: mutationGeneric({
          args: subscriptionResumeArgs,
          handler: async (ctx, args) => {
            const { entityId } = await resolve(ctx);
            const subscription = args.subscriptionId
              ? await ctx.runQuery(this.component.lib.getSubscription, {
                  id: args.subscriptionId,
                })
              : await ctx.runQuery(this.component.lib.getCurrentSubscription, {
                  entityId,
                });
            if (!subscription) throw new ConvexError("Subscription not found");
            if (
              subscription.status !== "scheduled_cancel" &&
              subscription.status !== "paused"
            ) {
              throw new ConvexError("Subscription is not in a resumable state");
            }

            // Write optimistic state
            await ctx.runMutation(this.component.lib.patchSubscription, {
              subscriptionId: subscription.id,
              status: "active",
              cancelAtPeriodEnd: false,
            });

            // Schedule the Creem API call
            await ctx.scheduler.runAfter(
              0,
              this.component.lib.executeSubscriptionLifecycle,
              {
                apiKey: this.apiKey,
                server: this.server,
                serverURL: this.serverURL,
                subscriptionId: subscription.id,
                operation: "resume",
                previousStatus: subscription.status,
                previousCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              },
            );
          },
        }),
        cancelScheduledUpdate: mutationGeneric({
          args: subscriptionCancelScheduledUpdateArgs,
          returns: v.object({ canceled: v.boolean() }),
          handler: async (ctx, args) => {
            const { entityId } = await resolve(ctx);
            const subscription = args.subscriptionId
              ? await ctx.runQuery(this.component.lib.getSubscription, {
                  id: args.subscriptionId,
                })
              : await ctx.runQuery(this.component.lib.getCurrentSubscription, {
                  entityId,
                });
            if (!subscription) throw new ConvexError("Subscription not found");

            const canceledUpdate = await ctx.runMutation(
              this.component.lib.cancelScheduledSubscriptionUpdate,
              {
                entityId,
                subscriptionId: subscription.id,
              },
            );
            if (!canceledUpdate) return { canceled: false };

            if (canceledUpdate.targetPlanId) {
              await ctx.runMutation(
                this.component.lib.cancelScheduledAppPlanAssignment,
                {
                  subscriptionId: subscription.id,
                  planId: canceledUpdate.targetPlanId,
                },
              );
              await ctx.runMutation(this.component.lib.patchSubscription, {
                subscriptionId: subscription.id,
                status:
                  subscription.status === "scheduled_cancel"
                    ? "active"
                    : subscription.status,
                cancelAtPeriodEnd: false,
              });
              await ctx.scheduler.runAfter(
                0,
                this.component.lib.executeSubscriptionLifecycle,
                {
                  apiKey: this.apiKey,
                  server: this.server,
                  serverURL: this.serverURL,
                  subscriptionId: subscription.id,
                  operation: "resume",
                  previousStatus: subscription.status,
                  previousCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                },
              );
            }

            return { canceled: true };
          },
        }),
        pause: mutationGeneric({
          args: subscriptionPauseArgs,
          handler: async (ctx, args) => {
            const { entityId } = await resolve(ctx);
            const subscription = args.subscriptionId
              ? await ctx.runQuery(this.component.lib.getSubscription, {
                  id: args.subscriptionId,
                })
              : await ctx.runQuery(this.component.lib.getCurrentSubscription, {
                  entityId,
                });
            if (!subscription) throw new ConvexError("Subscription not found");
            if (
              subscription.status !== "active" &&
              subscription.status !== "trialing"
            ) {
              throw new ConvexError("Subscription is not active");
            }

            // Write optimistic state
            await ctx.runMutation(this.component.lib.patchSubscription, {
              subscriptionId: subscription.id,
              status: "paused",
            });

            // Schedule the Creem API call
            await ctx.scheduler.runAfter(
              0,
              this.component.lib.executeSubscriptionLifecycle,
              {
                apiKey: this.apiKey,
                server: this.server,
                serverURL: this.serverURL,
                subscriptionId: subscription.id,
                operation: "pause",
                previousStatus: subscription.status,
              },
            );
          },
        }),
        list: queryGeneric({
          args: {},
          returns: v.any(),
          handler: async (ctx) => {
            const { entityId } = await resolve(ctx);
            return await this.subscriptions.list(ctx, { entityId });
          },
        }),
        listAll: queryGeneric({
          args: {},
          returns: v.array(
            v.object({
              ...schema.tables.subscriptions.validator.fields,
              product: v.union(schema.tables.products.validator, v.null()),
            }),
          ),
          handler: async (ctx) => {
            const { entityId } = await resolve(ctx);
            return await this.subscriptions.listAll(ctx, { entityId });
          },
        }),
      },
      products: {
        list: queryGeneric({
          args: {},
          handler: async (ctx) => {
            return await this.products.list(ctx);
          },
        }),
        get: queryGeneric({
          args: { productId: v.string() },
          returns: v.union(schema.tables.products.validator, v.null()),
          handler: async (ctx, args) => {
            return await this.products.get(ctx, { productId: args.productId });
          },
        }),
      },
      customers: {
        retrieve: queryGeneric({
          args: {},
          returns: v.union(schema.tables.customers.validator, v.null()),
          handler: async (ctx) => {
            const { entityId } = await resolve(ctx);
            return await this.customers.retrieve(ctx, { entityId });
          },
        }),
        portalUrl: actionGeneric({
          args: {},
          returns: v.object({ url: v.string() }),
          handler: async (ctx) => {
            const { entityId } = await resolve(ctx);
            return await this.customers.portalUrl(ctx, { entityId });
          },
        }),
      },
      transactions: {
        search: actionGeneric({
          args: transactionsSearchArgs,
          returns: v.any(),
          handler: async (ctx, args) => {
            const { entityId } = await resolve(ctx);
            const customer = await ctx.runQuery(
              this.component.lib.getCustomerByEntityId,
              { entityId },
            );
            const customerId = args.customerId ?? customer?.id;

            if (!customerId) {
              return {
                items: [],
                pagination: {
                  totalRecords: 0,
                  totalPages: 0,
                  currentPage: args.pageNumber ?? 1,
                  nextPage: null,
                  prevPage: null,
                },
              };
            }

            const page = await this.sdk.transactions.search(
              customerId,
              args.orderId,
              args.productId,
              args.pageNumber,
              args.pageSize,
            );
            return unwrapTransactionSearchPage(page);
          },
        }),
      },
      plans: {
        activate: mutationGeneric({
          args: appPlanActivateArgs,
          returns: v.object({ success: v.boolean() }),
          handler: async (ctx, args) => {
            const { entityId, userId } = await resolve(ctx);
            await this.appPlans.activate(ctx, {
              entityId,
              planId: args.planId,
              activatedByUserId: userId,
            });
            return { success: true };
          },
        }),
      },
      orders: {
        list: queryGeneric({
          args: {},
          returns: v.array(schema.tables.orders.validator),
          handler: async (ctx) => {
            const { entityId } = await resolve(ctx);
            return await this.orders.list(ctx, { entityId });
          },
        }),
      },
      credits: {
        createAccount: actionGeneric({
          args: creditsCreateAccountArgs,
          returns: v.any(),
          handler: async (ctx, args) => {
            const { entityId } = await resolve(ctx);
            const customer = await ctx.runQuery(
              this.component.lib.getCustomerByEntityId,
              { entityId },
            );
            if (!customer) {
              throw new ConvexError(CUSTOMER_CHECKOUT_REQUIRED_ERROR);
            }
            return await this.credits.createAccount({
              customerId: customer.id,
              name: args.name,
              unitLabel: args.unitLabel,
              initialBalance: args.initialBalance,
            });
          },
        }),
        getBalance: actionGeneric({
          args: creditsGetBalanceArgs,
          returns: v.any(),
          handler: async (ctx, args) => {
            const { entityId } = await resolve(ctx);
            const accountId =
              args.accountId ??
              (await this.resolveDefaultCreditAccountId(ctx, entityId));
            return await this.credits.getBalance(accountId);
          },
        }),
        credit: actionGeneric({
          args: creditsCreditArgs,
          returns: v.any(),
          handler: async (ctx, args) => {
            const { entityId } = await resolve(ctx);
            const accountId =
              args.accountId ??
              (await this.resolveDefaultCreditAccountId(ctx, entityId));
            return await this.credits.credit(accountId, {
              amount: args.amount,
              reference: args.reference,
              idempotencyKey: args.idempotencyKey,
            });
          },
        }),
        debit: actionGeneric({
          args: creditsDebitArgs,
          returns: v.any(),
          handler: async (ctx, args) => {
            const { entityId } = await resolve(ctx);
            const accountId =
              args.accountId ??
              (await this.resolveDefaultCreditAccountId(ctx, entityId));
            return await this.credits.debit(accountId, {
              amount: args.amount,
              reference: args.reference,
              idempotencyKey: args.idempotencyKey,
            });
          },
        }),
        listEntries: actionGeneric({
          args: creditsListEntriesArgs,
          returns: v.any(),
          handler: async (ctx, args) => {
            const { entityId } = await resolve(ctx);
            const accountId =
              args.accountId ??
              (await this.resolveDefaultCreditAccountId(ctx, entityId));
            return await this.credits.listEntries(
              accountId,
              args.limit,
              args.startingAfter,
            );
          },
        }),
      },
    };
  }

  /**
   * Register the Creem webhook HTTP route on your Convex `httpRouter`.
   *
   * Automatically handles supported Creem checkout, subscription, and refund
   * events — upserts customers, subscriptions, and orders in the Convex DB.
   * Dispute events are verified and dispatched to custom handlers.
   *
   * @param http - Your Convex HTTP router (from `httpRouter()`)
   * @param options.path - Webhook endpoint path (default: `"/creem/events"`)
   * @param options.events - Optional custom handlers that run **after** built-in processing
   *
   * @example
   * ```ts
   * const http = httpRouter();
   * creem.registerRoutes(http, {
   *   events: {
   *     "checkout.completed": async (ctx, event) => { ... },
   *   },
   * });
   * ```
   */
  registerRoutes(
    http: HttpRouter,
    {
      path = "/creem/events",
      events,
    }: {
      path?: string;
      events?: WebhookEventHandlers;
    } = {},
  ) {
    const mergedEvents: WebhookEventHandlers = { ...events };

    http.route({
      path,
      method: "POST",
      handler: httpActionGeneric(async (ctx, request) => {
        if (!request.body) {
          throw new ConvexError("No body");
        }
        const body = await request.text();
        const headers: Record<string, string> = {};
        request.headers.forEach((value, key) => {
          headers[key] = value;
        });
        let event: WebhookEventEntity;
        try {
          event = await this.constructWebhookEvent(body, headers);
        } catch (error) {
          if (error instanceof ConvexError) {
            throw error;
          }
          if (error instanceof WebhookVerificationError) {
            console.error(error);
            return new Response("Forbidden", { status: 403 });
          }
          console.error(error);
          return new Response("Bad Request", { status: 400 });
        }

        const eventType = getEventType(event);
        const eventData = event.object;

        console.log(
          `[creem-webhook] eventType=${eventType}`,
          `body=${JSON.stringify(event)}`,
        );

        if (
          eventData &&
          typeof eventData === "object" &&
          event.eventType === "checkout.completed"
        ) {
          const raw = eventData as Record<string, unknown>;
          const checkout = event.object;
          if (checkout) {
            // Auto-create customer record from checkout metadata
            const customerObj =
              typeof checkout.customer === "object"
                ? checkout.customer
                : undefined;
            const customerId = getCustomerId(customerObj);
            const entityId = getConvexEntityId(checkout.metadata);
            await this.upsertCustomerFromWebhook(
              ctx,
              customerId,
              entityId,
              customerObj as CustomerEntity | undefined,
            );

            // Process embedded subscription if present (recurring checkout).
            // checkoutEntityFromJSON already parsed it into a typed SubscriptionEntity,
            // so use it directly — do NOT re-parse through subscriptionEntityFromJSON.
            if (
              checkout.subscription &&
              typeof checkout.subscription === "object"
            ) {
              const embeddedSub = checkout.subscription as SubscriptionEntity;
              // Prefer subscription metadata from the embedded payload, with
              // checkout metadata as a fallback for older checkout webhooks.
              const embeddedRaw = (raw.subscription ?? {}) as Record<
                string,
                unknown
              >;
              const rawMeta = (embeddedRaw.metadata ??
                checkout.metadata ??
                {}) as Record<string, unknown>;
              const subscription = convertToDatabaseSubscription(embeddedSub, {
                rawMetadata: rawMeta,
              });
              await ctx.runMutation(this.component.lib.createSubscription, {
                subscription,
              });
              if (
                entityId &&
                (subscription.status === "active" ||
                  subscription.status === "trialing")
              ) {
                await ctx.runMutation(
                  this.component.lib.endActiveAppPlanAssignments,
                  {
                    entityId,
                    endedAt: subscription.startedAt ?? new Date().toISOString(),
                  },
                );
              }
            }

            // Store the order (present for both one-time and subscription checkouts)
            if (checkout.order && typeof checkout.order === "object") {
              const o = checkout.order as Record<string, unknown>;
              const order = convertToOrder(
                {
                  id: o.id as string,
                  customer: (o.customer as string) ?? null,
                  product: o.product as string,
                  amount: o.amount as number,
                  currency: o.currency as string,
                  status: o.status as string,
                  type: o.type as string,
                  transaction: (o.transaction as string) ?? null,
                  subTotal: o.subTotal as number | undefined,
                  sub_total: o.sub_total as number | undefined,
                  taxAmount: o.taxAmount as number | undefined,
                  tax_amount: o.tax_amount as number | undefined,
                  discountAmount: o.discountAmount as number | undefined,
                  discount_amount: o.discount_amount as number | undefined,
                  amountDue: o.amountDue as number | undefined,
                  amount_due: o.amount_due as number | undefined,
                  amountPaid: o.amountPaid as number | undefined,
                  amount_paid: o.amount_paid as number | undefined,
                  discount: (o.discount as string) ?? null,
                  affiliate: (o.affiliate as string) ?? null,
                  mode: o.mode as string | undefined,
                  createdAt: o.createdAt as Date | string | undefined,
                  created_at: o.created_at as string | undefined,
                  updatedAt: o.updatedAt as Date | string | undefined,
                  updated_at: o.updated_at as string | undefined,
                },
                {
                  checkoutId: checkout.id,
                  metadata: checkout.metadata as
                    | Record<string, unknown>
                    | undefined,
                },
              );
              await ctx.runMutation(this.component.lib.createOrder, {
                order,
              });
            }

            await this.creditCheckoutCustomerCredits(checkout);
          }
        }

        if (
          eventData &&
          typeof eventData === "object" &&
          event.eventType === "refund.created"
        ) {
          await this.debitRefundedCustomerCredits(event.object);
        }

        if (
          eventData &&
          typeof eventData === "object" &&
          isGeneratedSubscriptionWebhookEvent(event)
        ) {
          const parsed = event.object;
          const subscription = convertToDatabaseSubscription(parsed, {
            rawMetadata: (parsed.metadata ?? {}) as Record<string, unknown>,
          });
          await ctx.runMutation(this.component.lib.updateSubscription, {
            subscription,
          });

          // Auto-create customer record from subscription metadata
          const customerEntity =
            typeof parsed.customer === "object"
              ? (parsed.customer as CustomerEntity)
              : undefined;
          const customerId = getCustomerId(parsed.customer);
          const entityId = getConvexEntityId(parsed.metadata);
          await this.upsertCustomerFromWebhook(
            ctx,
            customerId,
            entityId,
            customerEntity,
          );
          if (
            entityId &&
            (subscription.status === "active" ||
              subscription.status === "trialing")
          ) {
            await ctx.runMutation(
              this.component.lib.endActiveAppPlanAssignments,
              {
                entityId,
                endedAt: subscription.startedAt ?? new Date().toISOString(),
              },
            );
          }
        }

        const handler = supportedWebhookEvents.has(eventType)
          ? mergedEvents[eventType]
          : undefined;
        if (handler) {
          await handler(ctx, event);
        }

        return new Response("Accepted", { status: 202 });
      }),
    });
  }
}
