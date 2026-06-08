import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClient } from "./client";
import { CatalogueSidebar, CatalogueSurface, type SortKey, type ViewMode } from "./components/Catalogue";
import { AssistantPanel } from "./components/AssistantPanel";
import { ActivityPanel, ProductDetails } from "./components/RightPanels";
import { ActivityPage, EnrichmentPage, IntelligencePage, SearchesPage, SettingsPage, SourcesPage } from "./components/WorkspacePages";
import { Icon, RailButton } from "./components/ui";
import { useInfiniteCount, useStoredState } from "./hooks";
import { EMPTY_LOCAL_CATALOGUE_STATE, loadLocalCatalogueState, saveLocalCatalogueState, type LocalCatalogueState } from "./idb";
import type { Workspace, RightTab } from "../shared/types";

export function App() {
  const [workspace, setWorkspace] = useStoredState<Workspace>("catalogue.workspace", "catalogue");
  const [rightTab, setRightTab] = useStoredState<RightTab>("catalogue.rightTab", "assistant");
  const [apiUrl, setApiUrl] = useStoredState<string>("catalogue.apiUrl", "");
  const [query, setQuery] = useStoredState<string>("catalogue.query", "");
  const [viewMode, setViewMode] = useStoredState<ViewMode>("catalogue.viewMode", "grid");
  const [sortKey, setSortKey] = useStoredState<SortKey>("catalogue.sortKey", "name");
  const [storeFilter, setStoreFilter] = useStoredState<string[]>("catalogue.storeFilter", []);
  const [showHidden, setShowHidden] = useStoredState<boolean>("catalogue.showHidden", false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeListId, setActiveListId] = useState("all");
  const [leftWidth, setLeftWidth] = useStoredState<number>("catalogue.leftWidth", 246);
  const [rightWidth, setRightWidth] = useStoredState<number>("catalogue.rightWidth", 354);
  const [leftCollapsed, setLeftCollapsed] = useStoredState<boolean>("catalogue.leftCollapsed", false);
  const [rightCollapsed, setRightCollapsed] = useStoredState<boolean>("catalogue.rightCollapsed", false);
  const client = useMemo(() => new ApiClient(apiUrl), [apiUrl]);
  const queryClient = useQueryClient();

  // Queries
  const { data: config = { stores: [], defaultSyncIntervalMinutes: 30 } } = useQuery({
    queryKey: ["config"],
    queryFn: () => client.getConfig()
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => client.getEvents()
  });

  const { data: searches = [] } = useQuery({
    queryKey: ["searches"],
    queryFn: () => client.getSavedSearches()
  });

  const { data: localState = EMPTY_LOCAL_CATALOGUE_STATE } = useQuery({
    queryKey: ["localState"],
    queryFn: loadLocalCatalogueState
  });

  const persistLocal = (next: LocalCatalogueState) => {
    queryClient.setQueryData(["localState"], next);
    void saveLocalCatalogueState(next);
  };

  const favorites = useMemo(() => new Set(localState.favorites), [localState.favorites]);
  const activeList = localState.lists.find((list) => list.id === activeListId);

  const resetKey = JSON.stringify([query, storeFilter, activeListId, showHidden, sortKey, viewMode]);
  const infinite = useInfiniteCount(resetKey, 10000); // we don't know total until search returns

  const searchParams = useMemo(() => ({
    query,
    storeFilter,
    activeListKeys: activeListId === "all" ? undefined : (activeListId === "favorites" ? Array.from(favorites) : activeList?.productKeys),
    favorites: Array.from(favorites),
    showHidden,
    sortKey,
    offset: 0,
    limit: infinite.count
  }), [query, storeFilter, activeListId, favorites, activeList, showHidden, sortKey, infinite.count]);

  const { data: searchResult } = useQuery({
    queryKey: ["products", searchParams],
    queryFn: () => client.searchProducts(searchParams),
    placeholderData: (prev) => prev,
    enabled: workspace === "catalogue"
  });

  const { data: analysis } = useQuery({
    queryKey: ["analysis"],
    queryFn: () => client.getAnalysis(),
    enabled: workspace === "intelligence"
  });

  const visibleProducts = searchResult?.products || [];
  const totalProducts = searchResult?.total || 0;
  const selected = visibleProducts.find((item: any) => item.key === selectedKey) ?? null;

  const handleLeftRailClick = (targetWorkspace: Workspace) => {
    if (workspace === targetWorkspace) setLeftCollapsed(!leftCollapsed);
    else { setWorkspace(targetWorkspace); setLeftCollapsed(false); }
  };

  const handleRightRailClick = (targetTab: RightTab) => {
    if (rightTab === targetTab) setRightCollapsed(!rightCollapsed);
    else { setRightTab(targetTab); setRightCollapsed(false); }
  };

  const initLeftResize = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    const railWidth = 52;
    const startX = mouseDownEvent.clientX;
    const startWidth = leftCollapsed ? 0 : leftWidth;
    const doResize = (mouseMoveEvent: MouseEvent) => {
      let newWidth = startWidth + (mouseMoveEvent.clientX - startX);
      newWidth = Math.min(newWidth, Math.max(160, window.innerWidth - (rightCollapsed ? 0 : rightWidth) - (2 * railWidth) - 420));
      if (newWidth < 100) setLeftCollapsed(true);
      else { setLeftCollapsed(false); setLeftWidth(newWidth); }
    };
    const stopResize = () => { document.removeEventListener("mousemove", doResize); document.removeEventListener("mouseup", stopResize); };
    document.addEventListener("mousemove", doResize); document.addEventListener("mouseup", stopResize);
  };

  const initRightResize = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    const railWidth = 52;
    const startX = mouseDownEvent.clientX;
    const startWidth = rightCollapsed ? 0 : rightWidth;
    const doResize = (mouseMoveEvent: MouseEvent) => {
      let newWidth = startWidth - (mouseMoveEvent.clientX - startX);
      newWidth = Math.min(newWidth, Math.max(200, window.innerWidth - (leftCollapsed ? 0 : leftWidth) - (2 * railWidth) - 420));
      if (newWidth < 120) setRightCollapsed(true);
      else { setRightCollapsed(false); setRightWidth(newWidth); }
    };
    const stopResize = () => { document.removeEventListener("mousemove", doResize); document.removeEventListener("mouseup", stopResize); };
    document.addEventListener("mousemove", doResize); document.addEventListener("mouseup", stopResize);
  };

  const toggleFavorite = (key: string) => {
    const next = new Set(favorites); if (next.has(key)) next.delete(key); else next.add(key);
    persistLocal({ ...localState, favorites: [...next] });
  };
  const toggleStore = (id: string) => setStoreFilter(storeFilter.includes(id) ? storeFilter.filter((value) => value !== id) : [...storeFilter, id]);

  const syncMutation = useMutation({
    mutationFn: async (id?: string) => {
      setSyncing(true); setNotice(id ? `Syncing ${id}…` : "Syncing sources…");
      await client.sync(id, setNotice);
    },
    onSettled: () => {
      setSyncing(false);
      queryClient.invalidateQueries();
    },
    onError: (error) => setNotice((error as Error).message)
  });

  const selectProduct = (item: any) => { setSelectedKey(item.key); setRightTab("details"); };

  const currentLeftWidth = leftCollapsed ? 0 : leftWidth;
  const currentRightWidth = rightCollapsed ? 0 : rightWidth;

  return <div className="app-shell" style={{ "--left-panel": `${currentLeftWidth}px`, "--right-panel": `${currentRightWidth}px` } as React.CSSProperties}>
    <nav className="edge-rail left-rail">
      <div className="brand-mark">C</div>
      <RailButton label="Catalogue" icon="catalogue" active={workspace === "catalogue" && !leftCollapsed} onClick={() => handleLeftRailClick("catalogue")} />
      <RailButton label="Searches" icon="search" active={workspace === "searches" && !leftCollapsed} onClick={() => handleLeftRailClick("searches")} />
      <RailButton label="Intelligence" icon="intelligence" active={workspace === "intelligence" && !leftCollapsed} onClick={() => handleLeftRailClick("intelligence")} />
      <RailButton label="Enrichment" icon="details" active={workspace === "enrichment" && !leftCollapsed} onClick={() => handleLeftRailClick("enrichment")} />
      <RailButton label="Activity" icon="activity" active={workspace === "activity" && !leftCollapsed} onClick={() => handleLeftRailClick("activity")} />
      <RailButton label="Sources" icon="sources" active={workspace === "sources" && !leftCollapsed} onClick={() => handleLeftRailClick("sources")} />
      <span className="rail-spacer" />
      <RailButton label="Settings" icon="settings" active={workspace === "settings" && !leftCollapsed} onClick={() => handleLeftRailClick("settings")} />
    </nav>
    <aside className={`left-sidebar ${leftCollapsed ? "collapsed" : ""}`}>
      {workspace === "catalogue" ? <CatalogueSidebar query={query} setQuery={setQuery} stores={config.stores} storeFilter={storeFilter} toggleStore={toggleStore} showHidden={showHidden} setShowHidden={setShowHidden} sortKey={sortKey} setSortKey={setSortKey} favorites={favorites.size} lists={localState.lists} activeListId={activeListId} setActiveListId={setActiveListId} /> : <div className="context-sidebar workspace-index"><header className="sidebar-header"><div><span>Workspace</span><h2>{workspace}</h2></div></header><p>{workspace === "searches" ? "Query source systems directly and watch searches over time." : workspace === "intelligence" ? "Cross-source comparisons and favorable offers." : workspace === "enrichment" ? "Prepare, review, and apply AI enrichment proposals." : workspace === "activity" ? "Recent changes and assistant actions." : workspace === "sources" ? "Read-only source connections and sync status." : "Connection and workspace preferences."}</p><div className="safety-note"><Icon name="details" /><span>External sources are tracked read-only.</span></div></div>}
      <div className="resize-handle left-handle" onMouseDown={initLeftResize} onDoubleClick={() => setLeftCollapsed(!leftCollapsed)} />
    </aside>
    <div className="center-column">
      {notice ? <div className="global-notice">{notice}<button onClick={() => setNotice("")}><Icon name="close" /></button></div> : null}
      {workspace === "catalogue" ? <CatalogueSurface products={visibleProducts} total={totalProducts} viewMode={viewMode} setViewMode={setViewMode} selectedKey={selectedKey} select={selectProduct} favorites={favorites} toggleFavorite={toggleFavorite} sentinelRef={infinite.sentinelRef} hasMore={visibleProducts.length < totalProducts} syncing={syncing} sync={(id?: string) => syncMutation.mutate(id)} /> : null}
      {workspace === "searches" ? <SearchesPage client={client} stores={config.stores} searches={searches} reload={() => queryClient.invalidateQueries({ queryKey: ["searches"] })} catalogueChanged={() => queryClient.invalidateQueries({ queryKey: ["products"] })} /> : null}
      {workspace === "intelligence" ? <IntelligencePage products={analysis?.clusters.flatMap((c: any) => c.products) || []} clusters={analysis?.clusters || []} prices={analysis?.priceIndex || []} deals={analysis?.dealCandidates || []} /> : null}
      {workspace === "enrichment" ? <EnrichmentPage client={client} /> : null}
      {workspace === "activity" ? <ActivityPage events={events} /> : null}
      {workspace === "sources" ? <SourcesPage stores={config.stores} sync={(id?: string) => syncMutation.mutate(id)} syncing={syncing} client={client} reload={() => queryClient.invalidateQueries({ queryKey: ["config"] })} /> : null}
      {workspace === "settings" ? <SettingsPage apiUrl={apiUrl} setApiUrl={setApiUrl} client={client} /> : null}
    </div>
    <aside className={`right-sidebar ${rightCollapsed ? "collapsed" : ""}`}>
      {rightTab === "assistant" ? <AssistantPanel apiUrl={apiUrl} /> : rightTab === "details" ? <ProductDetails detail={selected} catalog={visibleProducts} events={events} /> : <ActivityPanel events={events} />}
      <div className="resize-handle right-handle" onMouseDown={initRightResize} onDoubleClick={() => setRightCollapsed(!rightCollapsed)} />
    </aside>
    <nav className="edge-rail right-rail">
      <RailButton label="Assistant" icon="assistant" active={rightTab === "assistant" && !rightCollapsed} onClick={() => handleRightRailClick("assistant")} />
      <RailButton label="Product details" icon="details" active={rightTab === "details" && !rightCollapsed} onClick={() => handleRightRailClick("details")} />
      <RailButton label="Activity" icon="activity" active={rightTab === "activity" && !rightCollapsed} onClick={() => handleRightRailClick("activity")} />
    </nav>
  </div>;
}
