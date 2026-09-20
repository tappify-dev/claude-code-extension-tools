# Registry and limits reference

Read the live copy with the `extension_registry` MCP tool. This file is what
to expect.

## Scopes

| Key | Grants | Security review | Justification |
| --- | --- | --- | --- |
| `ui:render` | Render declared UI, open chat with a visible prompt, settings panel | no | no |
| `projects:read` | `tap.project`, project queries | no | no |
| `analytics:read` | Downloads, impressions, page views, conversion series | no | no |
| `store.metadata:read` | Listing metadata, keyword set and positions | no | no |
| `reviews:read` | Review text, ratings, replies | no | no |
| `crashes:read` | Crash-free rate, issue counts | no | no |
| `revenue:read` | MRR, revenue series, refund counts | no | yes |
| `metrics:write` | Connector metrics into the metrics store | no | no |
| `alerts:write` | Webhooks become alerts and banners | no | yes |
| `insights:write` | Post insights to Home and chat | no | yes |
| `ai:tools` | Tools and mentions in the assistant | no | no |
| `ai:actions` | Declared actions, each behind the approval card | yes | yes |
| `store.metadata:write` | Propose store metadata changes through an approval | yes | yes |
| `autopilot:trigger` | Start automated store actions for the owner | yes | yes |
| `work:create` | Create issues, pages or messages in the vendor's system | no | yes |
| `work:sync` | Two-way comments and status | no | yes |
| `storage:write` | Read and write the extension's own storage collections | no | no |
| `messaging:send` | Send messages or push to the owner's end users | yes | yes |
| `ai:skills` | Skills, prompt templates and context providers | no | yes |

A scope marked "justification" carries 20 to 500 characters saying why.
A scope marked "security review" cannot go live until the vendor passes
security review.

Scopes the validator requires: `ui:render` for a page, tab, widget, row
action, marker or settings panel;
`metrics:write` for connector metrics; `alerts:write` for any webhook with
`as: "alert"` or `"banner"`, and for markers; `ai:tools` for tools or
mentions; `ai:actions` plus the action's own scope for actions;
`ai:skills` for skills, prompts or context providers; `storage:write` for
storage; `work:create` and `work:sync` for a work destination.

## Pages, slots and charts

| Page | Host route | Slots | Charts | Tabs |
| --- | --- | --- | --- | --- |
| `overview` ("Home") | `/projects/:id/overview` | `kpi-row`, `insights`, `sidebar` | `installs-activity` | yes |
| `analytics` | `/projects/:id/analytics` | `kpi-row`, `below-chart`, `sidebar` | `installs-activity`, `conversion` | yes |
| `deployments` | `/projects/:id/deployments` | `sidebar`, `below-list` | `release-cadence` | yes |
| `ai_chat` ("Assistant") | the chat drawer | none | none | none |

Banners render at the top of `overview` and `analytics`. A page contribution
gets its own route `/projects/:id/ext/:extensionId/:pageId`, and with
`nav: true` an entry in the project navigation.

## Host tables

Row actions attach to `analytics.keywords`, `analytics.reviews`,
`deployments.releases` and `deployments.builds`. The component mounts in the
expand panel with the row as `tap.context`.

## Contribution kinds

`page`, `tab`, `widget`, `series`, `banner`, `rowAction`, `marker`,
`settings`, `storage`, `connector`, `webhook`, `tool`, `mention`, `action`,
`knowledge`, `skill`, `prompt`, `context`, `work`. Procedures are declared
under `server.procedures`.

Adding a kind, or a scope, the reviewed release does not have sends the next
publish to review.

## Categories

`market_data`, `subscriptions`, `product_analytics`, `crashes`,
`attribution`, `experiments`, `messaging`, `session_replay`, `localization`,
`design`, `ci_cd`, `trackers`, `support`, `chat`, `ad_monetization`,
`warehouse`, `compliance`, `additional_stores`.

## Limits

| Thing | Limit |
| --- | --- |
| `id` | `^[a-z][a-z0-9-]{2,39}$`, permanent after the first publish |
| `name` | 2–40 characters |
| `description` | 10–200 characters |
| Icon | png or svg, square, ≤ 512 KB |
| Long description | ≤ 5,000 characters |
| Screenshots | 1–6, png, 1600×1000 |
| UI contributions | ≤ 20 in total, and ≤ 20 per kind |
| Tools | ≤ 15 |
| Mentions | ≤ 10 |
| Actions | ≤ 10 |
| Storage collections | ≤ 10, names lower snake_case |
| Knowledge files | ≤ 20 |
| Skills | ≤ 5, each naming ≤ 15 tools, each ≤ 4,000 words |
| Prompts | ≤ 20, each template ≤ 2,000 characters |
| Context providers | ≤ 3, each block ≤ 2 KB |
| Procedures | ≤ 30 |
| Connector metrics | ≤ 50, each with ≤ 10 dimensions |
| Telemetry event names | ≤ 20, snake_case |
| Bundle | ≤ 5 MB |
| Release notes | ≤ 1,000 characters |
| Storage document | 256 KB; 1,000 per collection per scope key; 50 MB per install |
| Procedure call | 30 s, 1 MB in, 1 MB out |

## Rate limits

| Surface | Limit | Counted per |
| --- | --- | --- |
| Data queries | 120 per minute | install |
| Storage reads and writes | 300 per minute | install |
| Procedure calls | 120 per minute | install |
| Telemetry events | 60 per minute | install |
| Token mints | 30 per minute | user |
| Tool calls | 600 per hour | project |
| Action runs | 200 per day | project |
| Inbound webhooks | 60 per minute | — |
| Alerts | 3 per day | project |
| Publishes | 30 per day | extension |

The rows for tool calls, action runs, inbound webhooks and alerts are the
budget to design against: those surfaces are declared and validated now, and
nothing enforces the rate yet. The same is true of the skill word count and
the context block size above.
