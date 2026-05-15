<script lang="ts">
  import { SegmentGroup as ArkSegmentGroup } from "@ark-ui/svelte/segment-group";

  export type SegmentGroupItem = {
    label: string;
    value: string;
    disabled?: boolean;
  };

  interface Props {
    items?: SegmentGroupItem[];
    value?: string | null;
    defaultValue?: string;
    disabled?: boolean;
    className?: string;
    unstyled?: boolean;
    onValueChange?: (value: string) => void;
  }

  let {
    items = [],
    value = undefined,
    defaultValue = undefined,
    disabled = false,
    className = "",
    unstyled = false,
    onValueChange,
  }: Props = $props();

  const resolvedValue = $derived(value ?? undefined);
  const controlKey = $derived(
    `${items.map((item) => item.value).join("|")}::${resolvedValue ?? ""}`,
  );
</script>

{#if items.length > 1}
  {#key controlKey}
    <ArkSegmentGroup.Root
      value={resolvedValue}
      {defaultValue}
      {disabled}
      class={unstyled ? className : `creem-base:segment-group ${className}`}
      onValueChange={(details) => {
        if (details.value != null) onValueChange?.(details.value);
      }}
    >
      <ArkSegmentGroup.Indicator
        class={unstyled ? "" : "creem-base:segment-group-indicator"}
      />
      {#each items as item (item.value)}
        <ArkSegmentGroup.Item
          value={item.value}
          disabled={item.disabled}
          class={unstyled ? "" : "creem-base:segment-group-item"}
        >
          <ArkSegmentGroup.ItemText
            class={unstyled ? "" : "creem-base:segment-group-item-text creem-base:label-m"}
          >
            {item.label}
          </ArkSegmentGroup.ItemText>
          <ArkSegmentGroup.ItemControl
            class={unstyled ? "" : "creem-base:segment-group-item-control"}
          />
          <ArkSegmentGroup.ItemHiddenInput />
        </ArkSegmentGroup.Item>
      {/each}
    </ArkSegmentGroup.Root>
  {/key}
{/if}
