<script lang="ts">
  import { getContext } from "svelte";
  import { useConvexClient, useQuery } from "@mmailaender/convex-svelte";
  import CustomerPortalButton from "../primitives/CustomerPortalButton.svelte";
  import type { BillingPermissions, ConnectedBillingModel } from "./types.js";
  import type { Snippet } from "svelte";
  import {
    CREEM_CONVEX_CONTEXT_KEY,
    type CreemConvexContextValue,
  } from "../creemConvexContext.js";

  interface Props {
    permissions?: BillingPermissions;
    class?: string;
    children?: Snippet;
  }

  let { permissions = undefined, class: className = "", children }: Props = $props();

  const provider = getContext<CreemConvexContextValue | undefined>(
    CREEM_CONVEX_CONTEXT_KEY,
  );
  const resolvedApi = provider?.api;
  if (!resolvedApi) {
    throw new Error(
      "BillingPortal must be rendered inside <CreemConvexProvider>.",
    );
  }
  const resolvedPermissions = $derived(permissions ?? provider?.permissions);

  const canAccess = $derived(resolvedPermissions?.canAccessPortal !== false);

  const client = useConvexClient();

  const billingUiModelRef = resolvedApi.uiModel;
  const portalUrlRef = resolvedApi.customers?.portalUrl;

  const billingModelQuery = useQuery(billingUiModelRef, {});
  const model = $derived(billingModelQuery.data as ConnectedBillingModel | undefined);
  const hasCreemCustomer = $derived(model?.hasCreemCustomer ?? false);

  let isLoading = $state(false);

  const openPortal = async () => {
    if (!portalUrlRef) return;
    isLoading = true;
    try {
      const { url } = await client.action(portalUrlRef, {});
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      isLoading = false;
    }
  };
</script>

{#if portalUrlRef && hasCreemCustomer && canAccess}
  <CustomerPortalButton
    disabled={isLoading}
    onOpenPortal={openPortal}
    {className}
  >
    {#if children}
      {@render children()}
    {:else}
      Manage billing
    {/if}
  </CustomerPortalButton>
{/if}
