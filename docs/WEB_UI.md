# Web UI

The UI is deployed from `web/dist` by `.github/workflows/deploy-pages.yml`.

Required token capabilities for full administration:

- repository contents write access: edit `config/ecwid-stores.json` and persist analysis snapshots
- repository secrets write access: create/update/delete Ecwid and webhook secrets
- Actions write access: optional dispatch of `sync-ecwid.yml`

The GitHub token is stored in `localStorage` under `ecwid-ui.token` so catalogue browsing survives page reloads. Use **Clear token** on shared machines.

## Workspace design

The UI uses a light-first editorial intelligence workspace:

- a slim left rail switches Catalogue, Intelligence, Activity, Sources, and Settings
- one contextual left sidebar holds filters and workspace controls
- one contextual right sidebar switches Assistant, Product Details, and Activity
- catalogue results load progressively as the user scrolls instead of using pagination
- advanced controls use progressive disclosure to keep the default workspace quiet

The assistant renders trusted application-owned widgets inline in chat for products,
comparisons, event lists, analysis summaries, action results, and artifacts. It never
renders assistant-provided HTML. Reversible internal actions include an inline undo
control; external stores remain read-only.

The assistant drawer supports persistent conversations. The focused chat view switches
to a full-width history view for creating, opening, renaming, archiving, restoring, and
deleting conversations. Responses run on the Bun server and continue when the user
switches conversations or leaves the page. Reconnectable server-sent events render text
deltas and full tool activity while a response is still generating.

The rounded message composer contains arbitrary file attachment, provider/model
selection, and send controls. Uploaded files are stored below
`.ecwid-sync/attachments/<conversationId>/`. The assistant has explicitly unrestricted
host shell and filesystem tools for inspecting unsupported file types. Full tool inputs
and outputs are stored in conversation history, so this local application must not be
exposed to untrusted users or public traffic.

Chat message text is rendered as sanitized GitHub-flavored Markdown, including lists,
links, tables, blockquotes, and fenced code.

LLM providers are configured through an inline Settings editor. Selecting a provider
shows its relevant endpoint, authentication, and provider-specific fields; the UI
constructs the stored provider configuration JSON internally. Provider configurations
do not require user-defined names and use the provider kind as their display label.

The assistant can use a user-selected shared browser tab, window, or screen as visual
context. The UI always displays an active sharing preview and stop control. Screen
frames are sampled at low detail and the existing text conversation remains available
when Realtime voice is unavailable.

## Product browsing

The default view is the catalogue browser. It reads each store branch's `state/products.index.json` and uses product summaries for fast multi-store browsing without walking `products/*.json`.

Features:

- grid, list, and selectable-column table views
- product images from Ecwid thumbnail/image summary fields
- default hiding for disabled or attribute-less records such as `{ "id": 693688849, "enabled": false }`
- multi-store browsing with store toggles
- details panel with raw offering JSON, original webshop link, and likely same-product matches in other stores
- on-demand product history loading from `state/events.index.json` and JSONL event files
- favorites and arbitrary local product lists stored in IndexedDB
- table sorting and column selection

The Intelligence workspace groups accepted canonical-product links first. Unlinked
offerings may still be grouped by the existing lexical/SKU heuristic, but those groups
are explicitly labeled as heuristic fallbacks.

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

## Direct and watched searches

The **Searches** workspace is separate from the catalogue query language. It sends a portable text query to one or more selected source adapters and displays per-source success or error status.

Direct results are not persisted. A search can be saved for manual reuse or watched at a configured interval. Running a watched search adds or updates found products in the catalogue, retains current search membership plus run/change history, and never deletes catalogue products when they stop matching.

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
