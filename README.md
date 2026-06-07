# Ecwid Product Git Watch

Mirror one or more Ecwid stores into git and use the repository itself as a product-change event bus plus searchable state store.

- `main` stores config, code, workflows, analysis snapshots, and the GitHub Pages UI.
- Every Ecwid store gets its own orphan branch: `stores/ecwid/<storeId>`.
- Each store branch contains current per-product JSON files, append-only JSONL product events, and resolved state snapshots/indexes. Large event/state JSONL outputs are sharded below GitHub blob limits.
- Store sync intervals are configured per store.
- The web UI can add stores, manage secrets, configure webhooks, run browser-side on-demand syncs, browse products/events as a webshop-like catalogue, save local favorites/lists, run advanced product queries, and run cross-store analysis.
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
