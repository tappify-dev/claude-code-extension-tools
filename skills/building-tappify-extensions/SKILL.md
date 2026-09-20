---
name: building-tappify-extensions
description: Use when writing or changing a Tappify extension — the fields of a tappify.extension.json manifest, a component importing @tappify/extension-sdk, anything reading or writing across the tap.* bridge — and when deciding what an extension is allowed to do.
---

# Building Tappify extensions

## Overview

An extension is two things: `tappify.extension.json`, which declares what it
contributes and what it is allowed to read, and a bundle of components the
host loads and mounts in a Shadow DOM. Nothing else is negotiable — the host
owns routing, auth, tokens, providers, styling and every failure state.

The manifest is the contract. If a thing is not declared, it does not exist at
runtime.

**REQUIRED BACKGROUND:** the nouns are fixed. The vendor-built thing is an
**extension**, the store is the **Tap Store**, its maker is a **vendor**, the
customer is an **owner**, the Tappify dashboard is the **host**, and the only
thing called an **app** is the owner's iOS or Android product.

## The manifest

```json
{
  "$schema": "https://schema.tappify.ai/extension/v2.json",
  "id": "funnel-lab",
  "name": "Funnel Lab",
  "description": "Shows where installs drop out of the store funnel.",
  "icon": "icon.svg",
  "category": "product_analytics",
  "sdk": "^2.0.0",
  "visibility": "private",
  "installScope": "project",
  "scopes": [{ "key": "ui:render" }, { "key": "analytics:read" }],
  "contributes": {}
}
```

`id` is permanent once published. Category and scope come from the registry —
read it with `extension_registry`, never from memory.

`contributes` is not hand-written. To add one, read **adding-a-contribution**
and run `tappify extension add <kind>` or the `extension_add` tool: a run writes
the manifest entry, its files, its scopes and the generated types together. Each
`entry` is a source path the Vite plugin turns into a federated expose.

## The bridge

Everything a component reads or writes crosses `tap.*`, and every hook is a
`useTap*`:

| Need | Use |
| --- | --- |
| Project, filters, theme, size | `useTapProject`, `useTapFilters`, `useTapTheme`, `useTapSize` |
| Tappify data | `useTapQuery(query)` — one of the seven query kinds, each behind a scope |
| Your own server | `useTapServer(name, input)` — a declared procedure |
| Your own storage | `useTapStorage(name)` for a singleton, `tap.storage.<collection>` for a collection |
| State shared between your own contributions | `useTapState(key)` |
| Navigation, toasts, confirmations, actions | `useTap()` then `tap.nav`, `tap.ui`, `tap.actions` — declare actions now; `run` rejects with `TAP_ACTIONS_UNAVAILABLE` until approval cards ship |

A component is the default export of its `entry` file, built from the UI kit
(`TapCard`, `TapStat`, `TapSkeleton`, `TapErrorState`, `TapForm`) with
`import "@tappify/extension-sdk/styles.css"` once per entry file. Widgets
render at 320 px.

## Storage

Declare a collection in `contributes.storage` under a lower snake_case name,
with a scope (`user`, `install` or `organization`), a JSON Schema validated on
write, and `singleton: true` for one document per scope key.
`settings` is reserved for the settings contribution.

Personal data does not go in extension storage. Field names like `email`,
`name`, `phone`, `address` and `ip` warn `storage.pii` in `doctor` and at
publish; a reviewer sees the schema only on a release reviewed for another
reason.

## Never

| An extension never | Because |
| --- | --- |
| Reaches outside its Shadow DOM — `window.parent`, `document.querySelector` on host nodes, `postMessage` to the host | The host owns its own DOM; the bridge is the whole surface |
| Fetches Tappify's API itself, or constructs a token, client or provider | The host mints, refreshes and audience-binds every token |
| Uses `localStorage`, `sessionStorage` or cookies for its own state | `useTapState` for shared state, hosted storage for anything that must persist |
| Writes anything on the owner's behalf without an approval card | Every action carries `approval: true`, and no caller can bypass the card |
| Loads a `<script>` or a font from another origin | The static scan rejects the bundle |
| Ships its own fonts or colour values | The UI kit is restyled onto host CSS variables |
| Reads a credential it was not granted | Credentials live in the vault and reach only the vendor's own server |
| Runs any code on Tappify's servers | The vendor's server runs the vendor's code |

## Read next

[reference.md](reference.md) has the scope table, the pages, slots, charts and
host tables, every contribution kind, and the limits the validator enforces.
**adding-a-contribution** covers adding one.

## Rationalizations

| Excuse | Reality |
| --- | --- |
| "I'll fetch our API directly, the bridge doesn't have this yet" | A missing query kind is a platform gap to report, not a `fetch` to write. Direct calls have no token, no scope and no rate limit |
| "localStorage is fine, it's just a UI preference" | Owners open the host on three devices. `useTapState` for the session, hosted storage to keep it |
| "The slot name looked right" | A slot belongs to one page. Read the registry; a wrong pair fails the checks |
| "I'll add the scope later, it works in dev" | Dev installs grant what the manifest declares. A missing scope is the "needs a scope" card in production |
| "Storing the owner's email makes support easier" | It warns `storage.pii` and it is the design's one prohibition. Store an id |
| "Editing src/tappify.d.ts is faster than rerunning types" | Every `add`, `remove` and `dev` rewrites the file, and so does `doctor --fix`. Change the manifest |
