<script lang="ts">
  import type {
    BillingSnapshot,
    PaymentRecoveryState,
    SubscriptionSnapshot,
  } from "../../core/types.js";
  import { derivePaymentRecoveryState } from "../../core/selectors.js";

  interface Props {
    snapshot?: BillingSnapshot | null;
    subscriptions?: SubscriptionSnapshot | SubscriptionSnapshot[] | null;
    recoveryState?: PaymentRecoveryState;
    class?: string;
  }

  let {
    snapshot = null,
    subscriptions = undefined,
    recoveryState: externalState = undefined,
    class: className = "",
  }: Props = $props();

  const state = $derived.by<PaymentRecoveryState>(() => {
    if (externalState) return externalState;
    if (subscriptions !== undefined) {
      return derivePaymentRecoveryState(subscriptions);
    }
    if (snapshot?.subscriptionState) {
      return derivePaymentRecoveryState({
        status: snapshot.subscriptionState,
      });
    }
    return "none";
  });

  const isBlocked = $derived(state === "blocked");
  const show = $derived(state !== "none");
</script>

{#if show}
  <div
    role="alert"
    class={`body-m radius-m border px-4 py-3 ${
      isBlocked
        ? "border-error-border-subtle bg-error-surface-subtle text-error-foreground-default"
        : "border-warning-border-subtle bg-warning-surface-subtle text-warning-foreground-default"
    } ${className}`}
  >
    {#if isBlocked}
      Your subscription payment has failed. Please update your payment method to restore access.
    {:else}
      Your subscription payment is past due. Please update your payment method to avoid service interruption.
    {/if}
  </div>
{/if}
