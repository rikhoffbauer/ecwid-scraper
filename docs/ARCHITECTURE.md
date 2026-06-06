# Architecture

The repository has three layers:

1. `main` contains application code, GitHub Actions workflows, config schema, web UI, and persisted cross-store analysis snapshots.
2. Every configured Ecwid store is mirrored to its own orphan branch at `stores/ecwid/<storeId>`.
3. Each store branch has both human-friendly product JSON files and machine-friendly resolved state indexes.

## Store branch contract

```txt
README.md
config.json                 # redacted per-store config
store.json                  # sync metadata and product hash
products/<id>.json          # current product snapshot, one file per product
events/YYYY/MM/DD/*.jsonl   # append-only atomic product events
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

## Events

Events are written in JSONL files on the same store branch as the product snapshots. Product changes are atomic:

- `product.created`
- `product.deleted`
- `product.field_changed`

Webhook payloads include the store summary and selected events. If `secretEnv` is configured and present in the sync environment, the webhook payload is signed with HMAC-SHA256 in `x-ecwid-watch-signature-256`.

## Product mutation requests

Manual product edits use a GitOps request-file path instead of direct browser writes to generated store files. The web UI commits a single `product-mutations/<storeId>/<requestId>.json` file to a short-lived branch. `.github/workflows/product-mutations.yml` validates request files on PRs and applies them on explicit dispatch or after merge to `main`. The processor writes the resulting product snapshots, event streams, indexes, and manifest to the relevant store orphan branch.

## Store onboarding

The web UI supports adding a new store by committing a new entry to `config/ecwid-stores.json`. Token handling has two modes:

- Browser on-demand sync: paste an Ecwid token for the store; it is used immediately and is not stored by default.
- Scheduled sync: save either a store-specific secret matching `tokenEnv`, or save/update the aggregate `ECWID_STORE_TOKENS_JSON` repository secret.

Because GitHub secrets cannot be read back through the API, the UI can write secrets but cannot display or merge with their existing plaintext values.

## Analysis

Cross-store analysis is deliberately client-side and reproducible from git state:

1. Load every store's `state/products.index.json`.
2. Load product shards from `state/products/*.jsonl`.
3. Cluster by SKU exact match plus lexical/category similarity.
4. Calculate cluster median prices.
5. Derive per-store relative price indexes and favorable-offer candidates.
6. Optionally persist the analysis snapshot back to `main`.
