# Product mutations

The web UI supports product edits without writing every generated product/state file from the browser.
It writes one mutation request JSON file to git. GitHub Actions then validates and expands that request into the store branch.

## Request file path

```txt
product-mutations/<storeId>/<requestId>.json
```

The browser writes this file to a short-lived branch named:

```txt
product-mutations/<storeId>/<requestId>
```

From there it can either:

1. dispatch `.github/workflows/product-mutations.yml` immediately with `request_ref` and `request_path`, or
2. open a PR to `main`; the workflow validates the PR and applies the request after merge.

## Request format

```json
{
  "schemaVersion": 1,
  "kind": "ecwid-product-mutation-batch",
  "source": "web-ui",
  "requestId": "99490018-20260606-190000Z-upsert",
  "storeId": "99490018",
  "requestedAt": "2026-06-06T19:00:00Z",
  "requestedBy": "rikhoffbauer",
  "baseProductsHash": "previous-state-hash",
  "allowOutdatedBase": false,
  "note": "optional human context",
  "operations": [
    {
      "op": "upsert",
      "productId": "123",
      "expectHash": "optional-current-product-hash",
      "product": {
        "id": "123",
        "name": "Example product",
        "price": 12.5
      }
    }
  ]
}
```

Delete requests use the same envelope:

```json
{
  "schemaVersion": 1,
  "kind": "ecwid-product-mutation-batch",
  "source": "web-ui",
  "requestId": "99490018-20260606-190000Z-delete",
  "storeId": "99490018",
  "requestedAt": "2026-06-06T19:00:00Z",
  "operations": [
    {
      "op": "delete",
      "productId": "123",
      "expectHash": "optional-current-product-hash"
    }
  ]
}
```

## Safety rules

- `schemaVersion` must be `1` and `kind` must be `ecwid-product-mutation-batch`.
- A request can contain at most 500 operations.
- Duplicate product IDs in the same request are rejected.
- `upsert.product.id` must be a string or number and must match `productId` when `productId` is provided.
- `baseProductsHash` prevents stale UI writes; the workflow fails if the store branch changed since the UI loaded it, unless `allowOutdatedBase` is true.
- `expectHash` prevents overwriting or deleting a product that changed since the UI selected it.

## Processor

```bash
bun run src/apply-product-mutations.ts \
  --config config/ecwid-stores.json \
  --request product-mutations/99490018/example.json
```

Use `--no-push` for validation or local smoke tests:

```bash
bun run src/apply-product-mutations.ts \
  --config config/ecwid-stores.json \
  --request product-mutations/99490018/example.json \
  --no-push
```

The processor applies requests to `stores/ecwid/<storeId>` and regenerates:

- `products/<id>.json`
- `events/YYYY/MM/DD/<digest>.jsonl`
- `state/products.index.json`
- `state/products/*.jsonl`
- `state/events.index.json`
- `state/latest-events.jsonl`
- `state/run-summary.json`
- `store.json`
