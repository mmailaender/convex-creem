<script lang="ts">
  import { useConvexClient } from "@mmailaender/convex-svelte";
  import { RefreshCw } from "@lucide/svelte";
  import type { ConnectedBillingApi } from "./types.js";

  interface Props {
    api: ConnectedBillingApi;
    /** Amount to debit per consume action (default "1") */
    consumeAmount?: string;
    /** Label for the unit (default "credits") */
    unitLabel?: string;
    class?: string;
  }

  let {
    api,
    consumeAmount = "1",
    unitLabel = "credits",
    class: className = "",
  }: Props = $props();

  const client = useConvexClient();

  let balance = $state<string | null>(null);
  let loading = $state(false);
  let consuming = $state(false);
  let error = $state<string | null>(null);
  let lastAction = $state<string | null>(null);

  async function refreshBalance() {
    if (!api.credits?.getBalance) return;
    loading = true;
    error = null;
    try {
      const result = await client.action(api.credits.getBalance, {});
      balance = result?.balance ?? "0";
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "Failed to load balance";
    } finally {
      loading = false;
    }
  }

  async function consumeCredits() {
    if (!api.credits?.debit) return;
    consuming = true;
    error = null;
    lastAction = null;
    try {
      const key = `debit_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await client.action(api.credits.debit, {
        amount: consumeAmount,
        reference: `consume_${key}`,
        idempotencyKey: key,
      });
      lastAction = `Consumed ${consumeAmount} ${unitLabel}`;
      await refreshBalance();
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "Failed to consume credits";
    } finally {
      consuming = false;
    }
  }

  $effect(() => {
    if (api.credits?.getBalance) {
      refreshBalance();
    }
  });
</script>

<section
  class={`w-full max-w-sm space-y-4 radius-xl border border-border-subtle bg-surface-base p-6 text-foreground-default ${className}`}
>
  <div class="flex items-center justify-between gap-3">
    <h3 class="title-s text-foreground-default">Credit Balance</h3>
    <button
      class="icon-button-ghost-sm"
      onclick={refreshBalance}
      disabled={loading}
      aria-label="Refresh balance"
    >
      <RefreshCw
        aria-hidden="true"
        class={`size-4 ${loading ? "animate-spin" : ""}`}
      />
    </button>
  </div>

  {#if loading && balance === null}
    <div class="body-m py-3 text-foreground-muted">Loading…</div>
  {:else if error}
    <div
      class="body-m radius-m border border-error-border-subtle bg-error-surface-subtle px-3 py-2 text-error-foreground-default"
    >
      {error}
    </div>
  {:else}
    <div class="flex items-baseline gap-2">
      <span class="heading-s tabular-nums text-foreground-default"
        >{balance ?? "—"}</span
      >
      <span class="label-m text-foreground-muted">{unitLabel}</span>
    </div>
  {/if}

  {#if lastAction}
    <div class="label-s text-success-foreground-default">{lastAction}</div>
  {/if}

  <button
    class="button-filled h-10 w-full disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
    onclick={consumeCredits}
    disabled={consuming || balance === "0" || balance === null}
  >
    {#if consuming}
      Consuming…
    {:else}
      Consume {consumeAmount} {unitLabel}
    {/if}
  </button>
</section>
