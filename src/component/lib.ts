import { Creem } from "creem";

import { ConvexError, v } from "convex/values";
import { action, mutation, query } from "./_generated/server.js";
import schema from "./schema.js";
import { asyncMap } from "convex-helpers";
import { api } from "./_generated/api.js";
import { convertToDatabaseProduct } from "./util.js";

export const getCustomerByEntityId = query({
  args: {
    entityId: v.string(),
  },
  returns: v.union(schema.tables.customers.validator, v.null()),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("entityId", (q) => q.eq("entityId", args.entityId))
      .unique();
    return omitSystemFields(customer);
  },
});

export const insertCustomer = mutation({
  args: schema.tables.customers.validator,
  returns: v.id("customers"),
  handler: async (ctx, args) => {
    const existingCustomer = await ctx.db
      .query("customers")
      .withIndex("entityId", (q) => q.eq("entityId", args.entityId))
      .unique();
    if (existingCustomer) {
      // Enrich existing customer record with any new fields
      const patch: Record<string, unknown> = {};
      if (args.email && !existingCustomer.email) patch.email = args.email;
      if (args.name && !existingCustomer.name) patch.name = args.name;
      if (args.country && !existingCustomer.country)
        patch.country = args.country;
      if (args.mode) patch.mode = args.mode;
      if (args.updatedAt) patch.updatedAt = args.updatedAt;
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existingCustomer._id, patch);
      }
      return existingCustomer._id;
    }
    return ctx.db.insert("customers", args);
  },
});

export const getSubscription = query({
  args: {
    id: v.string(),
  },
  returns: v.union(schema.tables.subscriptions.validator, v.null()),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("id", (q) => q.eq("id", args.id))
      .unique();
    return omitSystemFields(subscription);
  },
});

export const getProduct = query({
  args: {
    id: v.string(),
  },
  returns: v.union(schema.tables.products.validator, v.null()),
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("id", (q) => q.eq("id", args.id))
      .unique();
    return omitSystemFields(product);
  },
});

