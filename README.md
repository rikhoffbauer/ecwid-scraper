# Ecwid Product Git Watch

Mirror one or more Ecwid stores into git and use the repository itself as a product-change event bus plus searchable state store.

- `main` stores config, code, workflows, analysis snapshots, and the GitHub Pages UI.
- Every Ecwid store gets its own orphan branch: `stores/ecwid/<storeId>`.
- Each store branch contains current per-product JSON files, append-only JSONL product events, and resolved state snapshots/indexes. Large event/state JSONL outputs are sharded below GitHub blob limits.
- Store sync intervals are configured per store.
- The web UI can add stores, manage secrets, configure webhooks, run browser-side on-demand syncs, browse products/events as a webshop-like catalogue, save local favorites/lists, run advanced product queries, and run cross-store analysis.
- The web UI can search configured sources directly, save multi-source searches, and periodically watch searches while retaining result membership history.
- Every external product source is strictly read-only. This project tracks and analyzes products but never modifies source stores or listings.

## Setup

```bash
bun install
bun test
bun run check
bun run web:check
bun run web:build
```

Create a store config in `config/ecwid-stores.json`:

```json
{
  "$schema": "../schemas/ecwid-stores.schema.json",
  "storeBranchPrefix": "stores/ecwid",
  "defaultSyncIntervalMinutes": 30,
  "stores": [
    {
      "id": "99490018",
      "name": "default-store",
      "tokenEnv": "ECWID_99490018_TOKEN",
      "enabled": true,
      "limit": 100,
      "requestDelayMs": 100,
      "syncIntervalMinutes": 30,
      "webhooks": []
    }
  ]
}
```

For static scheduled sync of known stores, add explicit secrets:

```bash
gh secret set ECWID_99490018_TOKEN --repo rikhoffbauer/ecwid-scraper --body '<token>'
```

For stores added dynamically from the web UI, use the arbitrary token map secret:

```bash
gh secret set ECWID_STORE_TOKENS_JSON --repo rikhoffbauer/ecwid-scraper --body '{"99490018":"public_...","other-store":"secret_..."}'
```

`resolveStoreToken()` checks, in order: inline `token`, `ECWID_STORE_TOKENS_JSON[store.id]`, `ECWID_STORE_TOKENS_JSON[tokenEnv]`, then the configured `tokenEnv` environment variable.

## Sync

Scheduled sync runs every five minutes, but each store is only fetched when its own `syncIntervalMinutes` says it is due.

```bash
bun run sync          # due stores only
bun run sync:force    # all enabled stores, interval ignored
bun run sync:dry      # due stores, no push
```

Manual Actions fallback:

```bash
gh workflow run "Sync Ecwid stores" \
  --repo rikhoffbauer/ecwid-scraper \
  -f store_id=99490018 \
  -f force=true
```

Browser-side sync remains available for on-demand catalog mirroring. It only reads
from Ecwid and writes the resulting tracking snapshots to Git.

## Store branch layout

```txt
stores/ecwid/<storeId>
├── README.md
├── config.json
├── store.json
├── products/
│   └── <productId>.json
├── events/
│   └── YYYY/MM/DD/<digest>.jsonl
└── state/
    ├── products.index.json
    ├── products/
    │   └── 00000.jsonl
    ├── events.index.json
    ├── latest-events.jsonl
    └── run-summary.json
```

The `state/` files are the scalable read path. Consumers should use the indexes and shards instead of listing tens of thousands of `products/*.json` files.

## Web UI

The UI is deployed by `.github/workflows/deploy-pages.yml`. It uses `@octokit/rest` in the browser and asks the user for a GitHub token before making changes. The token is stored in `localStorage` to survive page reloads and can be removed with **Clear token**.

The default **Browse** tab presents indexed products as a catalogue with grid, list, and selectable-column table views. It hides disabled or attribute-less products by default, supports multi-store browsing, image cards, original webshop links, product detail/history views, likely same-product matches across stores, IndexedDB favorites/lists, and an expression query language with boolean, arithmetic, comparison, pattern, grouping, and regex operators. See `docs/WEB_UI.md`.

