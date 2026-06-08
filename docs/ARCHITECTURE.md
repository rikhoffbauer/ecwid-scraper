# Architecture

The repository has three layers:

1. `main` contains application code, GitHub Actions workflows, config schema, web UI, and persisted cross-store analysis snapshots.
2. Every configured Ecwid store is mirrored to its own orphan branch at `stores/ecwid/<storeId>`.
3. Each store branch has both human-friendly product JSON files and machine-friendly resolved state indexes.

External stores are strictly read-only. The application may write tracking snapshots,
events, indexes, and internal analysis to Git, but it never modifies products or
other data in a source store.

## Store branch contract

```txt
README.md
config.json                 # redacted per-store config
store.json                  # sync metadata and product hash
products/<id>.json          # current product snapshot, one file per product
events/YYYY/MM/DD/*.jsonl   # append-only atomic product events, sharded for large runs
state/products.index.json   # fast product listing/search metadata
state/products/*.jsonl      # sharded resolved full product state
state/events.index.json     # fast event listing/counts
state/latest-events.jsonl   # current run's latest events
state/run-summary.json      # latest sync summary
```

The `state/` layer exists because GitHub's Contents API has directory-size and file-size behavior that makes direct browsing of tens of thousands of product files awkward. The sync process resolves the current product state after every run and persists index/shard files so consumers can load state without recursive tree walking.

## Scheduling

GitHub Actions runs `.github/workflows/sync-ecwid.yml` every five minutes. The sync script reads each store's `syncIntervalMinutes` and the previous `store.json` on that store's orphan branch. It skips stores whose next due time has not been reached.

Manual dispatch supports:

- all due stores
- one store by `store_id`
- `force=true` to ignore intervals

The web UI also has a browser-side sync path that does not dispatch Actions. It fetches Ecwid products with a user-provided token and writes directly to `stores/ecwid/<storeId>` through GitHub's Git database API.

Watched searches use the operational SQLite database and the running Bun server. The server checks due saved searches once per minute and prevents overlapping scheduler passes. Each successful source is reconciled independently, so a failed source retains its previous current membership. Watched results enter the shared catalogue, but leaving a search never deletes a catalogue product.

## Assistant conversations

Assistant conversations, messages, runs, partial responses, and ordered stream events
are persisted in the operational SQLite database. Submitting a message creates a
server-owned run and immediately returns its ID. The run continues independently of
the browser connection and writes streamed text plus full tool activity to ordered
events. Clients reconnect through per-conversation SSE using event IDs and reload
persisted messages as a recovery fallback.

One response may run per conversation, while separate conversations can run
concurrently. Deleting a conversation cancels its active run before cascading stored
records and uploaded files. Bun server restarts mark unfinished runs as failed rather
than retrying potentially destructive tool calls.

Configured LLM providers expose best-effort model catalogs. Providers that cannot list
models fall back to their configured model. Each message stores its selected provider
and model. Initial titles are generated asynchronously using the configured title
model, or the default provider when no title model is configured; manual renames are
never overwritten.

Provider records keep a derived display label, provider kind, model, default state, and
serialized provider-specific options. The web UI owns conversion from typed settings
fields to this JSON representation; users do not edit configuration JSON directly.

Uploads are stored under `.ecwid-sync/attachments/` without an application-level size
limit. The assistant has unrestricted host shell and filesystem tools and persists full
tool inputs and outputs. This is an accepted high-risk local-only capability and must
not be exposed to untrusted users or public traffic.

## Search modes

- Catalogue search filters already-ingested product summaries locally.
- Direct source search calls optional adapter-level `searchProducts` capabilities and does not persist results.
- Watched search runs the same multi-source search runner, persists run and membership history, and upserts found products.

Ecwid uses its native product keyword search and Shopify uses Storefront product search. HTML/JSON-LD sources only support direct search when `settings.searchUrlTemplate` is configured with a `{query}` placeholder. The application never simulates direct search by downloading an entire source catalogue.

## Events

Events are written in JSONL files on the same store branch as the product snapshots. Product changes are atomic:

- `product.created`
- `product.deleted`
- `product.field_changed`

Webhook payloads include the store summary and selected events. If `secretEnv` is configured and present in the sync environment, the webhook payload is signed with HMAC-SHA256 in `x-ecwid-watch-signature-256`.

## Store onboarding

The web UI supports adding a new store by committing a new entry to `config/ecwid-stores.json`. Token handling has two modes:

- Browser on-demand sync: paste an Ecwid token for the store; it is used immediately and is not stored by default.
- Scheduled sync: save either a store-specific secret matching `tokenEnv`, or save/update the aggregate `ECWID_STORE_TOKENS_JSON` repository secret.

Because GitHub secrets cannot be read back through the API, the UI can write secrets but cannot display or merge with their existing plaintext values.

Unsupported public websites can be onboarded through an explicitly enabled local
AI workflow. The API server stages anonymous HTML evidence, runs Gemini CLI in a
sandboxed staging directory, and executes generated adapters only in a scrubbed Bun
child process. Generated adapters use a JSON request/response boundary and receive
only a read-only HTTP client. Activated code, its manifest, and verification report
live under `.ecwid-sync/adapters/<adapterId>/`; generated code is never imported into
the API server process. This reduces risk but does not make executable AI-generated
plugins safe against every prompt-injection or code-generation attack.

## Analysis

Cross-store analysis is deliberately client-side and reproducible from operational
offering data:

1. Load product offerings through `/api/product-offerings`.
2. Group offerings with accepted canonical-product links.
3. Cluster only unlinked offerings by SKU exact match plus lexical/category similarity,
   and label those groups as heuristic fallbacks.
4. Calculate cluster median prices.
5. Derive per-store relative price indexes and favorable-offer candidates.

## Canonical products and enrichment

Source adapters and synchronization produce `ProductOffering` records: store-specific
listings with source identity, price, availability, and source payload. The operational
database retains `/api/products` as a compatibility alias and exposes the explicit
`/api/product-offerings` endpoint. Canonical `Product` records are independent sellable
variants and are exposed through `/api/canonical-products`.

Added and changed offerings are queued for enrichment. An enrichment run exports only
the required source records, taxonomy, identifiers, specifications, and candidate data
to `.ecwid-sync/enrichment-runs/<run-id>/enrichment.sqlite`. Agent harnesses receive the
database path and contract rather than inline offering data. Source-table write
triggers and before/after digests enforce read-only access, while
`enrichment_contract` explicitly lists writable proposal, review, note, and validation
tables.

Agents never receive the production database and cannot apply production changes.
Application code validates structured proposals and is responsible for deduplication,
review policy, idempotency, canonical links, and provenance.
