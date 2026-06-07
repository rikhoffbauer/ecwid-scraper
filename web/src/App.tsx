import { useEffect, useMemo, useState } from "react";
import { clusterProducts, dealCandidates, priceIndex } from "./analysis";
import { buildCatalogProducts, catalogContext, hasMeaningfulAttributes, productName, productPrice, searchableText, type CatalogProduct } from "./catalog";
import { ApiClient } from "./client";
import { CatalogueSidebar, CatalogueSurface, type SortKey, type ViewMode } from "./components/Catalogue";
import { AssistantPanel } from "./components/AssistantPanel";
import { ActivityPanel, ProductDetails } from "./components/RightPanels";
import { ActivityPage, IntelligencePage, SettingsPage, SourcesPage } from "./components/WorkspacePages";
import { Icon, RailButton } from "./components/ui";
import { useInfiniteCount, useStoredState } from "./hooks";
import { EMPTY_LOCAL_CATALOGUE_STATE, loadLocalCatalogueState, saveLocalCatalogueState, type LocalCatalogueState } from "./idb";
import { compileProductQuery } from "./query-language";
import type { AppConfig, LoadedProduct, ProductEvent } from "./types";

type Workspace = "catalogue" | "intelligence" | "activity" | "sources" | "settings";
type RightTab = "assistant" | "details" | "activity";

