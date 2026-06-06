# Product event contract

Product event branches are orphan branches named:

```txt
events/ecwid/<storeId>
```

Each branch contains append-only JSONL files:

```txt
events/YYYY/MM/DD/<digest>.jsonl
```

Every line is a single atomic product event.

## Event types

### `product.created`

Emitted once for a product ID that exists in Ecwid but has no existing snapshot file.

Important fields:

- `eventId`: deterministic SHA-256-derived event identifier.
- `storeId`: Ecwid store ID.
- `productId`: Ecwid product ID.
- `currentHash`: SHA-256 of the canonical product JSON.
- `product`: full canonical Ecwid product payload.

### `product.deleted`

Emitted once for a product ID that had a snapshot file but no longer appears in Ecwid.

Important fields:

- `previousHash`: SHA-256 of the removed canonical product JSON.
- `product`: last known full product payload.

### `product.field_changed`

Emitted once per changed JSON path inside an existing product.

Important fields:

- `op`: `add`, `remove`, or `replace`.
- `path`: JSON Pointer path, such as `/price`, `/name`, or `/categories`.
- `before`: previous value when available.
- `after`: current value when available.
- `previousHash` and `currentHash`: full-product hashes before and after the change.

## Consumer pattern

A consumer that cares about price changes can watch `events/ecwid/<storeId>`, parse newly pushed JSONL files, and filter:

```ts
const event = JSON.parse(line);
if (event.eventType === "product.field_changed" && event.path === "/price") {
  // inspect event.before, event.after, event.productId, event.storeId
}
```

Event IDs are deterministic for the semantic change, so downstream consumers can safely de-duplicate repeated deliveries.
