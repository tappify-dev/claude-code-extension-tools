# Tappify for Claude Code

Skills and tools for building an extension that runs inside Tappify.

## Install

```
/plugin marketplace add tappify-dev/claude-plugin
/plugin install tappify@tappify
```

Then restart Claude Code, or run `/reload-plugins`.

`tappify-dev/claude-plugin` is not published yet. Until it is, add this
checkout by path: `/plugin marketplace add /path/to/claude-plugin`.

## What you get

### Skills

Claude loads these on its own when the work matches.

| Skill | Loads when you are |
| --- | --- |
| `building-tappify-extensions` | Writing the manifest, a component, or anything against the bridge |
| `adding-a-contribution` | Adding a widget, page, storage collection, procedure, tool or any other contribution |
| `testing-an-extension` | Writing or fixing tests for a component, a procedure or a server handler |
| `publishing-an-extension` | Publishing a release, writing notes, changing visibility, or reading a review outcome |
| `debugging-extension-load-failures` | Looking at an extension that does not render in the host |

### Command

`/tappify:new-extension` walks from an empty directory to a published first
release on your sandbox project.

### MCP server

The plugin declares `tappify mcp`, the server the CLI already ships, so Claude
runs these without a shell:

| Tool | Does |
| --- | --- |
| `extension_validate` | Checks the manifest against the schema and the registry |
| `extension_doctor` | Runs every check, including your build, typecheck, lint, tests and the axe pass |
| `extension_types` | Regenerates the generated types |
| `extension_registry` | Lists pages, slots, charts, tables, scopes, categories and events |
| `extension_status` | Reports the live release, the pending release, the review timeline and the install count |
| `extension_add` | Adds one contribution |
| `extension_publish` | Builds the project, runs the local checks and describes the release, registering nothing; the id is claimed, the store checks run and the release uploads once you confirm |
| `docs_search` | Searches the Tappify extension documentation |

Every tool that reads an extension takes `cwd`, and defaults to the directory
the server was started in.

## Requirements

- The Tappify CLI on your `PATH`: `curl -fsSL https://get.tappify.ai | sh`, or
  `npm i -g @tappify/cli` on Node 20 or newer, then `tappify login`
- A vendor account: `tappify vendor create`

## Documentation

<https://docs.tappify.ai/extensions>
