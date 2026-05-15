import type { PropsWithChildren } from "react";
import { CheckoutButton } from "./CheckoutButton.js";
import { defaultBillingLabels, type BillingLabels } from "../../core/i18n.js";

export const OneTimeCheckoutButton = ({
  productId,
  href,
  disabled = false,
  className = "",
  onCheckout,
  labels = defaultBillingLabels,
  children,
}: PropsWithChildren<{
  productId: string;
  href?: string;
  disabled?: boolean;
  className?: string;
  onCheckout?: (payload: { productId: string }) => Promise<void> | void;
  labels?: BillingLabels;
}>) => (
  <CheckoutButton
    productId={productId}
    href={href}
    disabled={disabled}
    className={className}
    onCheckout={onCheckout}
    labels={labels}
  >
    {children ?? labels.checkout.buyNow}
  </CheckoutButton>
);
