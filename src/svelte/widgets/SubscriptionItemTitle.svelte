<script lang="ts">
  import { getSubscriptionItemContext } from "./subscriptionItemContext.js";

  interface Props {
    class?: string;
  }

  let { class: className = "" }: Props = $props();
  const ctx = getSubscriptionItemContext();
</script>

<h3 class={`font-semibold ${className}`}>{ctx.plan.title}</h3>
