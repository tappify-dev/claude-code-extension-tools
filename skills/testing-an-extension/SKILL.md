---
name: testing-an-extension
description: Use when writing or fixing tests for a Tappify extension — a widget, tab, page, settings panel, procedure, tool handler or server handler — or when a component test does not render the way the host renders it.
---

# Testing an extension

## Overview

The SDK ships a preset that puts a test closer to the host: it sets the host
CSS variables on the document, registers the four matchers, and clears the
mock's portal after each test.

```ts
// vitest.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: [
      "@testing-library/jest-dom/vitest",
      "@tappify/extension-sdk/testing/vitest",
    ],
  },
});
```

Jest projects use `@tappify/extension-sdk/testing/jest` in
`setupFilesAfterEnv` instead. Both need a DOM environment. The starter builds
with Vite, so Vitest is the default, and `tappify extension add` scaffolds a
test beside every UI contribution it writes.

## Rendering a component

```tsx
import { renderWithTap } from "@tappify/extension-sdk/testing";
import { screen, waitFor } from "@testing-library/react";
import Funnel from "../src/widgets/funnel";

it("shows the conversion rate for the selected range", async () => {
  renderWithTap(<Funnel config={{}} />, {
    size: "slot",
    scopes: ["ui:render", "analytics:read"],
    server: { getFunnel: () => ({ steps: [1, 2, 3] }) },
  });

  await waitFor(() =>
    expect(screen.getByText("Conversion")).toBeInTheDocument(),
  );
});
```

It returns what Testing Library returns, plus `tap`, `mock` and `queryClient`.

| Option | Does |
| --- | --- |
| `size` | `slot`, `panel` or `page` — drives `useTapSize` |
| `scopes` | What the bridge allows. Defaults to all of them, so withhold one to prove the missing-scope path |
| `filters`, `project`, `context`, `params`, `theme` | Merged over the fixtures |
| `server` | One function per procedure, answering `tap.server.<name>` |
| `handler` | Your own handler, so `tap.server.<name>` runs its real routes |
| `storage` | The collections the mock exposes, and whether each is a singleton |
| `mock` | A `createTapMock()` you built yourself |

A `handler` has to be built against the test key set —
`createTappifyHandler({ ...handlerOptions, jwks: await testJwks() })` — and
`extensionId` has to name the same extension it does.

## The mock bridge

`createTapMock()` is in-memory and real: storage is an implementation of your
declared collections typed from the generated types, and data queries answer
from the same fixtures the portal preview uses. Navigations, toasts, confirms,
actions and telemetry are recorded on `mock.calls`, and `mock.emit`,
`mock.setFilters`, `mock.setSize`, `mock.setTheme` and `mock.setParams` drive
the bridge from outside the component.

## Matchers

`toHaveNavigatedTo`, `toHaveToasted`, `toHaveRunAction(id, input)`,
`toHaveStored(collection, doc)`. The preset registers them, and they take the
mock: `expect(mock).toHaveToasted(…)`, never the component or `tap`.

## Testing your server

```ts
import { createTestClient } from "@tappify/extension-sdk/testing";
import { handlerOptions } from "../server/handler";

const client = createTestClient(handlerOptions, {
  install: { id: "ins_1" },
  scopes: ["analytics:read"],
});

it("returns a funnel", async () => {
  await expect(
    client.procedure("getFunnel", { range: "28d" }),
  ).resolves.toMatchObject({ steps: expect.any(Array) });
});
```

Hand it the handler options, not a built handler: a handler from
`createTappifyHandler` verifies against Tappify's live key set, so every call
would come back 401. The client rebuilds it around a test key set and signs
with `signTestToken()`, so the real token path runs. It has one method per
route — `health`, `metrics`, `tool`, `mention`, `action`, `procedure`,
`context`, `event`, `work` — and `raw(method, path, body)` for status codes.
`validateMetricsResponse(response, metrics)` and
`validateToolResponse(value, returns)` return the list of what is wrong, the
same way `doctor` reads it, so assert the list is empty.

## What to test

| Contribution | The test worth writing |
| --- | --- |
| Widget, tab, page | It renders with the fixtures, and it renders the empty state |
| Any UI reading data | It renders the missing-scope path when the scope is withheld |
| Settings panel | `onChange` carries the shape the schema declares |
| Storage | A write then a read, through the mock |
| Procedure | The handler, through `createTestClient` |
| Tool | The response passes its `returns` validator |

## Common mistakes

| Mistake | Fix |
| --- | --- |
| `render()` from Testing Library directly | `renderWithTap` — a bare render has no bridge and no host variables |
| Mocking `useTap` | Use `createTapMock`; a hand-mocked bridge drifts from the real one |
| Asserting on colour or font | The host owns both. Assert on text and roles |
| Calling the vendor server over the network in a test | `createTestClient` invokes the handler in process |
| Leaving `doctor`'s test check failing | `doctor` runs your `test` script and counts a failing suite as a failed check. `publish` skips the tooling checks, so only your own `doctor` run catches it |
