import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const creditsSource = readFileSync(
  fileURLToPath(new URL("./Credits.svelte", import.meta.url)),
  "utf8",
);

describe("Credits.svelte styling", () => {
  it("uses Tailwind and design-system utilities instead of component CSS", () => {
    expect(creditsSource).not.toMatch(/<style[\s>]/);
    expect(creditsSource).not.toContain("creem-credits");

    expect(creditsSource).toContain("button-filled");
    expect(creditsSource).toContain("icon-button-ghost-sm");
    expect(creditsSource).toContain("border-border-subtle");
    expect(creditsSource).toContain("text-foreground-default");
  });
});
