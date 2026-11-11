# Tappify Extension Tools for Claude Code

Build, test, debug and publish Tappify extensions with Claude Code.

> This Claude Code plugin is for extension developers. It does not let
> workspace members access or operate Tappify through Claude, and it does not
> provide Tappify's in-product AI features.

## Who this is for

Install this plugin when you are developing a Tappify extension. It gives
Claude Code the documentation, workflows and developer operations needed to
work with the Tappify extension platform.

## Install

```text
/plugin marketplace add tappify-dev/claude-code-extension-tools
/plugin install extension-tools@tappify
```

Then restart Claude Code, or run `/reload-plugins`.

To load a local checkout:

```text
/plugin marketplace add /path/to/claude-code-extension-tools
/plugin install extension-tools@tappify
```

## What you get

### Claude Code skills

Claude Code loads these when the work matches.

| Skill | Loads when you are |
| --- | --- |
| `building-tappify-extensions` | Writing the manifest, a component, or anything against the bridge |
| `adding-a-contribution` | Adding a widget, page, storage collection, procedure, tool or any other contribution |
| `testing-an-extension` | Writing or fixing tests for a component, a procedure or a server handler |
| `publishing-an-extension` | Publishing a release, writing notes, changing visibility, or reading a review outcome |
| `debugging-extension-load-failures` | Looking at a Tappify extension that does not render in the web app |

### New extension command

`/extension-tools:new-extension` walks from an empty directory to a published
first release on your Tappify sandbox project.

### Tappify CLI integration

The plugin connects Claude Code to the MCP server included with the Tappify
CLI, so Claude Code can run these developer operations without a shell:

| MCP operation | Does |
| --- | --- |
| `extension_validate` | Checks the manifest against the schema and the registry |
| `extension_doctor` | Runs every check, including your build, typecheck, lint, tests and the axe pass |
| `extension_types` | Regenerates the generated types |
| `extension_registry` | Lists pages, slots, charts, tables, scopes, categories and events |
| `extension_status` | Reports the live release, the pending release, the review timeline and the install count |
| `extension_add` | Adds one contribution |
| `extension_publish` | Previews a release without changing server state, then publishes it after you confirm |
| `docs_search` | Searches the Tappify extension documentation |

Every operation that reads a Tappify extension takes `cwd`, defaulting to the
directory where the server started.

## Requirements

- Claude Code
- The Tappify CLI on your `PATH`: `curl -fsSL https://get.tappify.ai | sh`, or
  `npm install --global @tappify/cli` on Node 20 or newer, then `tappify login`
- An extension publisher account: `tappify vendor create`

## Documentation

<https://docs.tappify.ai/extensions>
