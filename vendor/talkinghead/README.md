# vendor/talkinghead

Vendored copy of [`@met4citizen/talkinghead`](https://github.com/met4citizen/TalkingHead) **v1.7.0**
(`modules/*`), MIT licensed — see `LICENSE`.

## Why this exists

`lipsyncGetProcessor()` in upstream v1.7.0 loads its language modules with a **fully computed**
specifier:

```js
const moduleName = path + 'lipsync-' + lang.toLowerCase() + '.mjs';
import(moduleName).then(module => { ... });
```

No bundler can statically resolve that. Webpack emits a `Critical dependency: the request of a
dependency is an expression` warning and the import fails at runtime; Turbopack fails outright.
Lip-sync silently never loads, which looks like "the avatar moves but the mouth doesn't".

This is not a Turbopack-specific bug, so pinning `next build --webpack` does **not** remove the
need for the patch.

## The patch

Exactly one hunk, in `talkinghead.mjs` around line 2751. The computed import is replaced with a
static map, which every bundler can follow:

```js
const loaders = {
  'de': () => import('./lipsync-de.mjs'),
  'en': () => import('./lipsync-en.mjs'),
  'fi': () => import('./lipsync-fi.mjs'),
  'fr': () => import('./lipsync-fr.mjs'),
  'lt': () => import('./lipsync-lt.mjs'),
};
const loader = loaders[lang.toLowerCase()];
if (loader) loader().then(module => { this.lipsync[lang] = new module[className]; });
```

Side effect: the `path` argument to `lipsyncGetProcessor()` is now ignored, and only the five
bundled languages are reachable. Cura is English-only (`lipsyncModules: ["en"]`), so neither
matters here. Adding a language means adding a line to `loaders`.

## Upgrading

The npm package is **not** installed — this directory is the only copy, so nothing can drift.
To move to a new upstream version:

1. `npm pack @met4citizen/talkinghead@<version>` and copy `package/modules/*` over this directory.
2. Check whether `lipsyncGetProcessor` still builds its specifier by concatenation. If upstream
   fixed it, drop this directory, `bun add @met4citizen/talkinghead`, and point
   `lib/talkinghead.ts` at the package.
3. Otherwise re-apply the hunk above and keep this file honest.

Types are hand-written in `types/talkinghead.d.ts` — upstream ships none.
