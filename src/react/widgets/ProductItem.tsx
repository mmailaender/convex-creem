import { useContext, useEffect } from "react";
import { ProductGroupContext } from "./productGroupContext.js";
import type { ProductType } from "./types.js";

export const ProductItem = ({
  productId,
  type,
  title,
  description,
  checkoutMetadata,
}: {
  productId: string;
  type: ProductType;
  title?: string;
  description?: string;
  checkoutMetadata?: Record<string, string>;
}) => {
  const rootContext = useContext(ProductGroupContext);

  useEffect(() => {
    if (!rootContext) return;
    const registration = {
      productId,
      type,
      title,
      description,
      checkoutMetadata,
    };
    const unregister = rootContext.registerItem(registration);
    return unregister;
  }, [rootContext, productId, type, title, description, checkoutMetadata]);

  return null;
};
