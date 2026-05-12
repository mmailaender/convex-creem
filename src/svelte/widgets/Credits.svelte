<script lang="ts">
  import { getContext, setContext, type Snippet } from "svelte";
  import { useConvexClient } from "@mmailaender/convex-svelte";
  import CreditsAmount from "./CreditsAmount.svelte";
  import CreditsError from "./CreditsError.svelte";
  import CreditsRefresh from "./CreditsRefresh.svelte";
  import CreditsTitle from "./CreditsTitle.svelte";
  import {
    CREDITS_CONTEXT_KEY,
    type CreditsContextValue,
  } from "./creditsContext.js";
  import {
    CREEM_CONVEX_CONTEXT_KEY,
    type CreemConvexContextValue,
  } from "../creemConvexContext.js";

  interface Props {
    unitLabel?: string;
    class?: string;
    children?: Snippet;
  }

  let {
    unitLabel = "credits",
    class: className = "",
    children,
  }: Props = $props();

  const provider = getContext<CreemConvexContextValue | undefined>(
    CREEM_CONVEX_CONTEXT_KEY,
  );
  const resolvedApi = provider?.api;
  if (!resolvedApi) {
    throw new Error(
      "Credits.Root must be rendered inside <CreemConvexProvider>.",
    );
  }

  const client = useConvexClient();
  const getBalanceRef = resolvedApi.credits?.getBalance;

  let balance = $state<string | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);

  async function refreshBalance() {
    if (!getBalanceRef) {
      error = "Credits API is not configured.";
      return;
    }
    loading = true;
    error = null;
    try {
      const result = await client.action(getBalanceRef, {});
      balance = result?.balance ?? "0";
    } catch (cause: unknown) {
      error = cause instanceof Error ? cause.message : "Failed to load balance";
    } finally {
      loading = false;
    }
  }

  const contextValue: CreditsContextValue = {
    get balance() {
      return balance;
    },
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
    get unitLabel() {
      return unitLabel;
    },
    refresh: refreshBalance,
  };

  setContext(CREDITS_CONTEXT_KEY, contextValue);

  $effect(() => {
    void refreshBalance();
  });
</script>

<section
  class={`w-full max-w-sm space-y-4 radius-xl border border-border-subtle bg-surface-base p-6 text-foreground-default ${className}`}
>
  {#if children}
    {@render children()}
  {:else}
    <div class="flex items-center justify-between gap-3">
      <CreditsTitle />
      <CreditsRefresh />
    </div>
    <CreditsAmount />
    <CreditsError />
  {/if}
</section>