## Analysis

The UI can load resolved state shards across all stores and compute:

- lexical/SKU/category product clusters across stores
- per-store relative price indexes
- likely favorable offers compared to cluster medians
- persisted cross-store snapshots at `analysis/cross-store/latest.json` and timestamped history files

## Direct and watched searches

Catalogue search filters products already stored locally. The **Searches** workspace instead calls each selected source's native search capability. Direct searches are read-only and do not change the catalogue.

A saved search can be watched on an interval. The running Bun server checks due watched searches once per minute. Successful watched results are upserted into the tracked catalogue and current search membership; products leaving a search remain in the catalogue. Runs and membership changes are retained in SQLite. Multi-source runs preserve successful results and report failures per source.

Ecwid and Shopify translate text queries to their native APIs. JSON-LD marketplace sources require an explicit search URL template:

```json
{
  "settings": {
    "searchUrlTemplate": "https://example.com/search?q={query}"
  }
}
```

All source search requests pass through the read-only HTTP client and can only use `GET` or `HEAD`.

## AI-generated source adapters

The local Sources workspace can onboard an unsupported public website by asking the
installed `gemini` CLI to generate an executable adapter. Enable this explicitly:

```bash
ENABLE_AI_ADAPTER_ONBOARDING=1 \
AI_ADAPTER_ONBOARDING_TOKEN='<dedicated-secret>' \
bun run server
```

Gemini must already be authenticated. The wizard requires a catalogue URL and its
displayed page number, one product URL, and a search URL with its displayed query.
It fetches anonymous evidence, optionally captures rendered HTML with a configured
headless browser command, generates and tests the adapter up to three times, and
runs an independent Gemini verification pass. Clear passes activate automatically;
inconclusive passes show previews for approval.

Activated adapters are stored under `.ecwid-sync/adapters/<adapterId>/` with their
manifest and verification report. Delete the generated source from the Sources API
and remove that adapter directory to recover from a bad activation.

Generated adapters execute in a scrubbed child process and are screened for imports,
host-runtime access, direct network calls, and dynamic code execution. They are still
trusted executable local code; static screening cannot eliminate every possible
prompt-injection or sandbox-escape technique.

## Canonical products and enrichment

The operational database now distinguishes store-specific `ProductOffering` rows from
canonical `Product` rows. Existing `/api/products` responses remain available as a
compatibility alias for offerings. New API entry points are:

- `GET /api/product-offerings`
- `GET /api/product-offerings/:id`
- `GET /api/canonical-products`
- `GET /api/canonical-products/:id`
- `POST /api/enrichment/runs`
- `GET /api/enrichment/runs`
- `GET /api/enrichment/runs/:id/proposals`
- `POST /api/enrichment/runs/:id/proposals`
- `POST /api/enrichment/runs/:id/execute`
- `POST /api/enrichment/runs/:id/apply`

Preparing an enrichment run creates a dedicated SQLite artifact at
`.ecwid-sync/enrichment-runs/<run-id>/enrichment.sqlite`. The agent receives the
database path and schema contract, not product data inline. Source tables are exported
read-only by convention; result tables are listed in `enrichment_contract`.

Agent execution is opt-in:

```bash
ENRICHMENT_AGENT_COMMAND='codex exec --sandbox read-only' \
ENRICHMENT_AGENT_TIMEOUT_MS=300000 \
ENRICHMENT_AGENT_MAX_REPAIRS=1 \
bun run server
```

Embedding candidate generation is optional during run preparation. Configure it with
an existing LLM provider record:

```bash
ENRICHMENT_EMBEDDING_PROVIDER_ID=1 \
ENRICHMENT_EMBEDDING_MODEL='text-embedding-3-small' \
ENRICHMENT_EMBEDDING_MINIMUM_SCORE=0.65 \
bun run server
```

The application validates proposal rows, detects forbidden source-table writes, records
validation errors in the run database, and applies only accepted proposals through
production code. Reapplying proposals is idempotent.
