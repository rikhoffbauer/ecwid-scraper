import type { RefObject } from "react";
import { categoryText, formatPrice, productImageUrl, productName, productPrice, stockLabel, type CatalogProduct } from "../catalog";
import type { StoreConfig } from "../types";
import { EmptyState, Icon } from "./ui";

export type ViewMode = "grid" | "list" | "table";
export type SortKey = "name" | "store" | "price" | "sku" | "stock" | "category" | "favorite";

function ProductImage({ item }: { item: CatalogProduct }) {
  const url = productImageUrl(item.summary, item.product);
  return url ? <img src={url} alt="" loading="lazy" /> : <div className="product-placeholder">No image</div>;
}

export function CatalogueSidebar(props: {
  query: string; setQuery: (value: string) => void; stores: StoreConfig[]; storeFilter: string[]; toggleStore: (id: string) => void;
  showHidden: boolean; setShowHidden: (value: boolean) => void; sortKey: SortKey; setSortKey: (value: SortKey) => void;
  favorites: number; lists: Array<{ id: string; name: string; productKeys: string[] }>; activeListId: string; setActiveListId: (value: string) => void;
}) {
  return <div className="context-sidebar">
    <header className="sidebar-header"><div><span>Explore</span><h2>Filters</h2></div></header>
    <label className="search-field"><Icon name="search" /><input value={props.query} onChange={(event) => props.setQuery(event.currentTarget.value)} placeholder="Search products or write a query" /></label>
    <div className="filter-summary"><span>{props.storeFilter.length ? `${props.storeFilter.length} sources` : "All sources"}</span><span>{props.showHidden ? "Including hidden" : "Available products"}</span></div>
    <section className="sidebar-section"><h3>Sources</h3><div className="sidebar-options">{props.stores.map((store) => <button key={store.id} className={!props.storeFilter.length || props.storeFilter.includes(store.id) ? "selected" : ""} onClick={() => props.toggleStore(store.id)}><span>{store.name ?? store.id}</span></button>)}</div></section>
    <section className="sidebar-section"><h3>Collections</h3><div className="sidebar-options"><button className={props.activeListId === "all" ? "selected" : ""} onClick={() => props.setActiveListId("all")}><span>All products</span></button><button className={props.activeListId === "favorites" ? "selected" : ""} onClick={() => props.setActiveListId("favorites")}><span>Favorites</span><small>{props.favorites}</small></button>{props.lists.map((list) => <button key={list.id} className={props.activeListId === list.id ? "selected" : ""} onClick={() => props.setActiveListId(list.id)}><span>{list.name}</span><small>{list.productKeys.length}</small></button>)}</div></section>
    <details className="more-filters"><summary>More filters</summary><label>Sort<select value={props.sortKey} onChange={(event) => props.setSortKey(event.currentTarget.value as SortKey)}><option value="name">Name</option><option value="store">Store</option><option value="price">Price</option><option value="stock">Stock</option><option value="category">Category</option><option value="favorite">Favorite</option></select></label><label className="toggle-row"><input type="checkbox" checked={props.showHidden} onChange={(event) => props.setShowHidden(event.currentTarget.checked)} /> Include disabled products</label></details>
  </div>;
}

export function CatalogueSurface(props: {
  products: CatalogProduct[]; total: number; viewMode: ViewMode; setViewMode: (value: ViewMode) => void; selectedKey: string | null;
  select: (item: CatalogProduct) => void; favorites: Set<string>; toggleFavorite: (key: string) => void; sentinelRef: RefObject<HTMLDivElement | null>; hasMore: boolean; syncing: boolean; sync: () => void;
}) {
  return <main className="workspace-main">
    <header className="workspace-toolbar"><div><h1>Catalogue</h1><span>{props.total.toLocaleString()} products</span></div><div className="toolbar-actions"><div className="view-switch">{(["grid", "list", "table"] as ViewMode[]).map((mode) => <button key={mode} className={props.viewMode === mode ? "active" : ""} onClick={() => props.setViewMode(mode)}>{mode}</button>)}</div><button className="sync-button" disabled={props.syncing} onClick={props.sync}><Icon name="sync" />{props.syncing ? "Syncing" : "Sync"}</button></div></header>
    {!props.products.length ? <EmptyState title="No products match">Adjust the current query or filters.</EmptyState> : null}
    {props.viewMode === "grid" ? <div className="catalogue-grid">{props.products.map((item) => <article key={item.key} className={`catalogue-card ${props.selectedKey === item.key ? "selected" : ""}`} onClick={() => props.select(item)}><div className="catalogue-media"><ProductImage item={item} /><button aria-label="Toggle favorite" className={props.favorites.has(item.key) ? "favorite active" : "favorite"} onClick={(event) => { event.stopPropagation(); props.toggleFavorite(item.key); }}>★</button></div><div className="catalogue-copy"><span>{item.storeName}</span><h3>{productName(item.summary, item.product)}</h3><div><b>{formatPrice(productPrice(item.summary, item.product))}</b><small>{stockLabel(item.summary)}</small></div></div></article>)}</div> : null}
    {props.viewMode === "list" ? <div className="catalogue-list">{props.products.map((item) => <button key={item.key} className={props.selectedKey === item.key ? "selected" : ""} onClick={() => props.select(item)}><div className="list-image"><ProductImage item={item} /></div><div><span>{item.storeName}</span><strong>{productName(item.summary, item.product)}</strong><small>{categoryText(item.summary) || "Uncategorized"}</small></div><b>{formatPrice(productPrice(item.summary, item.product))}</b></button>)}</div> : null}
    {props.viewMode === "table" ? <div className="table-shell"><table><thead><tr><th>Product</th><th>Source</th><th>Price</th><th>Stock</th><th>Category</th></tr></thead><tbody>{props.products.map((item) => <tr key={item.key} className={props.selectedKey === item.key ? "selected" : ""} onClick={() => props.select(item)}><td><strong>{productName(item.summary, item.product)}</strong><span>{item.summary.sku}</span></td><td>{item.storeName}</td><td>{formatPrice(productPrice(item.summary, item.product))}</td><td>{stockLabel(item.summary)}</td><td>{categoryText(item.summary)}</td></tr>)}</tbody></table></div> : null}
    <div ref={props.sentinelRef} className="load-sentinel">{props.hasMore ? <><span className="spinner" />Loading more products…</> : "End of catalogue"}</div>
  </main>;
}
