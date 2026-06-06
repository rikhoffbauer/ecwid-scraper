# Web UI

The UI is deployed from `web/dist` by `.github/workflows/deploy-pages.yml`.

Required token capabilities for full administration:

- repository contents write access: edit `config/ecwid-stores.json` and persist analysis snapshots
- repository secrets write access: create/update/delete Ecwid and webhook secrets
- Actions write access: optional fallback dispatch of `sync-ecwid.yml`

The token is kept in memory by default. If `keep token in this browser session` is enabled, it is stored in `sessionStorage`, not `localStorage`.

## Features

- Add entirely new stores.
- Edit per-store sync intervals.
- Enable/disable stores.
- Configure webhooks per store.
- Create/update/delete repository secrets.
- Save `ECWID_STORE_TOKENS_JSON` for dynamically added stores.
- Run an on-demand browser-side sync for one store without GitHub Actions.
- Browse product snapshots through `state/products.index.json` instead of walking huge directories.
- Browse JSONL event streams through `state/events.index.json`.
- Load products across stores and cluster similar products for price/index/deal analysis.
- Persist cross-store analysis snapshots to `analysis/cross-store/`.

## Browser-side sync

The browser-side sync path asks for the Ecwid token because GitHub does not allow repository secrets to be read back as plaintext. The UI then:

1. Fetches all Ecwid products from the browser.
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
