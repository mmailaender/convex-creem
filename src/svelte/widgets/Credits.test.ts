import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const creditsSource = readFileSync(
  fileURLToPath(new URL("./Credits.svelte", import.meta.url)),
  "utf8",
);
const creditsRefreshSource = readFileSync(
  fileURLToPath(new URL("./CreditsRefresh.svelte", import.meta.url)),
  "utf8",
);
const creditsAmountSource = readFileSync(
  fileURLToPath(new URL("./CreditsAmount.svelte", import.meta.url)),
  "utf8",
);
const creditsCombinedSource = [
  creditsSource,
  creditsRefreshSource,
  creditsAmountSource,
].join("\n");

describe("Credits.svelte styling", () => {
  it("uses Tailwind and design-system utilities instead of component CSS", () => {
    expect(creditsCombinedSource).not.toMatch(/<style[\s>]/);
    expect(creditsCombinedSource).not.toContain("creem-credits");
    expect(creditsCombinedSource).not.toContain("consumeAmount");

    expect(creditsCombinedSource).toContain("icon-button-ghost-sm");
    expect(creditsCombinedSource).toContain("border-border-subtle");
    expect(creditsCombinedSource).toContain("text-foreground-default");
  });
});
