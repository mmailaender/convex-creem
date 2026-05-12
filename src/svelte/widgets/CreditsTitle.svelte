<script lang="ts">
  interface Props {
    class?: string;
    children?: import("svelte").Snippet;
  }

  let { class: className = "title-s text-foreground-default", children }: Props =
    $props();
</script>

<h3 class={className}>
  {#if children}
    {@render children()}
  {:else}
    Credit Balance
  {/if}
</h3>
