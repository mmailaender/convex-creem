<script lang="ts">
  import { getCreditsContext } from "./creditsContext.js";

  interface Props {
    class?: string;
    loadingLabel?: string;
    idleLabel?: string;
  }

  let {
    class: className = "label-s text-foreground-muted",
    loadingLabel = undefined,
    idleLabel = "",
  }: Props = $props();

  const credits = getCreditsContext();
</script>

{#if credits.loading || idleLabel}
  <div class={className}>
    {credits.loading ? (loadingLabel ?? credits.labels.credits.refreshing) : idleLabel}
  </div>
{/if}
