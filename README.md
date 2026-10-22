# Convex Creem Component (deprecated)

> [!WARNING] **`@mmailaender/convex-creem` is deprecated and no longer
> maintained.** Development continues at Creem as
> [`@creem_io/convex`](https://www.npmjs.com/package/@creem_io/convex).

This repository won't receive further updates, fixes, or releases. Please don't
open new issues or pull requests here.

## Where to go

- **Docs:**
  [docs.creem.io/code/sdks/convex](https://docs.creem.io/code/sdks/convex/quickstart)
- **npm:** [`@creem_io/convex`](https://www.npmjs.com/package/@creem_io/convex)
- **Source:**
  [armitage-labs/creem › packages/integrations/convex](https://github.com/armitage-labs/creem/tree/main/packages/integrations/convex)
- **Issues:**
  [armitage-labs/creem/issues](https://github.com/armitage-labs/creem/issues)

## Migrating from `@mmailaender/convex-creem`

`@creem_io/convex` is the same component under a new name. Its version history
continues from this package's `0.3.0`.

1. Swap the package and add `creem` (it's now a peer dependency):

   ```bash
   npm uninstall @mmailaender/convex-creem
   npm install @creem_io/convex convex creem
   ```

2. Replace `@mmailaender/convex-creem` with `@creem_io/convex` in every import,
   including `convex/convex.config.ts` and your CSS entry point:

   ```ts
   import creem from "@creem_io/convex/convex.config";
   import { Creem } from "@creem_io/convex";
   ```

   ```css
   @import "@creem_io/convex/styles";
   ```

3. Version `0.4.0` has breaking changes. Work through
   [Upgrading from 0.3.x](https://docs.creem.io/code/sdks/convex/migration#upgrading-from-0-3-x),
   then check the
   [changelog](https://github.com/armitage-labs/creem/blob/main/packages/integrations/convex/CHANGELOG.md)
   for steps added in later releases.

The component is still registered under the name `creem`, so your existing
Convex data stays where it is.

## Old documentation

The README for the last release (`0.3.0`) is still available
[here](https://github.com/mmailaender/convex-creem/blob/a115c94/README.md).
