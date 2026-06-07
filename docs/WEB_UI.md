# Web UI

The UI is deployed from `web/dist` by `.github/workflows/deploy-pages.yml`.

Required token capabilities for full administration:

- repository contents write access: edit `config/ecwid-stores.json` and persist analysis snapshots
- repository secrets write access: create/update/delete Ecwid and webhook secrets
- Actions write access: optional dispatch of `sync-ecwid.yml`

The GitHub token is stored in `localStorage` under `ecwid-ui.token` so catalogue browsing survives page reloads. Use **Clear token** on shared machines.

## Product browsing

The default view is the catalogue browser. It reads each store branch's `state/products.index.json` and uses product summaries for fast multi-store browsing without walking `products/*.json`.

Features:

- grid, list, and selectable-column table views
- product images from Ecwid thumbnail/image summary fields
- default hiding for disabled or attribute-less records such as `{ "id": 693688849, "enabled": false }`
- multi-store browsing with store toggles
- details panel with raw product JSON, original webshop link, and likely same-product matches in other stores
- on-demand product history loading from `state/events.index.json` and JSONL event files
- favorites and arbitrary local product lists stored in IndexedDB
- table sorting and column selection

## Query language

Plain text searches use full-text matching across store id/name, product id, name, SKU, categories, URL, hash, and price.

If the query contains operators, expression mode is used. Supported operators:

- boolean: `&&`, `||`, `!`
- grouping: `(`, `)`
- arithmetic: `+`, `-`, `*`, `/`, `%`, `^`
- relational: `==`, `!=`, `>`, `>=`, `<`, `<=`
- pattern matching: `^=`, `$=`, `*=`, `~=`, `|=`
- regular expression literals: `/pattern/i`

Common fields:

- `storeId`, `store`, `storeName`
- `id`, `productId`, `name`, `title`, `sku`
- `price`, `quantity`, `inStock`, `enabled`
- `category`, `categories`
- `url`, `thumbnailUrl`, `hash`, `path`, `shardPath`
- nested paths such as `summary.categoryNames`

Examples:

```txt
hoodie cotton
price >= 20 && price < 80
storeId == "99490018" && (name *= hoodie || sku ^= HOOD)
!enabled || inStock == false
name ~= /cotton|linen/i && category |= Apparel
(price * 1.21) <= 50
```

For pattern operators, an unquoted right-hand identifier is treated as a literal if no field with that name exists, so `name *= hoodie` works like `name *= "hoodie"`.

## Read-only tracking

Products displayed by the UI are tracked snapshots. The UI never edits, deletes, or
otherwise modifies products in Ecwid or any other source store.

## Browser-side sync

The browser-side sync path asks for the Ecwid token because GitHub does not allow repository secrets to be read back as plaintext. The UI then:

1. Fetches Ecwid products from the browser.
2. Loads the previous resolved state from `state/products/*.jsonl`.
3. Computes creates, deletes, and atomic field changes.
4. Writes changed product JSON files and event JSONL files.
5. Rewrites resolved state indexes/shards.
6. Creates or updates the store orphan branch directly through the GitHub Git database API.

## Webhooks

Webhook configuration lives in each store config:

```json
{
  "id": "offers-indexer",
  "url": "https://example.com/ecwid-events",
  "enabled": true,
  "events": ["product.created", "product.field_changed"],
  "secretEnv": "OFFERS_INDEXER_WEBHOOK_SECRET"
}
```

When `secretEnv` is present during scheduled sync, the request body is signed with HMAC-SHA256 and sent as `x-ecwid-watch-signature-256`.