export function App() {
  const [workspace, setWorkspace] = useStoredState<Workspace>("catalogue.workspace", "catalogue");
  const [rightTab, setRightTab] = useStoredState<RightTab>("catalogue.rightTab", "assistant");
  const [apiUrl, setApiUrl] = useStoredState<string>("catalogue.apiUrl", "");
  const [query, setQuery] = useStoredState<string>("catalogue.query", "");
  const [viewMode, setViewMode] = useStoredState<ViewMode>("catalogue.viewMode", "grid");
  const [sortKey, setSortKey] = useStoredState<SortKey>("catalogue.sortKey", "name");
  const [storeFilter, setStoreFilter] = useStoredState<string[]>("catalogue.storeFilter", []);
  const [showHidden, setShowHidden] = useStoredState<boolean>("catalogue.showHidden", false);
  const [config, setConfig] = useState<AppConfig>({ stores: [], defaultSyncIntervalMinutes: 30 });
  const [products, setProducts] = useState<LoadedProduct[]>([]);
  const [events, setEvents] = useState<ProductEvent[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");
  const [localState, setLocalState] = useState<LocalCatalogueState>(EMPTY_LOCAL_CATALOGUE_STATE);
  const [activeListId, setActiveListId] = useState("all");
  const client = useMemo(() => new ApiClient(apiUrl), [apiUrl]);

  const load = async () => {
    try {
      const [nextConfig, nextProducts, nextEvents] = await Promise.all([client.getConfig(), client.getProducts(), client.getEvents()]);
      setConfig(nextConfig); setProducts(nextProducts); setEvents(nextEvents); setNotice("");
    } catch (error) { setNotice((error as Error).message); }
  };
  useEffect(() => { void load(); }, [client]);
  useEffect(() => { void loadLocalCatalogueState().then(setLocalState); }, []);
  const persistLocal = (next: LocalCatalogueState) => { setLocalState(next); void saveLocalCatalogueState(next); };
  const favorites = useMemo(() => new Set(localState.favorites), [localState.favorites]);
  const catalog = useMemo(() => buildCatalogProducts(products, config), [products, config]);
  const compiled = useMemo(() => compileProductQuery(query), [query]);
  const activeList = localState.lists.find((list) => list.id === activeListId);

  const filtered = useMemo(() => {
    let result = catalog.filter((item) => showHidden || hasMeaningfulAttributes({ summary: item.summary, product: item.product }));
    if (storeFilter.length) result = result.filter((item) => storeFilter.includes(item.storeId));
    if (activeListId === "favorites") result = result.filter((item) => favorites.has(item.key));
    else if (activeList) { const keys = new Set(activeList.productKeys); result = result.filter((item) => keys.has(item.key)); }
    if (query.trim() && !compiled.error) result = result.filter((item) => compiled.matches?.(catalogContext(item), searchableText(item)));
    return result.sort((a, b) => {
      const value = (item: CatalogProduct): string | number => {
        if (sortKey === "store") return item.storeName;
        if (sortKey === "price") return productPrice(item.summary, item.product) ?? Number.MAX_SAFE_INTEGER;
        if (sortKey === "stock") return item.summary.quantity ?? 0;
        if (sortKey === "category") return item.summary.categoryNames?.join(" ") ?? "";
        if (sortKey === "favorite") return favorites.has(item.key) ? 0 : 1;
        return productName(item.summary, item.product);
      };
      return typeof value(a) === "number" ? Number(value(a)) - Number(value(b)) : String(value(a)).localeCompare(String(value(b)));
    });
  }, [catalog, showHidden, storeFilter, activeListId, activeList, favorites, query, compiled, sortKey]);
  const resetKey = JSON.stringify([query, storeFilter, activeListId, showHidden, sortKey, viewMode]);
  const infinite = useInfiniteCount(resetKey, filtered.length);
  const visibleProducts = filtered.slice(0, infinite.count);
  const selected = catalog.find((item) => item.key === selectedKey) ?? null;
  const clusters = useMemo(() => clusterProducts(products, .85), [products]);
  const prices = useMemo(() => priceIndex(clusters), [clusters]);
  const deals = useMemo(() => dealCandidates(clusters, .9), [clusters]);

  const toggleFavorite = (key: string) => {
    const next = new Set(favorites); if (next.has(key)) next.delete(key); else next.add(key);
    persistLocal({ ...localState, favorites: [...next] });
  };
  const toggleStore = (id: string) => setStoreFilter(storeFilter.includes(id) ? storeFilter.filter((value) => value !== id) : [...storeFilter, id]);
  const sync = async (id?: string) => {
    setSyncing(true); setNotice(id ? `Syncing ${id}…` : "Syncing sources…");
    try { await client.sync(id, setNotice); await load(); } catch (error) { setNotice((error as Error).message); } finally { setSyncing(false); }
  };
  const selectProduct = (item: CatalogProduct) => { setSelectedKey(item.key); setRightTab("details"); };

  return <div className="app-shell">
    <nav className="edge-rail left-rail">
      <div className="brand-mark">C</div>
      <RailButton label="Catalogue" icon="catalogue" active={workspace === "catalogue"} onClick={() => setWorkspace("catalogue")} />
      <RailButton label="Intelligence" icon="intelligence" active={workspace === "intelligence"} onClick={() => setWorkspace("intelligence")} />
      <RailButton label="Activity" icon="activity" active={workspace === "activity"} onClick={() => setWorkspace("activity")} />
      <RailButton label="Sources" icon="sources" active={workspace === "sources"} onClick={() => setWorkspace("sources")} />
      <span className="rail-spacer" />
      <RailButton label="Settings" icon="settings" active={workspace === "settings"} onClick={() => setWorkspace("settings")} />
    </nav>
    <aside className="left-sidebar">
      {workspace === "catalogue" ? <CatalogueSidebar query={query} setQuery={setQuery} stores={config.stores} storeFilter={storeFilter} toggleStore={toggleStore} showHidden={showHidden} setShowHidden={setShowHidden} sortKey={sortKey} setSortKey={setSortKey} favorites={favorites.size} lists={localState.lists} activeListId={activeListId} setActiveListId={setActiveListId} /> : <div className="context-sidebar workspace-index"><header className="sidebar-header"><div><span>Workspace</span><h2>{workspace}</h2></div></header><p>{workspace === "intelligence" ? "Cross-source comparisons and favorable offers." : workspace === "activity" ? "Recent changes and assistant actions." : workspace === "sources" ? "Read-only source connections and sync status." : "Connection and workspace preferences."}</p><div className="safety-note"><Icon name="details" /><span>External sources are tracked read-only.</span></div></div>}
    </aside>
    <div className="center-column">
      {notice ? <div className="global-notice">{notice}<button onClick={() => setNotice("")}><Icon name="close" /></button></div> : null}
      {workspace === "catalogue" ? <CatalogueSurface products={visibleProducts} total={filtered.length} viewMode={viewMode} setViewMode={setViewMode} selectedKey={selectedKey} select={selectProduct} favorites={favorites} toggleFavorite={toggleFavorite} sentinelRef={infinite.sentinelRef} hasMore={visibleProducts.length < filtered.length} syncing={syncing} sync={() => sync()} /> : null}
      {workspace === "intelligence" ? <IntelligencePage products={products} clusters={clusters} prices={prices} deals={deals} /> : null}
      {workspace === "activity" ? <ActivityPage events={events} /> : null}
      {workspace === "sources" ? <SourcesPage stores={config.stores} sync={sync} syncing={syncing} /> : null}
      {workspace === "settings" ? <SettingsPage apiUrl={apiUrl} setApiUrl={setApiUrl} /> : null}
    </div>
    <aside className="right-sidebar">
      {rightTab === "assistant" ? <AssistantPanel apiUrl={apiUrl} /> : rightTab === "details" ? <ProductDetails detail={selected} catalog={catalog} events={events} /> : <ActivityPanel events={events} />}
    </aside>
    <nav className="edge-rail right-rail">
      <RailButton label="Assistant" icon="assistant" active={rightTab === "assistant"} onClick={() => setRightTab("assistant")} />
      <RailButton label="Product details" icon="details" active={rightTab === "details"} onClick={() => setRightTab("details")} />
      <RailButton label="Activity" icon="activity" active={rightTab === "activity"} onClick={() => setRightTab("activity")} />
    </nav>
  </div>;
}
