# Product Intelligence Workspace Implementation Plan

## Goal

Replace the current Ecwid-specific administration UI with a polished, single-user
product intelligence workspace. The system tracks products from multiple sources,
lets an unrestricted AI assistant operate every internal feature, and automatically
analyzes new or changed products.

The non-negotiable invariant is:

> External product sources are read-only. No application code may modify a store,
> listing, cart, bid, order, or other source-owned data.

## Assumptions

- This remains a hobby project operated by one trusted user.
- Deliver as one major release, but implement it in independently testable vertical
  slices.
- Use Bun and TypeScript throughout.
- Use the OpenAI Responses API for streamed chat, web search, code interpreter, and
  structured tool calls.
- The assistant and enabled automations execute internal actions without confirmation.
- Git remains the durable product snapshot and event history.
- SQLite is the operational store for conversations, flags, lists, rules, runs,
  generated artifacts, and audit records.
- Ecwid, Shopify, Marktplaats, iBOOD, 2dekansje, and Retoertje are all read-only.
- Prefer official read APIs or feeds. When none exists, use isolated HTTP/HTML
  adapters with fixture-based parser tests and graceful failure when pages change.

## Architecture

Build a modular monolith with three processes exposed through package scripts:

1. `server`: authenticated HTTP/SSE API, assistant orchestration, internal actions,
   SQLite, artifact serving, and automation worker.
2. `sync`: source-neutral ingestion runner that normalizes source products and writes
   source branches/events to Git.
3. `web`: React intelligence workspace consuming the server API.

The server and sync runner share source adapters, canonical product/event types,
analysis services, and an internal action registry. The assistant and automation
engine may only call actions from that registry. Source adapters expose fetch-only
interfaces and receive an HTTP client that rejects non-GET/HEAD requests.

## Canonical Interfaces

```ts
export type SourceKind =
  | "ecwid"
  | "shopify"
  | "marktplaats"
  | "ibood"
  | "2dekansje"
  | "retoertje";

export interface SourceConfig {
  id: string;
  kind: SourceKind;
  name: string;
  url: string;
  enabled: boolean;
  syncIntervalMinutes: number;
  credentialsEnv?: Record<string, string>;
  settings?: Record<string, JsonValue>;
}

export interface CanonicalProduct {
  sourceId: string;
  sourceKind: SourceKind;
  externalId: string;
  title: string;
  description?: string;
  url: string;
  imageUrls: string[];
  currency?: string;
  price?: number;
  compareAtPrice?: number;
  availability?: "available" | "unavailable" | "unknown";
  condition?: string;
  seller?: string;
  categories: string[];
  attributes: Record<string, JsonValue>;
  raw: JsonObject;
}

export interface ReadOnlySourceAdapter {
  readonly kind: SourceKind;
  discover(config: SourceConfig, ctx: SourceContext): Promise<SourceMetadata>;
  fetchProducts(config: SourceConfig, ctx: SourceContext): AsyncIterable<CanonicalProduct>;
}
```

Branch names become `sources/<kind>/<sourceId>`. Events retain created, deleted, and
field-changed semantics but use `sourceId` and `sourceKind` instead of Ecwid-only
fields. Existing `stores/ecwid/<id>` branches remain readable during migration.

Internal actions use JSON-schema inputs and return structured results:

```ts
export interface InternalAction<I, O> {
  name: string;
  description: string;
  inputSchema: JsonObject;
  execute(input: I, context: ActionContext): Promise<O>;
}
```

Initial actions cover product search/read/history, source CRUD/sync, flags, lists,
saved searches, automation rules, analysis, reports, charts, diagrams, web search,
and sandboxed code execution. There are deliberately no source mutation actions.

## Implementation Sequence

### 1. Enforce Source Read-Only Behavior

- Delete the product mutation processor, CLI scripts, schema, GitHub workflow, tests,
  documentation, and all mutation UI/actions.
- Add a repository test that fails when source-adapter modules contain `POST`,
  `PUT`, `PATCH`, or `DELETE`, and a runtime `ReadOnlyHttpClient` that rejects them.
- Update README and architecture docs to explicitly state that source systems are
  never modified.
- Keep outbound POST requests allowed only in clearly separate infrastructure
  modules such as OpenAI calls and optional notification webhooks.

Acceptance:

- Searching for product mutation functionality yields no active implementation.
- Adapter contract tests prove every source request is GET/HEAD-only.
- Existing Ecwid sync and event tests still pass.

### 2. Introduce Source-Neutral Ingestion

- Replace Ecwid-specific config and core types with `SourceConfig`,
  `CanonicalProduct`, and source-neutral events/manifests.
- Extract the current Ecwid fetch logic into the first `ReadOnlySourceAdapter`.
- Generalize branch syncing, state indexes, summaries, webhook payloads, and CLI
  flags around `sourceId`/`sourceKind`.
- Add a one-time compatibility loader for existing Ecwid config and branches.
- Rename workflows and scripts from Ecwid sync to source sync.

Acceptance:

- Existing Ecwid catalogs produce equivalent snapshots/events through the adapter.
- A fixture adapter demonstrates that the core sync runner is source-independent.
- Existing Ecwid branch history remains browseable.

### 3. Add Additional Read-Only Connectors

- Implement Shopify using Storefront GraphQL product queries and cursor pagination.
- Implement Marktplaats using authenticated official GET endpoints when credentials
  are supplied; otherwise support configured public search URLs through its isolated
  parser.
