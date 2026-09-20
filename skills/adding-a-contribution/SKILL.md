---
name: adding-a-contribution
description: Use when adding a widget, tab, page, row action, marker, settings panel, storage collection, procedure, connector, webhook, tool, mention, action, knowledge file, skill, prompt, context provider or work destination to a Tappify extension, or when a contribution's files, manifest entry or generated types are out of step.
---

# Adding a contribution

## Overview

Never hand-write a manifest entry and a source file separately. One command
writes both, adds the scopes the contribution needs, and regenerates the
types:

```bash
tappify extension add <kind> [name] [--flags]
```

With flags it runs straight through. With flags omitted it asks, using
labelled lists. The `extension_add` MCP tool is the flags form, and it never
prompts.

## The kinds

| Kind | Command | Also asks for |
| --- | --- | --- |
| Widget | `add widget <name>` | page, slot, size, expandable |
| Tab | `add tab <name>` | page, whether it renders on mobile |
| Page | `add page <name>` | whether it joins the project navigation, mobile |
| Row action | `add row-action <name>` | host table |
| Series | `add series <name>` | chart, connector metric |
| Banner | `add banner <name>` | page, webhook event |
| Marker | `add marker <name>` | chart, webhook event, glyph |
| Settings panel | `add settings` | — (one per extension) |
| Storage collection | `add storage <name>` | scope, singleton |
| Procedure | `add procedure <name>` | read or write |
| Connector | `add connector` | sync cadence |
| Webhook | `add webhook <event>` | alert, banner or event |
| Tool | `add tool <name>` | returns, cost |
| Mention | `add mention <name>` | — |
| Action | `add action <name>` | scope, reversible |
| Knowledge | `add knowledge <name>` | category |
| Skill | `add skill <name>` | — |
| Prompt | `add prompt <name>` | surfaces, optional input schema |
| Context provider | `add context <name>` | when it runs |
| Work destination | `add work` | tracker, docs or chat |

## Where files land

| Kind | Writes |
| --- | --- |
| Widget, tab, page, row action | `src/<kind>s/<name>.tsx` — `src/row-actions/` for a row action — plus `test/<name>.test.tsx` and the manifest entry |
| Settings panel | `src/settings.tsx`, `schemas/settings.json`, `test/settings.test.tsx` |
| Series, banner, marker | the manifest entry only |
| Storage | `schemas/<name>.json`, the manifest entry |
| Procedure | `schemas/<name>.input.json`, `schemas/<name>.output.json`, `server/procedures/<name>.ts`, a line in `server/procedures/index.ts` |
| Tool, action | `schemas/<name>.input.json`, a handler under `server/tools/` or `server/actions/`, a line in that barrel |
| Mention, context provider | a handler under `server/mentions/` or `server/context/`, a line in that barrel |
| Connector, work destination | `server/metrics.ts` or `server/work.ts` |
| Webhook | `schemas/<name>.payload.json` |
| Knowledge, skill | `knowledge/<name>.md` or `skills/<name>.md` |
| Prompt | `schemas/<name>.input.json`, when it collects input |

The barrels exist so `add` inserts two lines instead of parsing your code.
Keep them.

## Generated types

`src/tappify.d.ts` is written by the generator from the manifest and its
schema files. `add`, `remove` and `dev` all rewrite it, `doctor` fails the
`types.stale` check when it drifts, `doctor --fix` rewrites it, and it is
committed.

Editing it by hand is always wrong: change the manifest or the schema and run
`tappify extension types`.

It gives you `tap.storage.<collection>`, `tap.server.<procedure>(input)` typed
from both schemas, `ActionId` and `ActionInput`, `TelemetryEvent`, the settings
values type, the input type each tool handler receives, and the payload behind
each host event name.

## After adding

`add` prints two lines: what it wrote, and what to run next. Do that. For a
UI kind it is `tappify extension dev`.

## Rationalizations

| Excuse | Reality |
| --- | --- |
| "Adding the manifest entry by hand is faster" | It skips the scope, the template, the barrel line and the types. Four things to remember instead of none |
| "I'll write the component first and declare it after" | The `entry` path and the expose name come from the declaration. Declare, then edit what it wrote |
| "The types file is stale, I'll just patch it" | It is regenerated on the next command and your patch disappears |
| "This procedure only reads, `kind` doesn't matter" | `kind: "read"` retries twice on a network failure; a write must never retry. A procedure named `create*`, `update*`, `delete*`, `send*` or `set*` without `kind: "write"` is a doctor warning |
| "One more widget won't hurt" | Twenty UI contributions is the ceiling and the publish rejects the twenty-first |
