<script lang="ts">
  import { RefreshCw } from "@lucide/svelte";
  import { getCreditsContext } from "./creditsContext.js";

  interface Props {
    class?: string;
    label?: string;
  }

  let { class: className = "icon-button-ghost-sm", label = undefined }:
    Props = $props();

  const credits = getCreditsContext();
</script>

<button
  class={className}
  onclick={() => void credits.refresh()}
  disabled={credits.loading}
  aria-label={label ?? credits.labels.credits.refreshBalance}
>
  <RefreshCw
    aria-hidden="true"
    class={`size-4 ${credits.loading ? "animate-spin" : ""}`}
  />
</button>