- Implement iBOOD, 2dekansje, and Retoertje as isolated fetch/parser adapters for
  configured category/search URLs.
- Store parser fixtures and expected canonical products for every adapter.
- Surface adapter health, last successful sync, item count, and actionable errors.

Acceptance:

- Each adapter normalizes fixture data into the same canonical product shape.
- Pagination, duplicate IDs, missing prices/images, malformed responses, and source
  layout changes have explicit tests.
- No adapter can issue a source write request.

### 4. Add the Hosted Backend and Operational Store

- Add a Bun HTTP server with a single-user bearer/session secret, JSON APIs, and SSE.
- Add SQLite migrations and repositories for sources, flags, lists, saved searches,
  conversations/messages, automation rules/runs, action audit records, and generated
  artifacts.
- Import current local favorites/lists into SQLite on first connection.
- Expose query APIs for dashboard metrics, products, history, source health, analysis,
  activity, and settings.
- Keep product snapshots in Git; index their current summaries into SQLite after sync
  for fast cross-source queries.

Acceptance:

- Unauthorized requests fail.
- Database migrations are repeatable and backed up before destructive changes.
- Server APIs can reconstruct every screen without direct GitHub access in the
  browser.

### 5. Build the Assistant, Tools, and Automations

- Integrate streamed OpenAI Responses API conversations.
- Register internal actions once and expose the same registry to interactive chat and
  automation execution.
- Give the assistant product/source/history/analysis context through actions instead
  of placing entire catalogs in prompts.
- Enable OpenAI web search and code interpreter; persist generated charts, plots, and
  files as artifacts linked in messages.
- Render Mermaid diagrams from assistant-produced Mermaid source.
- Add event-triggered automation rules with natural-language instructions, optional
  source/query filters, enabled state, retry status, and full action audit history.
- After every sync, enqueue created/changed products for matching rules. A rule such
  as “flag exceptional value for money, very rare” may research, compare, calculate,
  and add an internal flag with rationale and confidence.
- Apply time, token, output-size, and concurrency limits to prevent runaway execution;
  these are containment limits, not action approval gates.

Acceptance:

- Assistant can perform every internal UI action through the shared registry.
- Assistant can search the web, execute code, and return a rendered chart and Mermaid
  diagram.
- A sync event triggers a rule, records its run/tool calls, and adds the expected flag.
- Failures and retries are visible without losing audit history.

### 6. Replace the Web UI

- Split the monolithic `App.tsx` into routed feature modules and shared components.
- Build a dense intelligence-workspace shell:
  - left navigation for Dashboard, Products, Sources, Automations, Analysis, Activity,
    and Settings;
  - global command/search palette;
  - persistent, resizable assistant drawer;
  - responsive mobile navigation.
- Build an image-aware product explorer with compact grid/table modes, faceted
  filters, saved searches, flags, lists, comparison tray, and source-neutral details.
- Build a dashboard focused on new/changed products, exceptional offers, source
  health, automation activity, and recent assistant findings.
- Build source onboarding/health, automation rule editor/history, analysis reports,
  audit activity, and secure settings screens.
- Use a coherent visual system with accessible contrast, typography, spacing, focus
  states, empty/loading/error states, and dark/light themes.

Acceptance:

- No Ecwid-specific or mutation UI remains.
- All major workflows work at desktop and narrow mobile widths.
- Keyboard navigation, command palette, loading/error states, and assistant artifacts
  are manually verified in the in-app browser.

### 7. Deployment, Migration, and Documentation

- Replace GitHub Pages deployment with a hosted Bun application deployment while
  retaining GitHub Actions source sync as an optional fallback.
- Document required environment variables, source credentials, OpenAI key, session
  secret, SQLite path, artifact directory, and backup/restore steps.
- Provide a migration command that reads existing config, imports current Ecwid
  branches, and preserves event history without touching source stores.
- Update all README, architecture, source connector, assistant, automation, and web UI
  documentation.

Acceptance:

- Fresh setup and migration setup both pass documented smoke tests.
- Deployment serves the web UI and authenticated API, runs a source sync, executes an
  automation, and streams an assistant response.

## Test Plan

- Unit: canonical normalization, diffs, query language, action schemas, automation
  matching, analysis logic, parser fixtures, SQLite repositories, and read-only HTTP.
- Contract: each adapter against fixtures and mocked pagination/errors; assert request
  methods are only GET/HEAD.
- Integration: source sync to Git and SQLite, sync-to-automation flow, assistant tool
  execution, artifact persistence, and migration from current Ecwid branches.
- End-to-end: sign in, onboard each source type, sync, browse/filter/compare, create
  rule, observe automatic flag, chat with assistant, generate chart/diagram, inspect
  audit history.
- Manual: use the in-app browser at desktop and mobile widths; inspect visual quality,
  keyboard usage, assistant streaming, generated visuals, and failure recovery.
- Required commands: `bun test`, `bun run check`, `bun run web:check`,
  `bun run web:build`, plus the new server/integration/e2e scripts.

## Completion Rubric

1. Source stores are provably read-only and mutation functionality is gone.
2. All six named source kinds ingest into one canonical model and track changes.
3. The redesigned UI is cohesive, responsive, and manually verified.
4. The assistant accesses all application information and executes every internal UI
   action without confirmation.
5. Web search, sandboxed code, charts/plots, and diagrams work end to end.
6. New/changed products trigger user-defined AI analysis and internal handling.
7. Tests, deployment, migration, auditability, and documentation prove the complete
   workflow.
