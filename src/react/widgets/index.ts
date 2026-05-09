import { SubscriptionItem } from "./SubscriptionItem.js";
import { SubscriptionRoot } from "./SubscriptionRoot.js";
import { SubscriptionGrid } from "./SubscriptionGrid.js";
import { SubscriptionGroup } from "./SubscriptionGroup.js";
import { SubscriptionGroupSelector } from "./SubscriptionGroupSelector.js";
import { SubscriptionIntervalSelector } from "./SubscriptionIntervalSelector.js";
import {
  SubscriptionItemTitle,
  SubscriptionItemPrice,
  SubscriptionItemDescription,
  SubscriptionItemCTA,
  SubscriptionItemBadge,
} from "./SubscriptionItemSlots.js";
import { ProductItem } from "./ProductItem.js";
import { ProductRoot } from "./ProductRoot.js";

export { BillingPortal } from "./BillingPortal.js";
export { BillingHistory } from "./BillingHistory.js";
export { useSubscriptionItem } from "./subscriptionItemContext.js";

export const Subscription: typeof SubscriptionItem & {
  Root: typeof SubscriptionRoot;
  Item: typeof SubscriptionItem;
  Grid: typeof SubscriptionGrid;
  Group: typeof SubscriptionGroup;
  GroupSelector: typeof SubscriptionGroupSelector;
  IntervalSelector: typeof SubscriptionIntervalSelector;
  ItemTitle: typeof SubscriptionItemTitle;
  ItemPrice: typeof SubscriptionItemPrice;
  ItemDescription: typeof SubscriptionItemDescription;
  ItemCTA: typeof SubscriptionItemCTA;
  ItemBadge: typeof SubscriptionItemBadge;
} = Object.assign(SubscriptionItem, {
  Root: SubscriptionRoot,
  Item: SubscriptionItem,
  Grid: SubscriptionGrid,
  Group: SubscriptionGroup,
  GroupSelector: SubscriptionGroupSelector,
  IntervalSelector: SubscriptionIntervalSelector,
  ItemTitle: SubscriptionItemTitle,
  ItemPrice: SubscriptionItemPrice,
  ItemDescription: SubscriptionItemDescription,
  ItemCTA: SubscriptionItemCTA,
  ItemBadge: SubscriptionItemBadge,
});

export const Product: typeof ProductItem & {
  Root: typeof ProductRoot;
  Item: typeof ProductItem;
  /** @deprecated Use `Product.Root` instead. */
  Group: typeof ProductRoot;
} = Object.assign(ProductItem, {
  Root: ProductRoot,
  Item: ProductItem,
  Group: ProductRoot,
});

export type {
  ConnectedBillingApi,
  ConnectedBillingModel,
  ConnectedTransaction,
  ConnectedTransactionList,
  ProductType,
  SubscriptionPlanType,
  Transition,
} from "./types.js";
