---
description: Scaffold a Tappify extension, run it on the sandbox project, and publish the first release
argument-hint: [extension name]
---

# New Tappify extension

Take the user from an empty directory to a published first release. The name
they want is "$ARGUMENTS"; ask for one if that is empty.

Run every step with the `tappify` MCP server where a tool exists, and in the
terminal where one does not. Stop and report at the first failure — do not work
around a failing check.

## 1. Confirm the account

Run `tappify extension whoami --json` in the terminal. If it answers
`ok: false`, read `error.fix` and follow it: a missing session is
`tappify login`, a missing vendor is `tappify vendor create`. Both are the
user's to run — `vendor create` asks for a company name, a domain and a
support email.

Report the vendor name and the sandbox project.

## 2. Scaffold

Ask for four things before running anything, in this order, and offer the
answers you can:

1. The directory, defaulting to a kebab-case form of the name
2. The id — lowercase letters, digits and dashes, 3 to 40 characters,
   starting with a letter, and permanent once the extension is published
3. One sentence of description, 10 to 200 characters, that an owner reads in
   the Tap Store
4. The Tap Store category — read the list from the `extension_registry` tool
   rather than guessing

Then run:

```bash
tappify extension init <dir> --id <id> --name "<name>" --description "<text>" --category <category> --json
```

The answer carries `id`, `name`, `directory` and `files`. Every tool call and
every command after this one runs from that directory: pass it as `cwd` to a
tool, and have the user `cd` into it before any command they run themselves.

## 3. Make the starter's widget yours

The starter already declares one widget in the `kpi-row` slot on Analytics, a
settings panel, a hosted-storage collection and one server procedure. Read
`src/widgets/summary.tsx` and `server/handler.ts` with the user and change them
to do what they actually want.

`src/tappify.d.ts` is generated and is rewritten by every `add`, so never
hand-edit it.

When the user wants a second contribution, call `extension_add` with the kind,
the name, and the options that kind takes — for a widget, the page, slot and
size the user picks from `extension_registry`. Never invent a slot: a slot
belongs to exactly one page, and the registry says which.

## 4. Run the server, then the extension

A procedure runs on the vendor's own server, and Tappify relays procedure
calls from its servers, so the dev session needs an address Tappify can reach.
Localhost is not one. Three terminals, all the user's, because each keeps
running:

```bash
pnpm run dev:worker
cloudflared tunnel --url http://localhost:8787
tappify extension dev --live --server https://<tunnel>.trycloudflare.com
```

Any tunnel works, and so does a server the user has already deployed.

Two lines come back: the local remote entry being served, and the sandbox
project's Analytics page to open. The widget renders in the KPI row, answered
by the worker on the user's machine. Editing the component reloads it. Have
the user change the page's date range: the number changes with it, because
the widget reads the page filters through `useTapFilters`.

Without `--live` the session prints a portal preview URL instead, which needs
no install.

## 5. Run the checks

Call `extension_doctor`. Read `errors` — fix every one before going further.
Report `warnings` without acting on them unless the user asks. `fixed` lists
what the tool rewrote, and is empty unless it was called with `fix: true`.

## 6. Deploy the server and point the manifest at it

The tunnel ends with the session, so the manifest needs an address that
outlives it. Publish probes `<server.baseUrl>/tappify/health` for a 200, and
the starter ships a placeholder, so a publish stops there until this is done.

```bash
pnpm run deploy:worker
tappify extension set server.baseUrl https://<deployed-server> --json
```

## 7. Publish

Call `extension_publish` with `confirm: false` and one line of notes. It builds
the project, runs the local checks and answers with the release summary: the id,
the bytes, the entries and the scopes an owner will be asked to grant. Nothing
reaches Tappify on that call — the id is claimed and the store's own checks run
only when you confirm. Show the summary to the user, and only after they agree
call it again with `confirm: true`.

The starter is private, so the release is live the moment it uploads,
installable inside the user's own workspace and nowhere else. Nobody reviews a
private release. Report `status`, `releaseId` and `bytes`.

Then call `extension_status` and report the live release and the install count.

## 8. Say what is next

Name three things, with no more detail than a sentence each: adding another
contribution, writing a test with `renderWithTap`, and completing the listing
and setting visibility to public when it is ready for the Tap Store.
