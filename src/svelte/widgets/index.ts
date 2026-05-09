import SubscriptionItemComponent from "./Subscription.svelte";
import SubscriptionRootComponent from "./SubscriptionRoot.svelte";
import SubscriptionGridComponent from "./SubscriptionGrid.svelte";
import SubscriptionGroupComponent from "./SubscriptionGroup.svelte";
import SubscriptionGroupSelectorComponent from "./SubscriptionGroupSelector.svelte";
import SubscriptionIntervalSelectorComponent from "./SubscriptionIntervalSelector.svelte";
import SubscriptionItemTitleComponent from "./SubscriptionItemTitle.svelte";
import SubscriptionItemPriceComponent from "./SubscriptionItemPrice.svelte";
import SubscriptionItemDescriptionComponent from "./SubscriptionItemDescription.svelte";
import SubscriptionItemCTAComponent from "./SubscriptionItemCTA.svelte";
import SubscriptionItemBadgeComponent from "./SubscriptionItemBadge.svelte";
import ProductItemComponent from "./Product.svelte";
import ProductRootComponent from "./ProductRoot.svelte";

export { default as BillingPortal } from "./BillingPortal.svelte";
export { default as BillingHistory } from "./BillingHistory.svelte";
export { default as Credits } from "./Credits.svelte";
export { getSubscriptionItemContext } from "./subscriptionItemContext.js";

export const Subscription: typeof SubscriptionItemComponent & {
  Root: typeof SubscriptionRootComponent;
  Item: typeof SubscriptionItemComponent;
  Grid: typeof SubscriptionGridComponent;
  Group: typeof SubscriptionGroupComponent;
  GroupSelector: typeof SubscriptionGroupSelectorComponent;
  IntervalSelector: typeof SubscriptionIntervalSelectorComponent;
  ItemTitle: typeof SubscriptionItemTitleComponent;
  ItemPrice: typeof SubscriptionItemPriceComponent;
  ItemDescription: typeof SubscriptionItemDescriptionComponent;
  ItemCTA: typeof SubscriptionItemCTAComponent;
  ItemBadge: typeof SubscriptionItemBadgeComponent;
} = Object.assign(SubscriptionItemComponent, {
  Root: SubscriptionRootComponent,
  Item: SubscriptionItemComponent,
  Grid: SubscriptionGridComponent,
  Group: SubscriptionGroupComponent,
  GroupSelector: SubscriptionGroupSelectorComponent,
  IntervalSelector: SubscriptionIntervalSelectorComponent,
  ItemTitle: SubscriptionItemTitleComponent,
  ItemPrice: SubscriptionItemPriceComponent,
  ItemDescription: SubscriptionItemDescriptionComponent,
  ItemCTA: SubscriptionItemCTAComponent,
  ItemBadge: SubscriptionItemBadgeComponent,
});

export const Product: typeof ProductItemComponent & {
  Root: typeof ProductRootComponent;
  Item: typeof ProductItemComponent;
  /** @deprecated Use `Product.Root` instead. */
  Group: typeof ProductRootComponent;
} = Object.assign(ProductItemComponent, {
  Root: ProductRootComponent,
  Item: ProductItemComponent,
  Group: ProductRootComponent,
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
