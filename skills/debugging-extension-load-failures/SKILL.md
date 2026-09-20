---
name: debugging-extension-load-failures
description: Use when a Tappify extension does not render in the host — a card says it didn't load, timed out, has no published bundle or no default export, a card asks for a scope, or an extension shows as paused, temporarily unavailable or retired.
---

# Debugging extension load failures

## Overview

The host never lets a broken extension take a page down. Every failure is a
card drawn in place of the contribution, and its wording says what happened, so
match the wording before anything else. A load failure reads `<name> didn't
load — <reason>. The rest of Tappify is unaffected.` over a **Retry** and a
**Report to vendor** button. The reason is the part to match.

| Reason on the card | Cause, and what to check |
| --- | --- |
| `Refused to load <url>: its origin is not on the extension allowlist.` | A published install must serve from the Tappify CDN. `tappify extension dev --live` allowlists this install's dev URL — `http://localhost:5273/remoteEntry.js` by default — and no other install's |
| `remoteEntry.js timed out after 8s` | The entry did not load inside 8 seconds. Open the URL: a cold host, a redirect chain, a very large entry |
| `This install has no published bundle.` | The install points at no release — never published, or withdrawn. `tappify extension status` |
| `The bundle has no default export at "./widgets/<id>".` | The expose loaded and has no **default** export. `doctor` catches this as `entry.default_export` |
| `The bundle at <url> does not match the SHA-384 hash recorded for this release.` | The bytes there are not the bytes published. Publish a release; never edit files on the CDN |
| `Refused to load <url>: no verified SHA-384 hash for this extension resource.` | The same code with no hash recorded for that URL at all — a script the bundle pulls in beyond its verified entry |
| `<url> answered 404.`, `Could not fetch <url> to check its integrity.` | Missing, or the cross-origin fetch the host hashes it with was blocked. Check the URL and its CORS headers |
| Anything else, your own message included | The remote failed to evaluate, or your component threw while rendering — the error boundary is inside the mount |

Retry is withheld on the refused origin and on either SHA-384 failure: the bytes
would be the same.

## The other four cards

| Card | Means |
| --- | --- |
| `<name> needs <scopes> on <project> — the current release asks for a scope you haven't granted on this project.` | The release declares a scope this install has not granted. The owner re-consents from Settings → Extensions; nothing on the vendor side fixes it |
| `<name> is paused. Resume it in Settings → Extensions to see it here.` | The owner paused this install |
| `<name> is temporarily unavailable. The rest of Tappify is unaffected.` | Tappify suspended it: loading stops for every owner at once, within 60 seconds |
| `<name> was retired by its vendor. Your saved documents stay exportable for 30 days.` | The vendor retired it |

A suspension is not in `tappify extension status`; what shows it is
`tappify extension publish` failing with `is suspended`.

## The six error codes

`ExtensionLoadError` carries one of `ORIGIN_NOT_ALLOWED`, `INTEGRITY_MISMATCH`,
`REMOTE_MISSING`, `REMOTE_TIMEOUT`, `REMOTE_FAILED` or `MODULE_MISSING`. The
code stays on the error object. **Report to vendor** sends the reason string,
the page and the release checksum, and the developer portal's Runtime page
lists what was reported — failures nobody reports never reach it.

## Where to look, in order

The card, which names the reason. Then `tappify extension doctor`, where
`entry.missing`, `entry.default_export`, `exposes`, `bundle.remote_entry` and
`bundle.size` catch most of these before a publish. Then `tappify extension
status`: live, still in review, or installed by nobody. Then the Runtime page.
The browser console last, for the network error behind a `REMOTE_FAILED`.

## Things that are not load failures

| Symptom | Cause |
| --- | --- |
| It renders and is empty | Your own empty state, or a query with no rows for the filters |
| It renders on one page and not another | The `page` and `slot` in the manifest. A slot belongs to one page |
| A page or tab is missing on a phone | `mobile: false` hides it there. Widgets have no `mobile` field |
| A tab label appears, its content does not | The label comes from the manifest, the content from the bundle |
| Only three widgets load at first | Three remote loads run at once, and a widget loads within one viewport of view |
| A published change takes a minute | Installs are polled every 60 seconds |

## Rationalizations

| Excuse | Reality |
| --- | --- |
| "It works locally, so the bundle is fine" | A dev install has its origin allowlisted and no hash to check. Neither is true of a published one |
| "The timeout is the host being slow" | The 8 seconds runs from when the load starts, not from page load |
| "The owner should just grant the scope" | They will be asked to. Until then the card is correct and the component must not render |
| "I'll catch the error in my component" | The host draws the card anyway, and a swallowed error is one nobody can report |
