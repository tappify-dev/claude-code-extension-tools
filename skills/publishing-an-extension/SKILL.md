---
name: publishing-an-extension
description: Use when publishing a Tappify extension release, writing release notes, changing visibility, retiring an extension, or when a publish was rejected, a release is sitting in review, or a doctor check is blocking one.
---

# Publishing an extension

## Overview

A publish runs the project's `build` script, runs `doctor`, zips the release and
uploads it — both `tappify extension publish` and the `extension_publish` tool.
The outcome is `live` or `in_review`, decided by what changed against the live
release, not by what you ask.

```bash
tappify extension doctor
tappify extension publish --notes "What changed, in a sentence or two."
```

Run `doctor` yourself first: `tappify extension doctor` and the
`extension_doctor` tool run the project's build, typecheck, lint, tests and axe
pass, so the call takes as long as your test suite. The run inside `publish`
leaves those out, so none gate an upload. `--skip-doctor` drops that second run;
`--yes` answers the confirmation.

## What goes in the zip

`dist/`, `tappify.extension.json`, `package.json`, the icon, every schema file
a `$ref` reaches, every knowledge and skill markdown file, and every screenshot
the listing names. The release version comes from `package.json`. 5 MB zipped at
most, 25 MB unpacked.

## Release notes

`--notes`, 1,000 characters at most, read by the owner on the install page and
by the reviewer. Leave it off in a terminal and the command asks; in a script
the release ships with none. `extension_publish` is stricter: `notes` is
required, and a call without it is a schema error. On that tool,
`confirm: false` describes the release and touches nothing on the server;
`confirm: true` claims the id, runs the store's checks and publishes.

## Visibility

| Value | Who can install | Listing required |
| --- | --- | --- |
| `private` | Your own workspace | no |
| `unlisted` | Anyone with the link | no |
| `public` | Anyone, from the Tap Store | yes — `longDescription`, 1–6 screenshots as 1600×1000 png, `website`, `supportUrl`, `privacyUrl` |

`tappify extension set visibility <value>` edits the manifest; the store hears
at the next publish. Setting `public` with an unfinished listing is refused
before `doctor` ever runs.

## What sends a release to review

- The first release of an `unlisted` or `public` extension
- A scope the live release does not have
- A contribution kind the live release does not have
- Wider visibility than the live release: `private` to `unlisted` or `public`, `unlisted` to `public`

Everything else rolls: the new release overwrites the live one and installs pick
it up. A `private` extension never goes to review. An `unlisted` one is approved
by the automated checks in the same request, so `publish` still reports `live`
and the timeline reads `published`, `submitted`, `auto_approved`; only a
`public` release comes back `in_review` and waits for a person. Two apparent
review triggers are `doctor` checks instead: a scope gated on a
security review fails `scopes.security_review` until Tappify has run one for
your vendor, and a storage schema with a personal-data field name warns
`storage.pii`.

## What happens next

`tappify extension status` shows the live release, the release in review, the
install count and the last ten review events. A pending release is withdrawn
from the portal's Releases page. An approval makes it live; a rejection puts a
reason on the timeline.

## Retiring

`tappify extension retire` asks you to type the extension id, then takes it off
the store, revokes every install and tells the owners. Their documents stay
exportable for 30 days; `--yes` skips the typed confirmation.

A suspended extension can neither publish nor retire: both commands fail with
`is suspended`, and the same door blocks a listing change and a signing-secret
rotation. The way back is the review thread.

## Rationalizations

| Excuse | Reality |
| --- | --- |
| "`--skip-doctor`, the checks passed an hour ago" | They passed on the code you had an hour ago. The flag is for the minute after a `doctor` run |
| "Tests pass in CI, so `doctor` is redundant" | The `doctor` inside `publish` skips the tooling checks. Only your own run catches a failing test |
| "The warning is only a warning" | A procedure named `sendDigest` without `kind: "write"` gets retried on a flaky network |
| "I'll write the notes after it publishes" | Notes belong to the release, not the extension, and the reviewer reads them first |
| "It is only unlisted, the rules are looser" | The same checks and triggers apply, and an unlisted release is approved by the checks alone — a warning nobody reads is still your warning |
| "Bumping the version in package.json republishes it" | The upload is the publish. Nothing reaches an owner until `publish` runs |
