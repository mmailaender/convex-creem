<script lang="ts">
  import type { FunctionReference } from "convex/server";
  import { useConvexClient } from "@mmailaender/convex-svelte";

  interface Props {
    portalUrl: FunctionReference<"action">;
    class?: string;
    children?: import("svelte").Snippet;
  }

  let {
    portalUrl,
    class: className = "",
    children,
  }: Props = $props();

  const client = useConvexClient();
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  const handleClick = async () => {
    isLoading = true;
    error = null;
    try {
      const result = (await client.action(portalUrl, {})) as { url: string };
      window.location.href = result.url;
    } catch (err) {
      error =
        err instanceof Error ? err.message : "Failed to open billing portal";
      isLoading = false;
    }
  };
</script>

<button
  type="button"
  class={`button-faded border border-error-border-subtle bg-error-surface-subtle text-error-foreground-default hover:bg-error-surface-tonal disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
  disabled={isLoading}
  onclick={handleClick}
>
  {#if isLoading}
    Opening portal…
  {:else if children}
    {@render children()}
  {:else}
    Update payment method
  {/if}
</button>
{#if error}
  <p class="label-s mt-1 text-error-foreground-muted">{error}</p>
{/if}
