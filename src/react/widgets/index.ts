import { SubscriptionItem } from "./SubscriptionItem.js";
import { SubscriptionRoot } from "./SubscriptionRoot.js";
import { SubscriptionGrid } from "./SubscriptionGrid.js";
import { SubscriptionGroup } from "./SubscriptionGroup.js";
import { SubscriptionGroupSelector } from "./SubscriptionGroupSelector.js";
import { SubscriptionIntervalSelector } from "./SubscriptionIntervalSelector.js";
import {
  SubscriptionItemTitle,
  SubscriptionItemPrice,
  SubscriptionItemPriceCaption,
  SubscriptionItemDescription,
  SubscriptionItemCTA,
  SubscriptionItemBadge,
  SubscriptionUnitPicker,
  SubscriptionCancel,
} from "./SubscriptionItemSlots.js";
import { ProductItem } from "./ProductItem.js";
import { ProductRoot } from "./ProductRoot.js";
import { CreditsRoot } from "./CreditsRoot.js";
import {
  CreditsAmount,
  CreditsError,
  CreditsRefresh,
  CreditsStatus,
  CreditsTitle,
} from "./CreditsSlots.js";

export { BillingPortal } from "./BillingPortal.js";
export { BillingHistory } from "./BillingHistory.js";
export { useSubscriptionItem } from "./subscriptionItemContext.js";
export { useCredits } from "./creditsContext.js";

export const Subscription: typeof SubscriptionItem & {
  Root: typeof SubscriptionRoot;
  Item: typeof SubscriptionItem;
  Grid: typeof SubscriptionGrid;
  Group: typeof SubscriptionGroup;
  GroupSelector: typeof SubscriptionGroupSelector;
  IntervalSelector: typeof SubscriptionIntervalSelector;
  ItemTitle: typeof SubscriptionItemTitle;
  ItemPrice: typeof SubscriptionItemPrice;
  ItemPriceCaption: typeof SubscriptionItemPriceCaption;
  ItemDescription: typeof SubscriptionItemDescription;
  ItemCTA: typeof SubscriptionItemCTA;
  ItemBadge: typeof SubscriptionItemBadge;
  UnitPicker: typeof SubscriptionUnitPicker;
  Cancel: typeof SubscriptionCancel;
} = Object.assign(SubscriptionItem, {
  Root: SubscriptionRoot,
  Item: SubscriptionItem,
  Grid: SubscriptionGrid,
  Group: SubscriptionGroup,
  GroupSelector: SubscriptionGroupSelector,
  IntervalSelector: SubscriptionIntervalSelector,
  ItemTitle: SubscriptionItemTitle,
  ItemPrice: SubscriptionItemPrice,
  ItemPriceCaption: SubscriptionItemPriceCaption,
  ItemDescription: SubscriptionItemDescription,
  ItemCTA: SubscriptionItemCTA,
  ItemBadge: SubscriptionItemBadge,
  UnitPicker: SubscriptionUnitPicker,
  Cancel: SubscriptionCancel,
});

export const Product: typeof ProductItem & {
  Root: typeof ProductRoot;
  Item: typeof ProductItem;
} = Object.assign(ProductItem, {
  Root: ProductRoot,
  Item: ProductItem,
});

export const Credits: typeof CreditsRoot & {
  Root: typeof CreditsRoot;
  Title: typeof CreditsTitle;
  Amount: typeof CreditsAmount;
  Refresh: typeof CreditsRefresh;
  Error: typeof CreditsError;
  Status: typeof CreditsStatus;
} = Object.assign(CreditsRoot, {
  Root: CreditsRoot,
  Title: CreditsTitle,
  Amount: CreditsAmount,
  Refresh: CreditsRefresh,
  Error: CreditsError,
  Status: CreditsStatus,
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
