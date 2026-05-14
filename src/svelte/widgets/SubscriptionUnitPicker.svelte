<script lang="ts">
  import NumberInput from "../primitives/NumberInput.svelte";
  import { getSubscriptionItemContext } from "./subscriptionItemContext.js";

  interface Props {
    class?: string;
    rowClass?: string;
    labelClass?: string;
    actionsClass?: string;
    secondaryClass?: string;
    primaryClass?: string;
    numberInputClass?: string;
    label?: string;
    changeLabel?: string;
    updateLabel?: string;
    cancelLabel?: string;
    detailed?: boolean;
  }

  let {
    class: className = "",
    rowClass: rowClassName = "",
    labelClass: labelClassName = "",
    actionsClass: actionsClassName = "",
    secondaryClass: secondaryClassName = "",
    primaryClass: primaryClassName = "",
    numberInputClass: numberInputClassName = "",
    label = "Units:",
    changeLabel = "Change units",
    updateLabel = "Update",
    cancelLabel = "Cancel",
    detailed = false,
  }: Props = $props();

  const ctx = getSubscriptionItemContext();
  let editing = $state(false);
  let draftUnits = $state(1);

  const isUnitPlan = $derived(ctx.plan.pricingModel === "unit");
  const outerClass = $derived(
    ctx.unstyled
      ? className
      : `creem-base:flex creem-base:w-full creem-base:flex-col creem-base:gap-2 ${className}`,
  );
  const rowClass = $derived(
    ctx.unstyled
      ? rowClassName
      : `creem-base:flex creem-base:w-full creem-base:items-center creem-base:justify-between creem-base:rounded-xl creem-base:bg-surface-subtle creem-base:py-2 creem-base:pl-4 creem-base:pr-2 ${rowClassName}`,
  );
  const labelClass = $derived(
    ctx.unstyled
      ? labelClassName
      : `creem-base:label-m creem-base:text-foreground-default ${labelClassName}`,
  );
  const actionsClass = $derived(
    ctx.unstyled
      ? actionsClassName
      : `creem-base:flex creem-base:w-full creem-base:items-center creem-base:gap-2 ${actionsClassName}`,
  );
  const secondaryClass = $derived(
    ctx.unstyled
      ? secondaryClassName
      : `creem-base:button-faded creem-base:h-8 creem-base:w-full ${secondaryClassName}`,
  );
  const primaryClass = $derived(
    ctx.unstyled
      ? primaryClassName
      : `creem-base:button-filled creem-base:h-8 creem-base:w-full creem-base:disabled:cursor-not-allowed creem-base:disabled:opacity-50 ${primaryClassName}`,
  );
  const unitsChanged = $derived(
    ctx.subscribedUnits != null && draftUnits !== ctx.subscribedUnits,
  );
</script>

{#if isUnitPlan && !ctx.isSwitchPlan}
  {#if ctx.isActive}
    {#if !ctx.onUpdateUnits}
      <div class={outerClass}>
        <div class={rowClass}>
          <span class={labelClass}>{label}</span>
          <span>{ctx.subscribedUnits ?? ctx.checkoutUnits}</span>
        </div>
      </div>
    {:else if !editing}
      <div class={outerClass}>
        {#if detailed}
          <div class={rowClass}>
            <span class={labelClass}>{label}</span>
            <span>{ctx.subscribedUnits ?? ctx.checkoutUnits}</span>
          </div>
        {/if}
        <button
          type="button"
          class={secondaryClass}
          disabled={ctx.disableUnits}
          onclick={() => {
            draftUnits = ctx.subscribedUnits ?? ctx.checkoutUnits;
            editing = true;
          }}
        >
          {changeLabel}
        </button>
      </div>
    {:else}
      <div class={outerClass}>
        <div class={rowClass}>
          <span class={labelClass}>{label}</span>
          <NumberInput
            value={draftUnits}
            min={1}
            compact
            disabled={ctx.disableUnits}
            className={numberInputClassName}
            onValueChange={(next) => {
              if (next > 0) draftUnits = next;
            }}
          />
        </div>
        <div class={actionsClass}>
          <button
            type="button"
            class={secondaryClass}
            onclick={() => {
              draftUnits = ctx.subscribedUnits ?? ctx.checkoutUnits;
              editing = false;
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            class={primaryClass}
            disabled={ctx.disableUnits || !unitsChanged}
            onclick={() => ctx.onUpdateUnits?.(draftUnits)}
          >
            {updateLabel}
          </button>
        </div>
      </div>
    {/if}
  {:else}
    <div class={outerClass}>
      <div class={rowClass}>
        <span class={labelClass}>{label}</span>
        <NumberInput
          value={ctx.checkoutUnits}
          min={1}
          compact
          disabled={ctx.disableUnits}
          className={numberInputClassName}
          onValueChange={ctx.setCheckoutUnits}
        />
      </div>
    </div>
  {/if}
{/if}
