import { SegmentGroup as ArkSegmentGroup } from "@ark-ui/react/segment-group";

export type SegmentGroupItem = {
  label: string;
  value: string;
  disabled?: boolean;
};

export const SegmentGroup = ({
  items = [],
  value,
  defaultValue,
  disabled = false,
  className = "",
  unstyled = false,
  onValueChange,
}: {
  items?: SegmentGroupItem[];
  value?: string | null;
  defaultValue?: string;
  disabled?: boolean;
  className?: string;
  unstyled?: boolean;
  onValueChange?: (value: string) => void;
}) => {
  if (items.length <= 1) return null;

  const resolvedValue = value ?? undefined;
  const controlKey = `${items.map((item) => item.value).join("|")}::${resolvedValue ?? ""}`;

  return (
    <ArkSegmentGroup.Root
      key={controlKey}
      value={resolvedValue}
      defaultValue={defaultValue}
      disabled={disabled}
      className={unstyled ? className : `creem-base:segment-group ${className}`}
      onValueChange={(details: { value: string | null }) => {
        if (details.value != null) onValueChange?.(details.value);
      }}
    >
      <ArkSegmentGroup.Indicator
        className={unstyled ? "" : "creem-base:segment-group-indicator"}
      />
      {items.map((item) => (
        <ArkSegmentGroup.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          className={unstyled ? "" : "creem-base:segment-group-item"}
        >
          <ArkSegmentGroup.ItemText
            className={
              unstyled
                ? ""
                : "creem-base:segment-group-item-text creem-base:label-m"
            }
          >
            {item.label}
          </ArkSegmentGroup.ItemText>
          <ArkSegmentGroup.ItemControl
            className={unstyled ? "" : "creem-base:segment-group-item-control"}
          />
          <ArkSegmentGroup.ItemHiddenInput />
        </ArkSegmentGroup.Item>
      ))}
    </ArkSegmentGroup.Root>
  );
};
