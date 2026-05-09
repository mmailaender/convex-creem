import type { PlanCatalog, PlanId, RecurringCycle } from "../core/types.js";
import type { BillingProviderConfig } from "../core/context.js";
import type { ConnectedBillingApi } from "./widgets/types.js";

/**
 * Options for `createCreemSvelte`.
 *
 * @template TCatalog - Static plan catalog type for plan ID auto-completion.
 */
export type CreateCreemSvelteOptions<
  TCatalog extends PlanCatalog = PlanCatalog,
> = {
  /** Static plan catalog — enables typed plan IDs throughout the binding. */
  catalog: TCatalog;
  /** Convex function references for connected widgets. */
  api: ConnectedBillingApi;
  /** Default billing cycle for new subscriptions. */
  defaultCycle?: RecurringCycle;
  /** Consent gates and other provider-level configuration. */
  config?: Omit<BillingProviderConfig, "catalog" | "defaultCycle">;
};

/**
 * Typed binding returned by `createCreemSvelte`.
 *
 * Provides typed plan IDs and pre-bound configuration for widgets.
 *
 * @template TCatalog - Static plan catalog type.
 */
export type CreemSvelteBinding<TCatalog extends PlanCatalog = PlanCatalog> = {
  /** The plan catalog, passed through for widget consumption. */
  catalog: TCatalog;
  /** Pre-bound Convex function references. */
  api: ConnectedBillingApi;
  /** Default billing cycle. */
  defaultCycle: RecurringCycle;
  /** Provider-level configuration. */
  config: BillingProviderConfig;
  /** All plan IDs from the catalog (typed). */
  planIds: PlanId<TCatalog>[];
  /** Helper to check if a string is a valid plan ID. */
  isPlanId: (id: string) => id is PlanId<TCatalog>;
};

/**
 * Create a typed billing binding for Svelte.
 *
 * Binds a static plan catalog and Convex API references into a single object that
 * provides type-safe plan IDs throughout your app. Pass the result to widget props
 * or use it in your own custom components.
 *
 * @example
 * ```ts
 * import { createCreemSvelte } from "@mmailaender/convex-creem/svelte";
 * import { api } from "../convex/_generated/api";
 *
 * const billing = createCreemSvelte({
 *   catalog: {
 *     version: "1",
 *     plans: [
 *       { planId: "free", category: "free" },
 *       { planId: "pro", category: "paid", creemProductIds: { "every-month": "prod_xxx" } },
 *     ],
 *   },
 *   api: {
 *     uiModel: api.billing.uiModel,
 *     checkouts: { create: api.billing.checkoutsCreate },
 *     subscriptions: {
 *       update: api.billing.subscriptionsUpdate,
 *       cancel: api.billing.subscriptionsCancel,
 *       resume: api.billing.subscriptionsResume,
 *     },
 *   },
 * });
 *
 * // billing.planIds → ["free", "pro"] (typed)
 * // billing.catalog → typed catalog
 * ```
 */
export const createCreemSvelte = <TCatalog extends PlanCatalog>(
  options: CreateCreemSvelteOptions<TCatalog>,
): CreemSvelteBinding<TCatalog> => {
  const planIds = options.catalog.plans.map(
    (p) => p.planId,
  ) as PlanId<TCatalog>[];
  const planIdSet = new Set<string>(planIds);
  const defaultCycle = options.defaultCycle ?? "every-month";

  return {
    catalog: options.catalog,
    api: options.api,
    defaultCycle,
    config: {
      catalog: options.catalog,
      defaultCycle,
      ...options.config,
    },
    planIds,
    isPlanId: (id: string): id is PlanId<TCatalog> => planIdSet.has(id),
  };
};