/** For apps that have 0 or 1 active subscription per user. Excludes expired trials. */
export const getCurrentSubscription = query({
  args: {
    entityId: v.string(),
  },
  returns: v.union(
    v.object({
      ...schema.tables.subscriptions.validator.fields,
      product: schema.tables.products.validator,
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("entityId", (q) => q.eq("entityId", args.entityId))
      .unique();
    if (!customer) {
      return null;
    }
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("customerId_endedAt", (q) =>
        q.eq("customerId", customer.id).eq("endedAt", null),
      )
      .first();
    if (!subscription) {
      return null;
    }
    if (
      subscription.status === "trialing" &&
      subscription.trialEnd &&
      subscription.trialEnd <= new Date().toISOString()
    ) {
      return null;
    }
    const product = await ctx.db
      .query("products")
      .withIndex("id", (q) => q.eq("id", subscription.productId))
      .unique();
    if (!product) {
      throw new ConvexError(`Product not found: ${subscription.productId}`);
    }
    return {
      ...omitSystemFields(subscription),
      product: omitSystemFields(product),
    };
  },
});

/** List active subscriptions for a user, excluding ended and expired trials. */
export const listUserSubscriptions = query({
  args: {
    entityId: v.string(),
  },
  returns: v.array(
    v.object({
      ...schema.tables.subscriptions.validator.fields,
      product: v.union(schema.tables.products.validator, v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("entityId", (q) => q.eq("entityId", args.entityId))
      .unique();
    if (!customer) {
      return [];
    }
    const now = new Date().toISOString();
    const subscriptions = await asyncMap(
      ctx.db
        .query("subscriptions")
        .withIndex("customerId", (q) => q.eq("customerId", customer.id))
        .collect(),
      async (subscription) => {
        if (
          (subscription.endedAt && subscription.endedAt <= now) ||
          (subscription.status === "trialing" &&
            subscription.trialEnd &&
            subscription.trialEnd <= now)
        ) {
          return;
        }
        const product = subscription.productId
          ? (await ctx.db
              .query("products")
              .withIndex("id", (q) => q.eq("id", subscription.productId))
              .unique()) || null
          : null;
        return {
          ...omitSystemFields(subscription),
          product: omitSystemFields(product),
        };
      },
    );
    return subscriptions.flatMap((subscription) =>
      subscription ? [subscription] : [],
    );
  },
});

/** Returns all subscriptions for a user, including ended and expired trials. */
export const listAllUserSubscriptions = query({
  args: {
    entityId: v.string(),
  },
  returns: v.array(
    v.object({
      ...schema.tables.subscriptions.validator.fields,
      product: v.union(schema.tables.products.validator, v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("entityId", (q) => q.eq("entityId", args.entityId))
      .unique();
    if (!customer) {
      return [];
    }
    const subscriptions = await asyncMap(
      ctx.db
        .query("subscriptions")
        .withIndex("customerId", (q) => q.eq("customerId", customer.id))
        .collect(),
      async (subscription) => {
        const product = subscription.productId
          ? (await ctx.db
              .query("products")
              .withIndex("id", (q) => q.eq("id", subscription.productId))
              .unique()) || null
          : null;
        return {
          ...omitSystemFields(subscription),
          product: omitSystemFields(product),
        };
      },
    );
    return subscriptions;
  },
});

export const listProducts = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  returns: v.array(schema.tables.products.validator),
  handler: async (ctx, args) => {
    const q = ctx.db.query("products");
    const products = args.includeArchived
      ? await q.collect()
      : await q.withIndex("status", (q) => q.eq("status", "active")).collect();
    return products.map((product) => omitSystemFields(product));
  },
});

export const createSubscription = mutation({
  args: {
    subscription: schema.tables.subscriptions.validator,
  },
  handler: async (ctx, args) => {
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("id", (q) => q.eq("id", args.subscription.id))
      .unique();
    if (!existingSubscription) {
      await ctx.db.insert("subscriptions", args.subscription);
      return;
    }
    // Timestamp guard: skip if existing record is newer
    const incomingModifiedAt = args.subscription.modifiedAt ?? "";
    const existingModifiedAt = existingSubscription.modifiedAt ?? "";
    if (existingModifiedAt > incomingModifiedAt) {
      return; // stale webhook, skip
    }
    await ctx.db.patch(existingSubscription._id, args.subscription);
  },
});

export const updateSubscription = mutation({
  args: {
    subscription: schema.tables.subscriptions.validator,
  },
  handler: async (ctx, args) => {
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("id", (q) => q.eq("id", args.subscription.id))
      .unique();
    if (!existingSubscription) {
      // Subscription doesn't exist yet — insert instead of throwing
      await ctx.db.insert("subscriptions", args.subscription);
      return;
    }
    // Timestamp guard: skip if existing record is newer
    const incomingModifiedAt = args.subscription.modifiedAt ?? "";
    const existingModifiedAt = existingSubscription.modifiedAt ?? "";
    if (existingModifiedAt > incomingModifiedAt) {
      return; // stale webhook, skip
    }

    // Optimistic-update guard: if a recent patchSubscription set optimistic
    // fields, don't let intermediate webhook events revert those values.
    const existingMeta = (existingSubscription.metadata ?? {}) as Record<
      string,
      unknown
    >;
    const pendingAt = existingMeta._optimisticPendingAt as number | undefined;
    const optimisticFields = existingMeta._optimisticFields as
      | string[]
      | undefined;
    const isOptimisticPending =
      pendingAt != null && Date.now() - pendingAt < 30_000;

    const subscriptionToWrite = { ...args.subscription };

    if (isOptimisticPending && optimisticFields?.length) {
      console.debug(
        `[creem] optimistic guard active for sub=${args.subscription.id}`,
        {
          guardFields: optimisticFields,
          guardAge: `${Math.round((Date.now() - (pendingAt ?? 0)) / 1000)}s`,
          incoming: {
            productId: args.subscription.productId,
            seats: args.subscription.seats,
          },
          db: {
            productId: existingSubscription.productId,
            seats: existingSubscription.seats,
          },
        },
      );
      let allConfirmed = true;

      if (optimisticFields.includes("seats")) {
        if (args.subscription.seats !== existingSubscription.seats) {
          subscriptionToWrite.seats = existingSubscription.seats;
          allConfirmed = false;
          console.log(
            `[creem] guard: preserving optimistic seats=${existingSubscription.seats} (webhook sent ${args.subscription.seats})`,
          );
        }
      }
      if (optimisticFields.includes("productId")) {
        if (args.subscription.productId !== existingSubscription.productId) {
          subscriptionToWrite.productId = existingSubscription.productId;
          allConfirmed = false;
          console.log(
            `[creem] guard: preserving optimistic productId=${existingSubscription.productId} (webhook sent ${args.subscription.productId})`,
          );
        }
      }

      // Only clear the guard when ALL tracked fields match in a single webhook.
      // Partial matches are not trusted — Creem sends intermediate states where
      // some fields update temporarily before reverting (e.g. subscription.product
      // changes on upgrade but items[0].product_id stays stale).
      const incomingMeta = (args.subscription.metadata ?? {}) as Record<
        string,
        unknown
      >;
      if (allConfirmed) {
        console.log(
          `[creem] guard: all optimistic fields confirmed for sub=${args.subscription.id} — clearing`,
        );
        const {
          _optimisticPendingAt: _,
          _optimisticFields: __,
          ...cleanMeta
        } = { ...existingMeta, ...incomingMeta };
        subscriptionToWrite.metadata = cleanMeta;
      } else {
        subscriptionToWrite.metadata = {
          ...existingMeta,
          ...incomingMeta,
          _optimisticPendingAt: pendingAt,
          _optimisticFields: optimisticFields,
        };
      }
    }

    await ctx.db.patch(existingSubscription._id, subscriptionToWrite);
  },
});

export const createProduct = mutation({
  args: {
    product: schema.tables.products.validator,
  },
  handler: async (ctx, args) => {
    const existingProduct = await ctx.db
      .query("products")
      .withIndex("id", (q) => q.eq("id", args.product.id))
      .unique();
    if (!existingProduct) {
      await ctx.db.insert("products", args.product);
      return;
    }
    // Timestamp guard: skip if existing record is newer
    const incomingModifiedAt = args.product.modifiedAt ?? "";
    const existingModifiedAt = existingProduct.modifiedAt ?? "";
    if (existingModifiedAt > incomingModifiedAt) {
      return; // stale webhook, skip
    }
    await ctx.db.patch(existingProduct._id, args.product);
  },
});

export const updateProduct = mutation({
  args: {
    product: schema.tables.products.validator,
  },
  handler: async (ctx, args) => {
    const existingProduct = await ctx.db
      .query("products")
      .withIndex("id", (q) => q.eq("id", args.product.id))
      .unique();
    if (!existingProduct) {
      // Product doesn't exist yet — insert instead of throwing
      await ctx.db.insert("products", args.product);
      return;
    }
    // Timestamp guard: skip if existing record is newer
    const incomingModifiedAt = args.product.modifiedAt ?? "";
    const existingModifiedAt = existingProduct.modifiedAt ?? "";
    if (existingModifiedAt > incomingModifiedAt) {
      return; // stale webhook, skip
    }
    await ctx.db.patch(existingProduct._id, args.product);
  },
});

export const createOrder = mutation({
  args: {
    order: schema.tables.orders.validator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("orders")
      .withIndex("id", (q) => q.eq("id", args.order.id))
      .unique();
    if (!existing) {
      await ctx.db.insert("orders", args.order);
      return;
    }
    // Update if incoming is newer
    if ((args.order.updatedAt ?? "") >= (existing.updatedAt ?? "")) {
      await ctx.db.patch(existing._id, args.order);
    }
  },
});

/** List paid one-time orders for a user. */
export const listUserOrders = query({
  args: {
    entityId: v.string(),
  },
  returns: v.array(schema.tables.orders.validator),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("entityId", (q) => q.eq("entityId", args.entityId))
      .unique();
    if (!customer) {
      return [];
    }
    const orders = await ctx.db
      .query("orders")
      .withIndex("customerId", (q) => q.eq("customerId", customer.id))
      .collect();
    return orders
      .filter((o) => o.status === "paid" && o.type === "onetime")
      .map(omitSystemFields);
  },
});

export const listCustomerSubscriptions = query({
  args: {
    customerId: v.string(),
  },
  returns: v.array(schema.tables.subscriptions.validator),
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("customerId", (q) => q.eq("customerId", args.customerId))
      .collect();
    return subscriptions.map(omitSystemFields);
  },
});

export const syncProducts = action({
  args: {
    apiKey: v.string(),
    serverIdx: v.optional(v.number()),
    serverURL: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const creem = new Creem({
      apiKey: args.apiKey,
      ...(args.serverIdx !== undefined ? { serverIdx: args.serverIdx } : {}),
      ...(args.serverURL ? { serverURL: args.serverURL } : {}),
    });
    let pageNumber = 1;
    while (true) {
      const products = await creem.products.search(pageNumber, 100);
      pageNumber += 1;
      await ctx.runMutation(api.lib.updateProducts, {
        products: products.items.map(convertToDatabaseProduct),
      });
      if (products.pagination.currentPage >= products.pagination.totalPages) {
        break;
      }
    }
  },
});

export const updateProducts = mutation({
  args: {
    products: v.array(schema.tables.products.validator),
  },
  handler: async (ctx, args) => {
    await asyncMap(args.products, async (product) => {
      const existingProduct = await ctx.db
        .query("products")
        .withIndex("id", (q) => q.eq("id", product.id))
        .unique();
      if (existingProduct) {
        await ctx.db.patch(existingProduct._id, product);
        return;
      }
      await ctx.db.insert("products", product);
    });
  },
});

/** Lightweight patch for optimistic UI updates (seats, productId, status).
 *  Tracks which fields were optimistically changed via `_optimisticPendingAt`
 *  and `_optimisticFields` in the subscription's metadata so that incoming
 *  webhooks with stale intermediate values don't overwrite the optimistic state. */
export const patchSubscription = mutation({
  args: {
    subscriptionId: v.string(),
    seats: v.optional(v.union(v.number(), v.null())),
    productId: v.optional(v.string()),
    status: v.optional(v.string()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    clearOptimistic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("id", (q) => q.eq("id", args.subscriptionId))
      .unique();
    if (!sub)
      throw new ConvexError(`Subscription not found: ${args.subscriptionId}`);
    const patch: Record<string, unknown> = {};
    const optimisticFields: string[] = [];
    if (args.seats !== undefined) {
      patch.seats = args.seats;
      optimisticFields.push("seats");
    }
    if (args.productId !== undefined) {
      patch.productId = args.productId;
      optimisticFields.push("productId");
    }
    if (args.status !== undefined) patch.status = args.status;
    if (args.cancelAtPeriodEnd !== undefined)
      patch.cancelAtPeriodEnd = args.cancelAtPeriodEnd;

    // Track optimistic fields so updateSubscription can guard against stale webhooks.
    // Merge with any existing optimistic fields (cumulative across consecutive patches).
    const existingMeta = (sub.metadata ?? {}) as Record<string, unknown>;
    if (args.clearOptimistic) {
      const {
        _optimisticPendingAt: _,
        _optimisticFields: __,
        ...cleanMeta
      } = existingMeta;
      patch.metadata = cleanMeta;
    } else if (optimisticFields.length > 0) {
      const existingOptimistic =
        (existingMeta._optimisticFields as string[] | undefined) ?? [];
      const mergedOptimistic = [
        ...new Set([...existingOptimistic, ...optimisticFields]),
      ];
      patch.metadata = {
        ...existingMeta,
        _optimisticPendingAt: Date.now(),
        _optimisticFields: mergedOptimistic,
      };
    }

    if (Object.keys(patch).length > 0) {
      if (optimisticFields.length > 0 || args.clearOptimistic) {
        console.log(`[creem] optimistic patch sub=${args.subscriptionId}`, {
          fields: optimisticFields,
          ...(args.seats !== undefined ? { seats: args.seats } : {}),
          ...(args.productId !== undefined
            ? { productId: args.productId }
            : {}),
          ...(args.clearOptimistic ? { clear: true } : {}),
        });
      }
      await ctx.db.patch(sub._id, patch);
    }
  },
});

export const listPendingScheduledSubscriptionUpdates = query({
  args: {
    entityId: v.string(),
  },
  returns: v.array(schema.tables.scheduledSubscriptionUpdates.validator),
  handler: async (ctx, args) => {
    const updates = await ctx.db
      .query("scheduledSubscriptionUpdates")
      .withIndex("entityId_status", (q) =>
        q.eq("entityId", args.entityId).eq("status", "pending"),
      )
      .collect();
    return updates.map(omitSystemFields);
  },
});

export const getScheduledSubscriptionUpdate = query({
  args: {
    scheduledUpdateId: v.id("scheduledSubscriptionUpdates"),
  },
  returns: v.union(
    schema.tables.scheduledSubscriptionUpdates.validator,
    v.null(),
  ),
  handler: async (ctx, args) => {
    const update = await ctx.db.get(args.scheduledUpdateId);
    return omitSystemFields(update);
  },
});

export const createScheduledSubscriptionUpdate = mutation({
  args: {
    entityId: v.string(),
    subscriptionId: v.string(),
    targetProductId: v.optional(v.string()),
    targetPlanId: v.optional(v.string()),
    targetUnits: v.optional(v.number()),
    effectiveAt: v.string(),
  },
  returns: v.id("scheduledSubscriptionUpdates"),
  handler: async (ctx, args) => {
    const targetCount =
      (args.targetProductId ? 1 : 0) +
      (args.targetPlanId ? 1 : 0) +
      (args.targetUnits !== undefined ? 1 : 0);
    if (targetCount !== 1) {
      throw new ConvexError(
        "Provide exactly one scheduled target: targetProductId, targetPlanId, or targetUnits",
      );
    }

    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("scheduledSubscriptionUpdates")
      .withIndex("subscriptionId_status", (q) =>
        q.eq("subscriptionId", args.subscriptionId).eq("status", "pending"),
      )
      .collect();
    await asyncMap(existing, async (update) => {
      await ctx.db.patch(update._id, {
        status: "superseded",
        updatedAt: now,
      });
    });

    return await ctx.db.insert("scheduledSubscriptionUpdates", {
      entityId: args.entityId,
      subscriptionId: args.subscriptionId,
      targetProductId: args.targetProductId,
      targetPlanId: args.targetPlanId,
      targetUnits: args.targetUnits,
      effectiveAt: args.effectiveAt,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const cancelScheduledSubscriptionUpdate = mutation({
  args: {
    entityId: v.string(),
    subscriptionId: v.string(),
  },
  returns: v.union(
    schema.tables.scheduledSubscriptionUpdates.validator,
    v.null(),
  ),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("scheduledSubscriptionUpdates")
      .withIndex("subscriptionId_status", (q) =>
        q.eq("subscriptionId", args.subscriptionId).eq("status", "pending"),
      )
      .filter((q) => q.eq(q.field("entityId"), args.entityId))
      .first();
    if (!existing) return null;

    const now = new Date().toISOString();
    await ctx.db.patch(existing._id, {
      status: "superseded",
      updatedAt: now,
    });
    return omitSystemFields({
      ...existing,
      status: "superseded" as const,
      updatedAt: now,
    });
  },
});

export const setScheduledSubscriptionUpdateJob = mutation({
  args: {
    scheduledUpdateId: v.id("scheduledSubscriptionUpdates"),
    scheduledFunctionId: v.id("_scheduled_functions"),
  },
  handler: async (ctx, args) => {
    const update = await ctx.db.get(args.scheduledUpdateId);
    if (!update) {
      throw new ConvexError("Scheduled subscription update not found");
    }
    await ctx.db.patch(args.scheduledUpdateId, {
      scheduledFunctionId: args.scheduledFunctionId,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const markScheduledSubscriptionUpdateApplying = mutation({
  args: {
    scheduledUpdateId: v.id("scheduledSubscriptionUpdates"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const update = await ctx.db.get(args.scheduledUpdateId);
    if (!update || update.status !== "pending") return false;
    await ctx.db.patch(args.scheduledUpdateId, {
      status: "applying",
      updatedAt: new Date().toISOString(),
    });
    return true;
  },
});

export const markScheduledSubscriptionUpdateApplied = mutation({
  args: {
    scheduledUpdateId: v.id("scheduledSubscriptionUpdates"),
  },
  handler: async (ctx, args) => {
    const update = await ctx.db.get(args.scheduledUpdateId);
    if (!update) return;
    await ctx.db.patch(args.scheduledUpdateId, {
      status: "applied",
      updatedAt: new Date().toISOString(),
    });
  },
});

export const markScheduledSubscriptionUpdateFailed = mutation({
  args: {
    scheduledUpdateId: v.id("scheduledSubscriptionUpdates"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const update = await ctx.db.get(args.scheduledUpdateId);
    if (!update) return;
    await ctx.db.patch(args.scheduledUpdateId, {
      status: "failed",
      error: args.error,
      updatedAt: new Date().toISOString(),
    });
  },
});

/** Action that calls Creem API and reverts on error. Scheduled by mutations.
 *  Public (not internal) so it's accessible via ComponentApi for scheduling from app-level mutations.
 *  Secured by requiring apiKey argument (same pattern as syncProducts). */
export const executeSubscriptionUpdate = action({
  args: {
    apiKey: v.string(),
    serverIdx: v.optional(v.number()),
    serverURL: v.optional(v.string()),
    subscriptionId: v.string(),
    productId: v.optional(v.string()),
    units: v.optional(v.number()),
    updateBehavior: v.optional(v.string()),
    previousSeats: v.optional(v.union(v.number(), v.null())),
    previousProductId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sdk = new Creem({
      apiKey: args.apiKey,
      ...(args.serverIdx !== undefined ? { serverIdx: args.serverIdx } : {}),
      ...(args.serverURL ? { serverURL: args.serverURL } : {}),
    });
    try {
      if (args.updateBehavior === "period-end") {
        throw new ConvexError(
          "period-end updates must be scheduled before calling Creem",
        );
      }
      if (args.productId) {
        // Plan/interval switch
        await sdk.subscriptions.upgrade(args.subscriptionId, {
          productId: args.productId,
          ...(args.updateBehavior
            ? {
                updateBehavior: args.updateBehavior as
                  | "proration-charge-immediately"
                  | "proration-charge"
                  | "proration-none",
              }
            : {}),
        });
      } else if (args.units !== undefined) {
        // Seat update — need live item IDs from Creem
        const live = await sdk.subscriptions.get(args.subscriptionId);
        const item = live.items?.[0];
        if (!item) throw new ConvexError("Subscription has no items");
        await sdk.subscriptions.update(args.subscriptionId, {
          items: [
            {
              id: item.id,
              productId: item.productId,
              priceId: item.priceId,
              units: args.units,
            },
          ],
          ...(args.updateBehavior
            ? {
                updateBehavior: args.updateBehavior as
                  | "proration-charge-immediately"
                  | "proration-charge"
                  | "proration-none",
              }
            : {}),
        });
      }
    } catch (error) {
      console.error(`[creem] subscription update failed:`, error);
      // Revert optimistic state and clear the optimistic guard so webhooks write normally
      await ctx.runMutation(api.lib.patchSubscription, {
        subscriptionId: args.subscriptionId,
        ...(args.previousSeats !== undefined
          ? { seats: args.previousSeats }
          : {}),
        ...(args.previousProductId
          ? { productId: args.previousProductId }
          : {}),
        clearOptimistic: true,
      });
    }
  },
});

/** Applies a previously scheduled period-end subscription update. */
export const applyScheduledSubscriptionUpdate = action({
  args: {
    apiKey: v.string(),
    serverIdx: v.optional(v.number()),
    serverURL: v.optional(v.string()),
    scheduledUpdateId: v.id("scheduledSubscriptionUpdates"),
  },
  handler: async (ctx, args) => {
    const scheduledUpdate = await ctx.runQuery(
      api.lib.getScheduledSubscriptionUpdate,
      {
        scheduledUpdateId: args.scheduledUpdateId,
      },
    );
    if (!scheduledUpdate || scheduledUpdate.status !== "pending") return;

    const marked = await ctx.runMutation(
      api.lib.markScheduledSubscriptionUpdateApplying,
      {
        scheduledUpdateId: args.scheduledUpdateId,
      },
    );
    if (!marked) return;

    const sdk = new Creem({
      apiKey: args.apiKey,
      ...(args.serverIdx !== undefined ? { serverIdx: args.serverIdx } : {}),
      ...(args.serverURL ? { serverURL: args.serverURL } : {}),
    });

    try {
      if (scheduledUpdate.targetProductId) {
        await sdk.subscriptions.upgrade(scheduledUpdate.subscriptionId, {
          productId: scheduledUpdate.targetProductId,
          updateBehavior: "proration-none",
        });
        await ctx.runMutation(api.lib.patchSubscription, {
          subscriptionId: scheduledUpdate.subscriptionId,
          productId: scheduledUpdate.targetProductId,
        });
      } else if (scheduledUpdate.targetUnits !== undefined) {
        const live = await sdk.subscriptions.get(
          scheduledUpdate.subscriptionId,
        );
        const item = live.items?.[0];
        if (!item) throw new ConvexError("Subscription has no items");
        await sdk.subscriptions.update(scheduledUpdate.subscriptionId, {
          items: [
            {
              id: item.id,
              productId: item.productId,
              priceId: item.priceId,
              units: scheduledUpdate.targetUnits,
            },
          ],
          updateBehavior: "proration-none",
        });
        await ctx.runMutation(api.lib.patchSubscription, {
          subscriptionId: scheduledUpdate.subscriptionId,
          seats: scheduledUpdate.targetUnits,
        });
      } else if (scheduledUpdate.targetPlanId) {
        // App-owned/free-plan transitions are represented by app state. When the
        // target is a free plan, Creem cancellation is scheduled when the intent
        // is created so renewal is prevented before this marker runs.
      }

      await ctx.runMutation(api.lib.markScheduledSubscriptionUpdateApplied, {
        scheduledUpdateId: args.scheduledUpdateId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[creem] scheduled subscription update failed:`, error);
      await ctx.runMutation(api.lib.markScheduledSubscriptionUpdateFailed, {
        scheduledUpdateId: args.scheduledUpdateId,
        error: message,
      });
    }
  },
});

/** Action that calls Creem API for cancel/resume/pause and reverts on error.
 *  Scheduled by the corresponding mutations in api(). */
export const executeSubscriptionLifecycle = action({
  args: {
    apiKey: v.string(),
    serverIdx: v.optional(v.number()),
    serverURL: v.optional(v.string()),
    subscriptionId: v.string(),
    operation: v.union(
      v.literal("cancel"),
      v.literal("resume"),
      v.literal("pause"),
    ),
    cancelMode: v.optional(v.string()),
    // For reverting on error:
    previousStatus: v.optional(v.string()),
    previousCancelAtPeriodEnd: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const sdk = new Creem({
      apiKey: args.apiKey,
      ...(args.serverIdx !== undefined ? { serverIdx: args.serverIdx } : {}),
      ...(args.serverURL ? { serverURL: args.serverURL } : {}),
    });
    try {
      if (args.operation === "cancel") {
        const cancelParams =
          args.cancelMode === "immediate"
            ? { mode: "immediate" as const }
            : args.cancelMode === "scheduled"
              ? { mode: "scheduled" as const, onExecute: "cancel" as const }
              : {};
        await sdk.subscriptions.cancel(args.subscriptionId, cancelParams);
      } else if (args.operation === "resume") {
        await sdk.subscriptions.resume(args.subscriptionId);
      } else if (args.operation === "pause") {
        await sdk.subscriptions.pause(args.subscriptionId);
      }
    } catch (error) {
      console.error(`[creem] subscription ${args.operation} failed:`, error);
      // Revert optimistic state
      await ctx.runMutation(api.lib.patchSubscription, {
        subscriptionId: args.subscriptionId,
        ...(args.previousStatus !== undefined
          ? { status: args.previousStatus }
          : {}),
        ...(args.previousCancelAtPeriodEnd !== undefined
          ? { cancelAtPeriodEnd: args.previousCancelAtPeriodEnd }
          : {}),
      });
    }
  },
});

export const omitSystemFields = <
  T extends { _id: string; _creationTime: number } | null | undefined,
>(
  doc: T,
) => {
  if (!doc) {
    return doc;
  }
  const { _id, _creationTime, ...rest } = doc;
  return rest;
};
