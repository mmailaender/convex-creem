import type {
  AvailableAction,
  BillingSnapshot,
  UIPlanEntry,
  RecurringCycle,
} from "../../core/types.js";
import {
  defaultBillingLabels,
  type BillingLabels,
  type BillingCurrencyFormatInput,
} from "../../core/i18n.js";
import type { ConnectedProduct } from "../widgets/types.js";

const CYCLE_KEY_ALIASES: Record<RecurringCycle, string[]> = {
  "every-month": ["every-month", "monthly", "month"],
  "every-three-months": ["every-three-months", "quarterly", "every-quarter"],
  "every-six-months": ["every-six-months", "semiannual", "semi-annually"],
  "every-year": ["every-year", "yearly", "annual"],
  custom: ["custom"],
};

export const formatRecurringCycle = (
  cycle: RecurringCycle,
  labels: BillingLabels = defaultBillingLabels,
) => {
  return labels.billingCycle[cycle];
};

export const resolveProductIdForPlan = (
  plan: UIPlanEntry,
  selectedCycle: RecurringCycle | undefined,
) => {
  const productIds = plan.creemProductIds;
  if (!productIds) {
    return undefined;
  }

  const aliases = selectedCycle
    ? CYCLE_KEY_ALIASES[selectedCycle]
    : CYCLE_KEY_ALIASES.custom;
  for (const alias of aliases) {
    if (productIds[alias]) {
      return productIds[alias];
    }
    const partial = Object.entries(productIds).find(([key]) =>
      key.toLowerCase().includes(alias),
    );
    if (partial) {
      return partial[1];
    }
  }

  return Object.values(productIds)[0];
};

export const hasBillingActionLocal = (
  snapshot: BillingSnapshot,
  action: AvailableAction,
) => snapshot.availableActions.includes(action);

export const formatPrice = (
  amount: number,
  currency: string,
  formatCurrency?: (input: BillingCurrencyFormatInput) => string,
): string => {
  return (
    formatCurrency ??
    ((input) =>
      new Intl.NumberFormat(input.locale, {
        style: "currency",
        currency: input.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(input.amount / 100))
  )({ amount, currency });
};

export const resolveProductPrice = (
  productId: string | undefined,
  products: ConnectedProduct[],
  formatCurrency?: (input: BillingCurrencyFormatInput) => string,
): { formatted: string; interval?: string } | null => {
  if (!productId || !products.length) return null;
  const product = products.find((p) => p.id === productId);
  if (!product) return null;
  if (product.price == null || !product.currency) return null;
  const formatted = formatPrice(
    product.price,
    product.currency,
    formatCurrency,
  );
  return { formatted, interval: product.billingPeriod ?? undefined };
};

const INTERVAL_LABELS: Record<string, string> = {
  month: "/mo",
  "every-month": "/mo",
  "every-three-months": "/3mo",
  "every-six-months": "/6mo",
  year: "/yr",
  "every-year": "/yr",
};

export const formatUnitPrice = (
  productId: string | undefined,
  products: ConnectedProduct[],
  units: number,
  labels: BillingLabels = defaultBillingLabels,
  formatCurrency?: (input: BillingCurrencyFormatInput) => string,
): string | null => {
  const resolved = resolveProductPrice(productId, products, formatCurrency);
  if (!resolved) return null;
  const suffix = resolved.interval
    ? (INTERVAL_LABELS[resolved.interval] ?? "")
    : "";
  if (units <= 1) {
    return `${resolved.formatted}${suffix}`;
  }
  return `${resolved.formatted}${suffix} × ${labels.subscription.unitCount(units)}`;
};

export const formatUnitPriceBreakdown = (
  productId: string | undefined,
  products: ConnectedProduct[],
  units: number,
  labels: BillingLabels = defaultBillingLabels,
  formatCurrency?: (input: BillingCurrencyFormatInput) => string,
): { total: string; calculation: string } | null => {
  if (!productId || !products.length) return null;
  const product = products.find((p) => p.id === productId);
  if (!product) return null;
  if (product.price == null || !product.currency) return null;
  const suffix = product.billingPeriod
    ? (INTERVAL_LABELS[product.billingPeriod] ?? "")
    : "";
  const unit = `${formatPrice(product.price, product.currency, formatCurrency)}${suffix}`;
  const total = `${formatPrice(product.price * units, product.currency, formatCurrency)}${suffix}`;
  return {
    total,
    calculation: labels.subscription.unitPriceCalculation({
      unitPrice: unit,
      units,
      total,
    }),
  };
};

export const formatPriceWithInterval = (
  productId: string | undefined,
  products: ConnectedProduct[],
  formatCurrency?: (input: BillingCurrencyFormatInput) => string,
): string | null => {
  const resolved = resolveProductPrice(productId, products, formatCurrency);
  if (!resolved) return null;
  const suffix = resolved.interval
    ? (INTERVAL_LABELS[resolved.interval] ?? "")
    : "";
  return `${resolved.formatted}${suffix}`;
};
