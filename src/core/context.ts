import type {
  BillingSnapshot,
  PlanCatalog,
  PlanChangeIntent,
  RecurringCycle,
  UpdateBehavior,
} from "./types.js";
import type { BillingI18n } from "./i18n.js";

/**
 * Framework-agnostic billing context contract.
 *
 * Implemented by integration providers (e.g. Convex React/Svelte providers) and consumed
 * by UI widgets. This decouples widgets from any specific backend — widgets only depend on
 * this contract, not on Convex, Supabase, or any other backend SDK.
 */
export type BillingContextValue = {
  // ── State ──────────────────────────────────────────────────

  /** Billing snapshot with subscriptions[] and orders[]. */
  snapshot: BillingSnapshot | null;

  /** Plan catalog (for product resolution and plan metadata). */
  catalog: PlanCatalog | null;

  /** Whether the billing state is currently loading. */
  isLoading: boolean;

  /** Error message if the billing state failed to load. */
  error: string | null;

  /** Authenticated user info, or `null` when unauthenticated. */
  user: {
    id: string;
    email: string;
  } | null;

  /** All synced products from the commerce platform. */
  products: Array<{
    id: string;
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    billingType?: string;
    billingPeriod?: string;
    status?: string;
    imageUrl?: string;
  }>;

  /** Product IDs the entity has purchased (one-time orders). */
  ownedProductIds: string[];

  /** Whether this entity has a customer record on the commerce platform. */
  hasCustomer: boolean;

  // ── Actions ────────────────────────────────────────────────

  /** Create a checkout session and redirect to the hosted checkout page. */
  createCheckout: (args: {
    productId: string;
    successUrl?: string;
    units?: number;
  }) => Promise<{ url: string }>;

  /** Update a subscription (plan switch or unit change). */
  updateSubscription?: (args: {
    subscriptionId?: string;
    productId?: string;
    units?: number;
    updateBehavior?: UpdateBehavior;
  }) => Promise<void>;

  /** Cancel a subscription. */
  cancelSubscription?: (args: {
    subscriptionId?: string;
    revokeImmediately?: boolean;
  }) => Promise<void>;

  /** Resume a paused or scheduled-cancel subscription. */
  resumeSubscription?: (args: { subscriptionId?: string }) => Promise<void>;

  /** Get the URL for the customer billing portal. */
  getPortalUrl?: () => Promise<{ url: string }>;

  /** Search paginated transaction history. */
  searchTransactions?: (args: {
    customerId?: string;
    orderId?: string;
    productId?: string;
    pageNumber?: number;
    pageSize?: number;
  }) => Promise<{
    items: Array<Record<string, unknown>>;
    pagination: {
      totalRecords: number;
      totalPages: number;
      currentPage: number;
      nextPage: number | null;
      prevPage: number | null;
    };
  }>;

  /** Force a refresh of the billing state. */
  invalidate: () => void;

  // ── Consent gates ──────────────────────────────────────────

  /** Called before checkout — return `false` to block. */
  onBeforeCheckout?: (intent: {
    productId: string;
    units?: number;
  }) => Promise<boolean> | boolean;

  /** Called before plan change — return `false` to block. */
  onBeforePlanChange?: (intent: PlanChangeIntent) => Promise<boolean> | boolean;

  /** Called before app-owned plan activation — return `false` to block. */
  onBeforePlanActivation?: (intent: {
    planId: string;
  }) => Promise<boolean> | boolean;

  // ── Credits (optional capability) ──────────────────────────

  /** Optional customer credits capability. */
  credits?: {
    /** Get the current credit balance. */
    getBalance: () => Promise<{ balance: string }>;
    /** Debit credits from the account. */
    debit: (args: {
      amount: string;
      reference: string;
      idempotencyKey: string;
    }) => Promise<void>;
  };

  /** Optional UI label and formatting configuration. */
  i18n?: BillingI18n;
};

/** Options for configuring a billing provider. */
export type BillingProviderConfig = {
  /** Plan catalog for type-safe plan resolution. */
  catalog?: PlanCatalog;
  /** Default billing cycle for new subscriptions. */
  defaultCycle?: RecurringCycle;
  /** Consent gate: called before checkout. */
  onBeforeCheckout?: BillingContextValue["onBeforeCheckout"];
  /** Consent gate: called before plan change. */
  onBeforePlanChange?: BillingContextValue["onBeforePlanChange"];
  /** Consent gate: called before app-owned plan activation. */
  onBeforePlanActivation?: BillingContextValue["onBeforePlanActivation"];
  /** Optional UI label and formatting configuration. */
  i18n?: BillingI18n;
};
