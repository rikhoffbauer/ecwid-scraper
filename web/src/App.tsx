import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Octokit } from "@octokit/rest";
import { buildAnalysisSnapshot, clusterProducts, dealCandidates, priceIndex, productName as loadedProductName, productPrice as loadedProductPrice } from "./analysis";
import { buildCatalogProducts, catalogContext, categoryText, formatPrice, hasMeaningfulAttributes, itemToLoadedProduct, productImageUrl, productKey, productName, productPrice, productUrl, searchableText, similarProducts, stockLabel, summarizeHistory, type CatalogProduct } from "./catalog";
import { browserSyncStore, loadStoreStateProducts } from "./client-sync";
import { createBranchFrom, createPullRequest, deleteRepoSecret, dispatchWorkflow, getAuthenticatedUser, getTreeFilesByPath, listBranches, listFiles, listRepoSecrets, loadConfig, makeOctokit, parseRepository, readBlobText, readBlobTextByPath, setRepoSecret, writeJsonFile } from "./github";
import { EMPTY_LOCAL_CATALOGUE_STATE, loadLocalCatalogueState, makeListId, saveLocalCatalogueState, type LocalCatalogueState } from "./idb";
import { parseJsonObject, safeJsonPreview, safePathSegment, stableStringify } from "./json";
import { compileProductQuery } from "./query-language";
import type { AnalysisSnapshot, AppConfig, LoadedProduct, ProductEvent, ProductMutationBatch, ProductStateIndex, ProductStateIndexRecord, RepoSecretSummary, RepoTarget, StoreConfig, StoreEventIndex, StoreManifest, StoreWebhookConfig, TreeFile } from "./types";

type TabId = "browse" | "overview" | "stores" | "sync" | "mutations" | "secrets" | "events" | "analysis" | "files";
type ViewMode = "grid" | "list" | "table";
type Notice = { kind: "info" | "success" | "error"; text: string } | null;
type SortKey = "name" | "store" | "price" | "sku" | "stock" | "id" | "category" | "favorite";

type ProductDetail = {
  item: CatalogProduct;
  product?: Record<string, unknown>;
  history?: ProductEvent[];
  historySummary?: ReturnType<typeof summarizeHistory>;
  matches?: ReturnType<typeof similarProducts>;
};

const DEFAULT_REPOSITORY = "rikhoffbauer/ecwid-scraper";
const DEFAULT_BRANCH = "main";
const CONFIG_PATH = "config/ecwid-stores.json";
const SYNC_WORKFLOW_ID = "sync-ecwid.yml";
const PRODUCT_MUTATION_WORKFLOW_ID = "product-mutations.yml";
const TOKEN_STORAGE_KEY = "ecwid-ui.token";
const EVENT_TYPES = ["product.created", "product.deleted", "product.field_changed"] as const;

const TABLE_COLUMNS = [
  ["image", "Image"],
  ["store", "Store"],
  ["name", "Name"],
  ["sku", "SKU"],
  ["price", "Price"],
  ["stock", "Stock"],
  ["category", "Category"],
  ["id", "ID"],
  ["hash", "Hash"],
  ["actions", "Actions"]
] as const;
type TableColumn = typeof TABLE_COLUMNS[number][0];

function normalizeSecretName(storeId: string): string {
  const body = storeId.trim().replace(/[^A-Za-z0-9_]/g, "_").replace(/^([0-9])/, "_$1").toUpperCase();
  return `ECWID_${body}_TOKEN`;
}

function storeBranch(config: AppConfig, storeId: string): string {
  return `${config.storeBranchPrefix || "stores/ecwid"}/${safePathSegment(storeId)}`;
}

function formatBytes(value?: number): string {
  if (typeof value !== "number") return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} kB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

function useStoredState(key: string, fallback: string, storage: Storage = localStorage): [string, (value: string) => void] {
  const [value, setValue] = useState(() => storage.getItem(key) ?? fallback);
  return [value, (next) => { setValue(next); storage.setItem(key, next); }];
}

function eventCounts(events: ProductEvent[]): Record<string, number> {
  return events.reduce<Record<string, number>>((acc, event) => { acc[event.eventType] = (acc[event.eventType] ?? 0) + 1; return acc; }, {});
}

function emptyStore(): StoreConfig {
  return { id: "", name: "", url: "", enabled: true, tokenEnv: "", limit: 200, requestDelayMs: 100, syncIntervalMinutes: 30, webhooks: [] };
}

function updateStore(stores: StoreConfig[], index: number, patch: Partial<StoreConfig>): StoreConfig[] {
  return stores.map((store, i) => i === index ? { ...store, ...patch } : store);
}

function updateWebhook(stores: StoreConfig[], storeIndex: number, hookIndex: number, patch: Partial<StoreWebhookConfig>): StoreConfig[] {
  return stores.map((store, i) => {
    if (i !== storeIndex) return store;
    const webhooks = [...(store.webhooks ?? [])];
    webhooks[hookIndex] = { ...webhooks[hookIndex], ...patch } as StoreWebhookConfig;
    return { ...store, webhooks };
  });
}

function safeProductId(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function Field(props: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; help?: string }) {
  return <label className="field"><span>{props.label}</span><input type={props.type ?? "text"} value={props.value} placeholder={props.placeholder} onChange={(event) => props.onChange(event.currentTarget.value)} />{props.help ? <small>{props.help}</small> : null}</label>;
}

function TextField(props: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; help?: string; rows?: number }) {
  return <label className="field"><span>{props.label}</span><textarea rows={props.rows} value={props.value} placeholder={props.placeholder} onChange={(event) => props.onChange(event.currentTarget.value)} />{props.help ? <small>{props.help}</small> : null}</label>;
}

function Section(props: { title: string; description?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${props.className ?? ""}`}><div className="panel-head"><div><h2>{props.title}</h2>{props.description ? <p>{props.description}</p> : null}</div>{props.right ? <div className="panel-actions">{props.right}</div> : null}</div>{props.children}</section>;
}

function NoticeBar({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return <div className={`notice ${notice.kind}`}>{notice.text}</div>;
}

function JsonBlock(props: { value: unknown }) {
  return <pre className="json">{typeof props.value === "string" ? props.value : safeJsonPreview(props.value)}</pre>;
}

function EmptyImage() {
  return <div className="product-image-placeholder">No image</div>;
}

function ProductImage({ item, product }: { item: CatalogProduct; product?: Record<string, unknown> }) {
  const imageUrl = productImageUrl(item.summary, product);
  if (!imageUrl) return <EmptyImage />;
  return <img className="product-image" src={imageUrl} alt={productName(item.summary, product)} loading="lazy" />;
}

function parseWebhookEvents(value: string): StoreWebhookConfig["events"] {
  const items = value.split(",").map((item) => item.trim()).filter(Boolean);
  return (items.length ? items : ["*"]) as StoreWebhookConfig["events"];
}

function cleanStore(store: StoreConfig, config: AppConfig): StoreConfig {
  const id = store.id.trim();
  return {
    id,
    name: store.name?.trim() || undefined,
    url: store.url?.trim() || undefined,
    enabled: store.enabled !== false,
    tokenEnv: store.tokenEnv?.trim() || normalizeSecretName(id),
    apiBaseUrl: store.apiBaseUrl?.trim() || undefined,
    limit: Math.max(1, Math.min(200, Number(store.limit ?? 200))),
    requestDelayMs: Math.max(0, Number(store.requestDelayMs ?? 100)),
    syncIntervalMinutes: Math.max(1, Number(store.syncIntervalMinutes ?? config.defaultSyncIntervalMinutes ?? 30)),
    extraQuery: store.extraQuery,
    webhooks: (store.webhooks ?? []).filter((hook) => hook.id.trim() && hook.url.trim()).map((hook) => ({
      id: hook.id.trim(),
      url: hook.url.trim(),
      enabled: hook.enabled !== false,
      events: hook.events ?? ["*"],
      secretEnv: hook.secretEnv?.trim() || undefined,
      headers: hook.headers
    }))
  };
}

async function loadJsonFromBranch<T>(octokit: Octokit, target: RepoTarget, branch: string, path: string): Promise<T | null> {
  try {
    const files = await getTreeFilesByPath(octokit, target, branch);
    const file = files.get(path);
    if (!file) return null;
    return JSON.parse(await readBlobText(octokit, target, file.sha)) as T;
  } catch {
    return null;
  }
}

function selectedRecord(index: ProductStateIndex | null | undefined, productId: string): ProductStateIndexRecord | undefined {
  return index?.records.find((record) => record.productId === productId);
}

function sortValue(item: CatalogProduct, key: SortKey, favorites: Set<string>): string | number | boolean {
  if (key === "price") return productPrice(item.summary) ?? Number.POSITIVE_INFINITY;
  if (key === "store") return item.storeName;
  if (key === "sku") return item.summary.sku ?? "";
  if (key === "stock") return item.summary.quantity ?? (item.summary.inStock === false ? -1 : 0);
  if (key === "id") return item.productId;
  if (key === "category") return categoryText(item.summary);
  if (key === "favorite") return favorites.has(item.key);
  return productName(item.summary);
}

function includesListProduct(listKeys: string[], key: string): boolean {
  return listKeys.includes(key);
}

export function App() {
  const [repository, setRepository] = useStoredState("ecwid-ui.repository", DEFAULT_REPOSITORY);
  const [branch, setBranch] = useStoredState("ecwid-ui.branch", DEFAULT_BRANCH);
  const [token, setTokenState] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) ?? "");
  const [tab, setTab] = useState<TabId>("browse");
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [authUser, setAuthUser] = useState("");
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [draftStores, setDraftStores] = useState<StoreConfig[]>([]);
  const [storeBranches, setStoreBranches] = useState<string[]>([]);
  const [secrets, setSecrets] = useState<RepoSecretSummary[]>([]);
  const [mainFiles, setMainFiles] = useState<TreeFile[]>([]);
  const [storeFiles, setStoreFiles] = useState<Record<string, TreeFile[]>>({});
  const [manifests, setManifests] = useState<Record<string, StoreManifest | null>>({});
  const [productIndexes, setProductIndexes] = useState<Record<string, ProductStateIndex | null>>({});
  const [eventIndexes, setEventIndexes] = useState<Record<string, StoreEventIndex | null>>({});
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedJson, setSelectedJson] = useState<unknown>(null);
  const [events, setEvents] = useState<ProductEvent[]>([]);
  const [products, setProducts] = useState<LoadedProduct[]>([]);
  const [manualTokens, setManualTokens] = useState<Record<string, string>>({});
  const [secretName, setSecretName] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const [tokensJson, setTokensJson] = useState("{}");
  const [clusterThreshold, setClusterThreshold] = useState("0.55");
  const [dealThreshold, setDealThreshold] = useState("0.75");
  const [syncMaxProducts, setSyncMaxProducts] = useState("");
  const [analysisSnapshot, setAnalysisSnapshot] = useState<AnalysisSnapshot | null>(null);
  const [mutationOp, setMutationOp] = useState<"upsert" | "delete">("upsert");
  const [mutationProductId, setMutationProductId] = useState("");
  const [mutationJson, setMutationJson] = useState("{\n  \"id\": \"new-product-id\",\n  \"name\": \"New product\",\n  \"price\": 0\n}");
  const [mutationNote, setMutationNote] = useState("");
  const [mutationAllowOutdatedBase, setMutationAllowOutdatedBase] = useState(false);

  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showHidden, setShowHidden] = useState(false);
  const [storeFilter, setStoreFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [visibleColumns, setVisibleColumns] = useState<TableColumn[]>(["image", "store", "name", "sku", "price", "stock", "category", "actions"]);
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [localState, setLocalState] = useState<LocalCatalogueState>(EMPTY_LOCAL_CATALOGUE_STATE);
  const [newListName, setNewListName] = useState("");
  const [activeListId, setActiveListId] = useState<"all" | "favorites" | string>("all");

  useEffect(() => {
    loadLocalCatalogueState().then(setLocalState).catch((error) => setNotice({ kind: "error", text: `Loading IndexedDB lists failed: ${(error as Error).message}` }));
  }, []);

  useEffect(() => {
    saveLocalCatalogueState(localState).catch((error) => setNotice({ kind: "error", text: `Saving IndexedDB lists failed: ${(error as Error).message}` }));
  }, [localState]);

  const target = useMemo<RepoTarget | null>(() => {
    try { return { ...parseRepository(repository), branch: branch.trim() || DEFAULT_BRANCH }; }
    catch { return null; }
  }, [repository, branch]);

  const octokit = useMemo<Octokit | null>(() => token.trim() ? makeOctokit(token) : null, [token]);

  const selectedStore = config?.stores.find((store) => store.id === selectedStoreId) ?? config?.stores[0];
  const selectedBranch = selectedStore && config ? storeBranch(config, selectedStore.id) : "";
  const selectedFiles = selectedStore ? storeFiles[selectedStore.id] ?? [] : [];
  const selectedProductIndex = selectedStore ? productIndexes[selectedStore.id] : null;
  const selectedEventIndex = selectedStore ? eventIndexes[selectedStore.id] : null;
  const favorites = useMemo(() => new Set(localState.favorites), [localState.favorites]);
  const activeList = activeListId === "all" || activeListId === "favorites" ? null : localState.lists.find((list) => list.id === activeListId) ?? null;
  const activeListKeys = useMemo(() => new Set(activeList?.productKeys ?? []), [activeList]);

  const recordsByStore = useMemo(() => Object.fromEntries(Object.entries(productIndexes).map(([storeId, index]) => [storeId, index?.records ?? []])), [productIndexes]);
  const catalog = useMemo(() => buildCatalogProducts(config, recordsByStore, storeBranch), [config, recordsByStore]);
  const compiledQuery = useMemo(() => compileProductQuery(query), [query]);
  const visibleStoreIds = storeFilter.length ? new Set(storeFilter) : null;
  const filteredCatalog = useMemo(() => {
    const filtered = catalog.filter((item) => {
      if (!showHidden && !hasMeaningfulAttributes(item)) return false;
      if (visibleStoreIds && !visibleStoreIds.has(item.storeId)) return false;
      if (activeListId === "favorites" && !favorites.has(item.key)) return false;
      if (activeList && !activeListKeys.has(item.key)) return false;
      if (compiledQuery.error) return false;
      return compiledQuery.matches(catalogContext(item), searchableText(item));
    });
    filtered.sort((a, b) => {
      const av = sortValue(a, sortKey, favorites);
      const bv = sortValue(b, sortKey, favorites);
      let result: number;
      if (typeof av === "number" && typeof bv === "number") result = av - bv;
      else if (typeof av === "boolean" && typeof bv === "boolean") result = Number(av) - Number(bv);
      else result = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
      return sortDirection === "asc" ? result : -result;
    });
    return filtered;
  }, [catalog, showHidden, visibleStoreIds, activeListId, favorites, activeList, activeListKeys, compiledQuery, sortKey, sortDirection]);
  const hiddenCount = catalog.length - catalog.filter((item) => hasMeaningfulAttributes(item)).length;
  const clusters = useMemo(() => clusterProducts(products, Number(clusterThreshold) || 0.55), [products, clusterThreshold]);
  const prices = useMemo(() => priceIndex(clusters), [clusters]);
  const deals = useMemo(() => dealCandidates(clusters, Number(dealThreshold) || 0.75), [clusters, dealThreshold]);
  const tabs: Array<[TabId, string]> = [["browse", "Browse"], ["overview", "Overview"], ["stores", "Stores"], ["sync", "Sync"], ["mutations", "Product edits"], ["secrets", "Secrets"], ["events", "Events"], ["analysis", "Analysis"], ["files", "Files"]];

  function setToken(next: string) {
    setTokenState(next);
    localStorage.setItem(TOKEN_STORAGE_KEY, next);
  }

  function clearToken() {
    setTokenState("");
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  async function run<T>(label: string, task: () => Promise<T>): Promise<T | undefined> {
    if (!target) { setNotice({ kind: "error", text: "Repository must be owner/name." }); return; }
    if (!octokit) { setNotice({ kind: "error", text: "Paste a GitHub token first." }); return; }
    setBusy(true); setNotice({ kind: "info", text: label });
    try {
      const result = await task();
      setNotice({ kind: "success", text: typeof result === "string" ? result : `${label}: done.` });
      return result;
    } catch (error) {
      setNotice({ kind: "error", text: `${label}: ${(error as Error).message}` });
      return undefined;
    } finally { setBusy(false); }
  }

  async function refreshAll() {
    await run("Refreshing repository", async () => {
      if (!octokit || !target) return;
      const [login, nextConfig, nextMainFiles] = await Promise.all([getAuthenticatedUser(octokit), loadConfig(octokit, target), listFiles(octokit, target)]);
      setAuthUser(login);
      setConfig(nextConfig);
      setDraftStores(nextConfig.stores.map((store) => ({ ...store, webhooks: [...(store.webhooks ?? [])] })));
      setSelectedStoreId((current) => current || nextConfig.stores[0]?.id || "");
      setStoreFilter((current) => current.filter((id) => nextConfig.stores.some((store) => store.id === id)));
      setMainFiles(nextMainFiles);
      const [branches, nextSecrets] = await Promise.all([listBranches(octokit, target, nextConfig.storeBranchPrefix), listRepoSecrets(octokit, target).catch(() => [])]);
      setStoreBranches(branches);
      setSecrets(nextSecrets);
      const nextStoreFiles: Record<string, TreeFile[]> = {};
      const nextManifests: Record<string, StoreManifest | null> = {};
      const nextProductIndexes: Record<string, ProductStateIndex | null> = {};
      const nextEventIndexes: Record<string, StoreEventIndex | null> = {};
      for (const store of nextConfig.stores) {
        const ref = storeBranch(nextConfig, store.id);
        try {
          const files = await listFiles(octokit, target, ref);
          nextStoreFiles[store.id] = files;
          nextManifests[store.id] = await loadJsonFromBranch<StoreManifest>(octokit, target, ref, "store.json");
          nextProductIndexes[store.id] = await loadJsonFromBranch<ProductStateIndex>(octokit, target, ref, "state/products.index.json");
          nextEventIndexes[store.id] = await loadJsonFromBranch<StoreEventIndex>(octokit, target, ref, "state/events.index.json");
        } catch {
          nextStoreFiles[store.id] = [];
          nextManifests[store.id] = null;
          nextProductIndexes[store.id] = null;
          nextEventIndexes[store.id] = null;
        }
      }
      setStoreFiles(nextStoreFiles);
      setManifests(nextManifests);
      setProductIndexes(nextProductIndexes);
      setEventIndexes(nextEventIndexes);
    });
  }

  async function saveStores() {
    await run("Saving store config", async () => {
      if (!octokit || !target || !config) return;
      const cleaned = draftStores.map((store) => cleanStore(store, config)).filter((store) => store.id);
      const nextConfig = { ...config, stores: cleaned };
      await writeJsonFile(octokit, target, { path: CONFIG_PATH, value: nextConfig, message: "chore(config): update Ecwid stores" });
      setConfig(nextConfig);
      setDraftStores(cleaned);
    });
  }

  async function saveSecret(name = secretName, value = secretValue) {
    await run(`Saving secret ${name}`, async () => {
      if (!octokit || !target) return;
      await setRepoSecret(octokit, target, name, value);
      setSecretValue("");
      setSecrets(await listRepoSecrets(octokit, target));
    });
  }

  async function removeSecret(name: string) {
    await run(`Deleting ${name}`, async () => {
      if (!octokit || !target) return;
      await deleteRepoSecret(octokit, target, name);
      setSecrets(await listRepoSecrets(octokit, target));
    });
  }

  async function dispatchStoreSync(storeId?: string, force = true) {
    await run("Dispatching sync workflow", async () => {
      if (!octokit || !target) return;
      await dispatchWorkflow(octokit, target, SYNC_WORKFLOW_ID, { store_id: storeId ?? "", force });
    });
  }

  async function syncStoreInBrowser(store: StoreConfig) {
    await run(`Browser-syncing ${store.id}`, async () => {
      if (!octokit || !target || !config) return;
      const result = await browserSyncStore(octokit, target, config, store, { ecwidToken: manualTokens[store.id] ?? "", maxProducts: syncMaxProducts ? Number(syncMaxProducts) : undefined }, (message) => setNotice({ kind: "info", text: message }));
      setNotice({ kind: "success", text: `Synced ${store.id}: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted. Commit ${result.commitSha.slice(0, 12)}.` });
      await refreshAll();
    });
  }

  async function loadProductFile(storeId: string, filePath: string, setAsDetail?: CatalogProduct) {
    await run("Loading product JSON", async () => {
      if (!octokit || !target || !config) return;
      const text = await readBlobTextByPath(octokit, target, filePath, storeBranch(config, storeId));
      const product = parseJsonObject<Record<string, unknown>>(text, filePath);
      setSelectedJson(product);
      if (setAsDetail) setDetail((current) => ({ ...(current?.item.key === setAsDetail.key ? current : { item: setAsDetail }), product }));
      return product;
    });
  }

  async function loadEventFile(storeId: string, filePath: string) {
    await run("Loading event stream", async () => {
      if (!octokit || !target || !config) return;
      const text = await readBlobTextByPath(octokit, target, filePath, storeBranch(config, storeId));
      const parsed = text.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as ProductEvent);
      setEvents(parsed);
      setSelectedJson(parsed);
    });
  }

  async function openProductDetail(item: CatalogProduct) {
    setDetail({ item, matches: similarProducts(item, catalog) });
    setTab("browse");
    await loadProductFile(item.storeId, item.path, item);
  }

  async function loadProductHistory(item: CatalogProduct) {
    await run("Loading product history", async () => {
      if (!octokit || !target || !config) return;
      const index = eventIndexes[item.storeId];
      if (!index) throw new Error("No event index loaded for this store.");
      const matches: ProductEvent[] = [];
      const files = [...index.files].reverse();
      for (const file of files) {
        const text = await readBlobTextByPath(octokit, target, file.path, storeBranch(config, item.storeId));
        for (const line of text.trim().split("\n").filter(Boolean)) {
          const event = JSON.parse(line) as ProductEvent;
          if (event.productId === item.productId) matches.push(event);
        }
      }
      matches.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
      setDetail((current) => current && current.item.key === item.key ? { ...current, history: matches, historySummary: summarizeHistory(matches) } : current);
      return `Loaded ${matches.length} product history events.`;
    });
  }

  async function prepareProductEdit(record: ProductStateIndexRecord, storeId = selectedStore?.id) {
    await run("Preparing product edit", async () => {
      if (!octokit || !target || !config || !storeId) return;
      const text = await readBlobTextByPath(octokit, target, record.path, storeBranch(config, storeId));
      setMutationOp("upsert");
      setMutationProductId(record.productId);
      setMutationJson(JSON.stringify(JSON.parse(text), null, 2));
      setSelectedStoreId(storeId);
      setTab("mutations");
    });
  }

  function prepareProductDelete(record: ProductStateIndexRecord, storeId = selectedStore?.id) {
    setMutationOp("delete");
    setMutationProductId(record.productId);
    setMutationJson("{}");
    if (storeId) setSelectedStoreId(storeId);
    setTab("mutations");
  }

  function selectedMutationRecord(productId: string) {
    return selectedRecord(selectedProductIndex, productId);
  }

  function buildProductMutationRequest(store: StoreConfig): ProductMutationBatch {
    const requestedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const stamp = requestedAt.replaceAll(/[-:]/g, "").replace("T", "-").replace("Z", "Z");
    const requestId = `${safePathSegment(store.id)}-${stamp}-${mutationOp}`;
    const baseProductsHash = selectedProductIndex?.productsHash ?? manifests[store.id]?.productsHash;
    if (mutationOp === "delete") {
      const productId = mutationProductId.trim();
      if (!productId) throw new Error("Product ID is required for delete.");
      const record = selectedMutationRecord(productId);
      return { schemaVersion: 1, kind: "ecwid-product-mutation-batch", source: "web-ui", requestId, storeId: store.id, requestedAt, requestedBy: authUser || undefined, baseProductsHash, allowOutdatedBase: mutationAllowOutdatedBase, note: mutationNote.trim() || undefined, operations: [{ op: "delete", productId, expectHash: record?.hash }] };
    }
    const product = parseJsonObject<Record<string, unknown>>(mutationJson, "product JSON");
    if (product === null || typeof product !== "object" || Array.isArray(product)) throw new Error("Product JSON must be an object.");
    const productId = safeProductId(product.id);
    if (!productId) throw new Error("Product JSON must contain string/number id.");
    const record = selectedMutationRecord(productId);
    return { schemaVersion: 1, kind: "ecwid-product-mutation-batch", source: "web-ui", requestId, storeId: store.id, requestedAt, requestedBy: authUser || undefined, baseProductsHash, allowOutdatedBase: mutationAllowOutdatedBase, note: mutationNote.trim() || undefined, operations: [{ op: "upsert", productId, product, expectHash: record?.hash }] };
  }

  async function submitProductMutation(mode: "dispatch" | "pr") {
    await run(mode === "pr" ? "Opening product mutation PR" : "Dispatching product mutation workflow", async () => {
      if (!octokit || !target || !selectedStore || !config) return;
      const request = buildProductMutationRequest(selectedStore);
      const requestBranch = `product-mutations/${safePathSegment(request.storeId)}/${safePathSegment(request.requestId)}`;
      const requestPath = `product-mutations/${safePathSegment(request.storeId)}/${safePathSegment(request.requestId)}.json`;
      await createBranchFrom(octokit, target, requestBranch, target.branch);
      await writeJsonFile(octokit, target, { branch: requestBranch, path: requestPath, value: request, message: `products(ecwid:${request.storeId}): request ${mutationOp} ${request.operations[0]?.productId ?? "product"}` });
      if (mode === "pr") {
        const pr = await createPullRequest(octokit, target, { head: requestBranch, title: `products(ecwid:${request.storeId}): ${mutationOp} ${request.operations[0]?.productId ?? "product"}`, body: `Product mutation request written to \`${requestPath}\`. Merge this PR to let the product-mutations workflow apply it to \`${storeBranch(config, request.storeId)}\`.` });
        return `Opened PR #${pr.number}: ${pr.htmlUrl}`;
      }
      await dispatchWorkflow(octokit, target, PRODUCT_MUTATION_WORKFLOW_ID, { request_ref: requestBranch, request_path: requestPath, push: true }, target.branch);
      return `Committed ${requestPath} on ${requestBranch} and dispatched ${PRODUCT_MUTATION_WORKFLOW_ID}.`;
    });
  }

  async function loadAllProductsFromState() {
    await run("Loading resolved state snapshots", async () => {
      if (!octokit || !target || !config) return;
      const loaded: LoadedProduct[] = [];
      for (const store of config.stores) loaded.push(...await loadStoreStateProducts(octokit, target, storeBranch(config, store.id)));
      setProducts(loaded.filter((item) => hasMeaningfulAttributes({ summary: item.summary, product: item.product })));
    });
  }

  async function persistAnalysis() {
    await run("Persisting analysis snapshot", async () => {
      if (!octokit || !target) return;
      const snapshot = buildAnalysisSnapshot(products, clusters, Number(dealThreshold) || 0.75);
      setAnalysisSnapshot(snapshot);
      const stamp = snapshot.generatedAt.replaceAll(/[-:]/g, "").replace("T", "-").replace("Z", "Z");
      await writeJsonFile(octokit, target, { path: "analysis/cross-store/latest.json", value: snapshot, message: "analysis: update cross-store product snapshot" });
      await writeJsonFile(octokit, target, { path: `analysis/cross-store/${stamp}.json`, value: snapshot, message: "analysis: persist cross-store product snapshot" });
    });
  }

  function toggleStoreFilter(storeId: string) {
    setStoreFilter((current) => current.includes(storeId) ? current.filter((id) => id !== storeId) : [...current, storeId]);
  }

  function toggleFavorite(key: string) {
    setLocalState((state) => ({ ...state, favorites: state.favorites.includes(key) ? state.favorites.filter((item) => item !== key) : [...state.favorites, key] }));
  }

  function createList() {
    const name = newListName.trim();
    if (!name) return;
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const list = { id: makeListId(name), name, productKeys: [], createdAt: now, updatedAt: now };
    setLocalState((state) => ({ ...state, lists: [...state.lists, list] }));
    setActiveListId(list.id);
    setNewListName("");
  }

  function deleteList(id: string) {
    setLocalState((state) => ({ ...state, lists: state.lists.filter((list) => list.id !== id) }));
    if (activeListId === id) setActiveListId("all");
  }

  function setProductInList(listId: string, key: string, enabled: boolean) {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    setLocalState((state) => ({
      ...state,
      lists: state.lists.map((list) => {
        if (list.id !== listId) return list;
        const productKeys = enabled ? [...new Set([...list.productKeys, key])] : list.productKeys.filter((item) => item !== key);
        return { ...list, productKeys, updatedAt: now };
      })
    }));
  }

  function toggleColumn(column: TableColumn) {
    setVisibleColumns((columns) => columns.includes(column) ? columns.filter((item) => item !== column) : [...columns, column]);
  }

  function setSort(next: SortKey) {
    if (sortKey === next) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    else { setSortKey(next); setSortDirection("asc"); }
  }

  function productActions(item: CatalogProduct) {
    const record = selectedRecord(productIndexes[item.storeId], item.productId);
    return <div className="inline-actions">
      <button onClick={() => toggleFavorite(item.key)}>{favorites.has(item.key) ? "★" : "☆"}</button>
      <button onClick={() => openProductDetail(item)}>Details</button>
      {record ? <button onClick={() => prepareProductEdit(record, item.storeId)}>Edit</button> : null}
      {record ? <button className="danger" onClick={() => prepareProductDelete(record, item.storeId)}>Delete</button> : null}
    </div>;
  }

  function productCard(item: CatalogProduct) {
    const price = productPrice(item.summary);
    const url = productUrl(item.summary, item.product, item.storeUrl);
    return <article className="product-card" key={item.key}>
      <button className={`favorite ${favorites.has(item.key) ? "active" : ""}`} onClick={() => toggleFavorite(item.key)} aria-label="Toggle favorite">{favorites.has(item.key) ? "★" : "☆"}</button>
      <button className="image-button" onClick={() => openProductDetail(item)}><ProductImage item={item} /></button>
      <div className="product-card-body">
        <div className="product-store">{item.storeName}</div>
        <button className="product-title" onClick={() => openProductDetail(item)}>{productName(item.summary)}</button>
        <div className="product-meta"><span>{formatPrice(price)}</span><span>{stockLabel(item.summary)}</span></div>
        <div className="product-subline">{item.summary.sku || categoryText(item.summary) || item.productId}</div>
        <div className="product-card-actions">{url ? <a href={url} target="_blank" rel="noreferrer">Open shop</a> : null}<button onClick={() => openProductDetail(item)}>Inspect</button></div>
      </div>
    </article>;
  }

  function productListRow(item: CatalogProduct) {
    const url = productUrl(item.summary, item.product, item.storeUrl);
    return <article className="product-list-row" key={item.key}>
      <button className="image-button compact" onClick={() => openProductDetail(item)}><ProductImage item={item} /></button>
      <div>
        <div className="product-store">{item.storeName}</div>
        <button className="product-title" onClick={() => openProductDetail(item)}>{productName(item.summary)}</button>
        <div className="product-subline">{item.summary.sku ? `SKU ${item.summary.sku}` : item.productId} · {categoryText(item.summary) || "uncategorized"}</div>
      </div>
      <div className="list-price"><b>{formatPrice(productPrice(item.summary))}</b><span>{stockLabel(item.summary)}</span></div>
      <div className="inline-actions">{url ? <a href={url} target="_blank" rel="noreferrer">Shop</a> : null}{productActions(item)}</div>
    </article>;
  }

  function productTableCell(column: TableColumn, item: CatalogProduct) {
    const url = productUrl(item.summary, item.product, item.storeUrl);
    if (column === "image") return <td><button className="table-image" onClick={() => openProductDetail(item)}><ProductImage item={item} /></button></td>;
    if (column === "store") return <td>{item.storeName}<br/><span>{item.storeId}</span></td>;
    if (column === "name") return <td><button className="link-button" onClick={() => openProductDetail(item)}>{productName(item.summary)}</button>{url ? <><br/><a href={url} target="_blank" rel="noreferrer">Original webshop</a></> : null}</td>;
    if (column === "sku") return <td>{item.summary.sku ?? "—"}</td>;
    if (column === "price") return <td>{formatPrice(productPrice(item.summary))}</td>;
    if (column === "stock") return <td>{stockLabel(item.summary)}</td>;
    if (column === "category") return <td>{categoryText(item.summary) || "—"}</td>;
    if (column === "id") return <td><code>{item.productId}</code></td>;
    if (column === "hash") return <td><code>{item.hash.slice(0, 12)}</code></td>;
    return <td>{productActions(item)}</td>;
  }

  const catalogueStats = {
    stores: new Set(catalog.map((item) => item.storeId)).size,
    visible: filteredCatalog.length,
    total: catalog.length,
    hidden: hiddenCount,
    favorites: localState.favorites.length,
    lists: localState.lists.length
  };

  return <>
    <header className="app-shell-header">
      <div>
        <p className="eyebrow">Ecwid Product Git Watch</p>
        <h1>Catalogue console</h1>
      </div>
      <div className="header-metrics"><span>{catalogueStats.visible} visible</span><span>{catalogueStats.stores} stores</span><span>{catalogueStats.favorites} favorites</span></div>
    </header>

    <section className="connection-panel">
      <Field label="Repository" value={repository} onChange={setRepository} placeholder="owner/name" />
      <Field label="Main branch" value={branch} onChange={setBranch} />
      <Field label="GitHub token" value={token} onChange={setToken} type="password" help="Stored in localStorage for reload-safe browsing. Use Clear token on shared machines." />
      <div className="connection-actions"><button disabled={busy} onClick={refreshAll}>Refresh</button><button onClick={clearToken}>Clear token</button>{authUser ? <span className="muted">@{authUser}</span> : null}</div>
    </section>

    <nav className="tabs">{tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}</nav>
    <NoticeBar notice={notice} />

    {tab === "browse" && <div className="catalogue-layout">
      <aside className="catalogue-sidebar">
        <Section title="Filters" className="compact-panel">
          <TextField label="Query" value={query} onChange={setQuery} rows={4} placeholder={'price >= 20 && (name *= "hoodie" || sku ^= HOOD) && name ~= /cotton/i'} help="Full-text for plain text. Expression mode supports &&, ||, !, arithmetic, comparison, pattern operators and regex literals." />
          {compiledQuery.error ? <div className="query-error">{compiledQuery.error}</div> : <div className="query-hint">{compiledQuery.isSimpleText ? "full-text mode" : "expression mode"}</div>}
          <div className="segmented"><button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}>Grid</button><button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}>List</button><button className={viewMode === "table" ? "active" : ""} onClick={() => setViewMode("table")}>Table</button></div>
          <div className="grid two"><label className="field"><span>Sort by</span><select value={sortKey} onChange={(event) => setSortKey(event.currentTarget.value as SortKey)}><option value="name">Name</option><option value="store">Store</option><option value="price">Price</option><option value="sku">SKU</option><option value="stock">Stock</option><option value="category">Category</option><option value="id">ID</option><option value="favorite">Favorite</option></select></label><label className="field"><span>Direction</span><select value={sortDirection} onChange={(event) => setSortDirection(event.currentTarget.value as "asc" | "desc")}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label></div>
          <label className="check-row"><input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.currentTarget.checked)} /> show disabled / attribute-less products ({hiddenCount})</label>
          <h3>Stores</h3>
          <div className="store-filter-list">{config?.stores.map((store) => <button key={store.id} className={!storeFilter.length || storeFilter.includes(store.id) ? "selected" : ""} onClick={() => toggleStoreFilter(store.id)}><span>{store.name ?? store.id}</span><small>{productIndexes[store.id]?.records.length ?? 0}</small></button>)}</div>
          <div className="button-row"><button onClick={() => setStoreFilter([])}>All stores</button><button onClick={() => setStoreFilter(config?.stores.map((store) => store.id) ?? [])}>Select all</button></div>
        </Section>

        <Section title="Local lists" description="Stored in IndexedDB only." className="compact-panel">
          <div className="list-filter"><button className={activeListId === "all" ? "active" : ""} onClick={() => setActiveListId("all")}>All products</button><button className={activeListId === "favorites" ? "active" : ""} onClick={() => setActiveListId("favorites")}>Favorites <span>{localState.favorites.length}</span></button>{localState.lists.map((list) => <button key={list.id} className={activeListId === list.id ? "active" : ""} onClick={() => setActiveListId(list.id)}>{list.name}<span>{list.productKeys.length}</span></button>)}</div>
          <div className="new-list"><input value={newListName} onChange={(event) => setNewListName(event.currentTarget.value)} placeholder="New list name" /><button onClick={createList}>Create</button></div>
          {activeList ? <button className="danger" onClick={() => deleteList(activeList.id)}>Delete current list</button> : null}
        </Section>

        {viewMode === "table" ? <Section title="Columns" className="compact-panel"><div className="column-picker">{TABLE_COLUMNS.map(([id, label]) => <label key={id}><input type="checkbox" checked={visibleColumns.includes(id)} onChange={() => toggleColumn(id)} /> {label}</label>)}</div></Section> : null}
      </aside>

      <main className="catalogue-main">
        <div className="catalogue-topbar"><div><b>{filteredCatalog.length}</b><span>products after filters</span></div><div><b>{catalog.length}</b><span>indexed total</span></div><div><b>{catalogueStats.hidden}</b><span>hidden by default</span></div></div>
        {viewMode === "grid" ? <div className="product-grid">{filteredCatalog.slice(0, 1200).map(productCard)}</div> : null}
        {viewMode === "list" ? <div className="product-list">{filteredCatalog.slice(0, 1200).map(productListRow)}</div> : null}
        {viewMode === "table" ? <div className="table-wrap"><table className="product-table"><thead><tr>{visibleColumns.map((column) => <th key={column}>{["store", "name", "sku", "price", "stock", "category", "id"].includes(column) ? <button className="table-sort" onClick={() => setSort(column === "id" ? "id" : column as SortKey)}>{TABLE_COLUMNS.find(([id]) => id === column)?.[1]} {sortKey === column ? (sortDirection === "asc" ? "↑" : "↓") : ""}</button> : TABLE_COLUMNS.find(([id]) => id === column)?.[1]}</th>)}</tr></thead><tbody>{filteredCatalog.slice(0, 1500).map((item) => <tr key={item.key}>{visibleColumns.map((column) => productTableCell(column, item))}</tr>)}</tbody></table></div> : null}
      </main>

      <aside className="detail-panel">
        {detail ? <>
          <div className="detail-media"><ProductImage item={detail.item} product={detail.product} /></div>
          <div className="detail-head"><div><p className="product-store">{detail.item.storeName}</p><h2>{productName(detail.item.summary, detail.product)}</h2><p>{formatPrice(productPrice(detail.item.summary, detail.product))} · {stockLabel(detail.item.summary)}</p></div><button className={`favorite ${favorites.has(detail.item.key) ? "active" : ""}`} onClick={() => toggleFavorite(detail.item.key)}>{favorites.has(detail.item.key) ? "★" : "☆"}</button></div>
          <div className="detail-actions">{productUrl(detail.item.summary, detail.product, detail.item.storeUrl) ? <a className="button-link" href={productUrl(detail.item.summary, detail.product, detail.item.storeUrl)} target="_blank" rel="noreferrer">Open original webshop</a> : null}<button onClick={() => loadProductHistory(detail.item)}>Load history</button>{selectedRecord(productIndexes[detail.item.storeId], detail.item.productId) ? <button onClick={() => prepareProductEdit(selectedRecord(productIndexes[detail.item.storeId], detail.item.productId)!, detail.item.storeId)}>Edit</button> : null}</div>
          <dl className="detail-kv"><dt>Product ID</dt><dd><code>{detail.item.productId}</code></dd><dt>SKU</dt><dd>{detail.item.summary.sku ?? "—"}</dd><dt>Categories</dt><dd>{categoryText(detail.item.summary) || "—"}</dd><dt>Hash</dt><dd><code>{detail.item.hash}</code></dd><dt>File</dt><dd><code>{detail.item.path}</code></dd></dl>
          <h3>Lists</h3>
          <div className="detail-lists">{localState.lists.length ? localState.lists.map((list) => <label key={list.id}><input type="checkbox" checked={includesListProduct(list.productKeys, detail.item.key)} onChange={(event) => setProductInList(list.id, detail.item.key, event.currentTarget.checked)} /> {list.name}</label>) : <p className="muted">Create a list to organize this product.</p>}</div>
          <h3>Other stores / likely same product</h3>
          <div className="match-list">{(detail.matches ?? similarProducts(detail.item, catalog)).slice(0, 12).map((match) => <button key={match.key} onClick={() => openProductDetail(match)}><span>{productName(match.summary)}</span><small>{match.storeName} · {(match.matchScore * 100).toFixed(0)}% · {formatPrice(productPrice(match.summary))}</small></button>)}</div>
          <h3>History</h3>
          {detail.historySummary ? <div className="history-summary"><span>Added: {detail.historySummary.createdAt ?? "unknown"}</span><span>Last edit: {detail.historySummary.lastEditedAt ?? "none"}</span><span>Edits: {detail.historySummary.editCount}</span></div> : <p className="muted">Load history to scan event files for this product.</p>}
          {detail.history ? <div className="history-list">{detail.history.map((event) => <details key={event.eventId}><summary>{event.observedAt} · {event.eventType}{event.path ? ` · ${event.path}` : ""}</summary><JsonBlock value={event} /></details>)}</div> : null}
          <h3>Product JSON</h3>{detail.product ? <JsonBlock value={detail.product} /> : <p className="muted">Product JSON loads on demand.</p>}
        </> : <div className="empty-detail"><h2>Select a product</h2><p>Open details to inspect raw JSON, history, cross-store matches, original webshop links, favorites and lists.</p></div>}
      </aside>
    </div>}

    {tab === "overview" && <Section title="Overview" description="Current config, store branches, resolved state indexes, and latest sync metadata.">
      <div className="cards"><div className="card"><b>{config?.stores.length ?? 0}</b><span>configured stores</span></div><div className="card"><b>{storeBranches.length}</b><span>store branches</span></div><div className="card"><b>{Object.values(productIndexes).reduce((sum, index) => sum + (index?.productCount ?? 0), 0)}</b><span>indexed products</span></div><div className="card"><b>{Object.values(eventIndexes).reduce((sum, index) => sum + (index?.totalEvents ?? 0), 0)}</b><span>indexed events</span></div></div>
      <table><thead><tr><th>Store</th><th>Branch</th><th>Interval</th><th>Products</th><th>Events</th><th>Last sync</th><th>Next due</th><th>Action</th></tr></thead><tbody>{config?.stores.map((store) => <tr key={store.id}><td>{store.url ? <a href={store.url} target="_blank" rel="noreferrer">{store.name ?? store.id}</a> : store.name ?? store.id}<br/><span>{store.id}</span></td><td><code>{storeBranch(config, store.id)}</code></td><td>{store.syncIntervalMinutes ?? config.defaultSyncIntervalMinutes} min</td><td>{productIndexes[store.id]?.productCount ?? manifests[store.id]?.productCount ?? "—"}</td><td>{eventIndexes[store.id]?.totalEvents ?? "—"}</td><td>{manifests[store.id]?.lastSyncedAt ?? "—"}</td><td>{manifests[store.id]?.nextSyncNotBefore ?? "—"}</td><td><button onClick={() => { setSelectedStoreId(store.id); setTab("sync"); }}>Sync</button></td></tr>)}</tbody></table>
    </Section>}

    {tab === "stores" && <Section title="Stores" description="Add stores, edit intervals, configure webhooks, then save config/ecwid-stores.json." right={<button className="primary" onClick={saveStores} disabled={busy || !config}>Save stores</button>}>
      <div className="button-row"><button onClick={() => setDraftStores([...draftStores, emptyStore()])}>Add store</button><button onClick={() => config && setDraftStores(config.stores)}>Reset draft</button></div>
      <div className="stack">{draftStores.map((store, index) => <div className="store-editor" key={`${store.id}-${index}`}>
        <div className="store-editor-grid"><Field label="Store ID" value={store.id} onChange={(value) => setDraftStores(updateStore(draftStores, index, { id: value, tokenEnv: normalizeSecretName(value) }))} /><Field label="Name" value={store.name ?? ""} onChange={(value) => setDraftStores(updateStore(draftStores, index, { name: value }))} /><Field label="URL" value={store.url ?? ""} onChange={(value) => setDraftStores(updateStore(draftStores, index, { url: value }))} /><Field label="Token env" value={store.tokenEnv ?? ""} onChange={(value) => setDraftStores(updateStore(draftStores, index, { tokenEnv: value }))} /><Field label="Interval minutes" type="number" value={String(store.syncIntervalMinutes ?? 30)} onChange={(value) => setDraftStores(updateStore(draftStores, index, { syncIntervalMinutes: Number(value) }))} /><Field label="Limit" type="number" value={String(store.limit ?? 200)} onChange={(value) => setDraftStores(updateStore(draftStores, index, { limit: Number(value) }))} /><Field label="Request delay ms" type="number" value={String(store.requestDelayMs ?? 100)} onChange={(value) => setDraftStores(updateStore(draftStores, index, { requestDelayMs: Number(value) }))} /></div>
        <label className="check-row"><input type="checkbox" checked={store.enabled !== false} onChange={(event) => setDraftStores(updateStore(draftStores, index, { enabled: event.currentTarget.checked }))} /> enabled</label>
        <div className="button-row"><button className="danger" onClick={() => setDraftStores(draftStores.filter((_, i) => i !== index))}>Remove store</button>{store.id ? <button onClick={() => { setSelectedStoreId(store.id); setTab("sync"); }}>Open sync</button> : null}</div>
        <h3>Webhooks</h3>
        {(store.webhooks ?? []).map((hook, hookIndex) => <div className="webhook-editor" key={`${hook.id}-${hookIndex}`}><div className="store-editor-grid"><Field label="Webhook ID" value={hook.id} onChange={(value) => setDraftStores(updateWebhook(draftStores, index, hookIndex, { id: value }))} /><Field label="URL" value={hook.url} onChange={(value) => setDraftStores(updateWebhook(draftStores, index, hookIndex, { url: value }))} /><Field label="Events" value={(hook.events ?? ["*"]).join(",")} onChange={(value) => setDraftStores(updateWebhook(draftStores, index, hookIndex, { events: parseWebhookEvents(value) }))} /></div><label className="check-row"><input type="checkbox" checked={hook.enabled !== false} onChange={(event) => setDraftStores(updateWebhook(draftStores, index, hookIndex, { enabled: event.currentTarget.checked }))} /> webhook enabled</label><button className="danger" onClick={() => setDraftStores(draftStores.map((s, i) => i === index ? { ...s, webhooks: (s.webhooks ?? []).filter((_, h) => h !== hookIndex) } : s))}>Remove webhook</button></div>)}
        <button onClick={() => setDraftStores(updateStore(draftStores, index, { webhooks: [...(store.webhooks ?? []), { id: "", url: "", enabled: true, events: ["*"] }] }))}>Add webhook</button>
      </div>)}</div>
    </Section>}

    {tab === "secrets" && <Section title="Secrets" description="Create or rotate repository secrets used by GitHub Actions." right={<button onClick={() => saveSecret()} disabled={busy || !secretName || !secretValue}>Save secret</button>}>
      <div className="grid three"><Field label="Secret name" value={secretName} onChange={setSecretName} placeholder="ECWID_99490018_TOKEN" /><Field label="Secret value" value={secretValue} onChange={setSecretValue} type="password" /><TextField label="Token JSON" value={tokensJson} onChange={setTokensJson} help="Optional ECWID_STORE_TOKENS_JSON fallback." /></div><button onClick={() => saveSecret("ECWID_STORE_TOKENS_JSON", tokensJson)}>Save token JSON secret</button>
      <table><thead><tr><th>Name</th><th>Updated</th><th></th></tr></thead><tbody>{secrets.map((secret) => <tr key={secret.name}><td><code>{secret.name}</code></td><td>{secret.updated_at ?? "—"}</td><td><button className="danger" onClick={() => removeSecret(secret.name)}>Delete</button></td></tr>)}</tbody></table>
    </Section>}

    {tab === "sync" && <Section title="Sync" description="Prefer GitHub Actions for full syncs. Browser sync remains useful for one-off manual syncs.">
      <div className="toolbar"><select value={selectedStore?.id ?? ""} onChange={(event) => setSelectedStoreId(event.currentTarget.value)}>{config?.stores.map((store) => <option key={store.id} value={store.id}>{store.name ?? store.id}</option>)}</select><span className="pill">branch: <code>{selectedBranch || "—"}</code></span><span className="pill">products: {selectedProductIndex?.productCount ?? "—"}</span></div>
      <div className="grid three"><Field label="Ecwid token for browser sync" type="password" value={selectedStore ? manualTokens[selectedStore.id] ?? "" : ""} onChange={(value) => selectedStore && setManualTokens({ ...manualTokens, [selectedStore.id]: value })} /><Field label="Max products" value={syncMaxProducts} onChange={setSyncMaxProducts} placeholder="optional" /><div className="button-row"><button className="primary" disabled={!selectedStore || busy} onClick={() => selectedStore && syncStoreInBrowser(selectedStore)}>Run browser sync</button><button disabled={!selectedStore || busy} onClick={() => selectedStore && dispatchStoreSync(selectedStore.id, true)}>Dispatch Actions sync</button></div></div>
      {selectedStore ? <JsonBlock value={{ store: selectedStore, branch: selectedBranch, manifest: manifests[selectedStore.id], productIndex: productIndexes[selectedStore.id] ? { productCount: productIndexes[selectedStore.id]?.productCount, shards: productIndexes[selectedStore.id]?.shards.length } : null, eventIndex: eventIndexes[selectedStore.id] }} /> : null}
    </Section>}

    {tab === "mutations" && <Section title="Product edits" description="Create one product mutation JSON file. GitHub Actions expands it into product files, state indexes, and event streams on the store branch.">
      <div className="toolbar"><select value={selectedStore?.id ?? ""} onChange={(event) => setSelectedStoreId(event.currentTarget.value)}>{config?.stores.map((store) => <option key={store.id} value={store.id}>{store.name ?? store.id}</option>)}</select><span className="pill">branch: <code>{selectedBranch || "—"}</code></span><span className="pill">base: <code>{selectedProductIndex?.productsHash?.slice(0, 12) ?? manifests[selectedStore?.id ?? ""]?.productsHash?.slice(0, 12) ?? "—"}</code></span></div>
      <div className="grid three"><label className="field"><span>Operation</span><select value={mutationOp} onChange={(event) => setMutationOp(event.currentTarget.value as "upsert" | "delete")}><option value="upsert">add/update product</option><option value="delete">delete product</option></select></label><Field label="Product ID" value={mutationProductId} onChange={setMutationProductId} /><label className="check-row"><input type="checkbox" checked={mutationAllowOutdatedBase} onChange={(event) => setMutationAllowOutdatedBase(event.currentTarget.checked)} /> allow outdated base hash</label></div>
      {mutationOp === "upsert" ? <TextField label="Product JSON" value={mutationJson} onChange={setMutationJson} rows={12} /> : <JsonBlock value={{ deleteProductId: mutationProductId || "<product id>", expectHash: selectedMutationRecord(mutationProductId)?.hash ?? "not found in loaded index" }} />}
      <TextField label="Note" value={mutationNote} onChange={setMutationNote} help="Optional context stored in the single mutation request file." />
      <div className="button-row"><button className="primary" disabled={!selectedStore || busy} onClick={() => submitProductMutation("dispatch")}>Commit request + run workflow</button><button disabled={!selectedStore || busy} onClick={() => submitProductMutation("pr")}>Open review PR</button></div>
      <JsonBlock value={{ requestFile: selectedStore ? `product-mutations/${safePathSegment(selectedStore.id)}/<request-id>.json` : null, workflow: PRODUCT_MUTATION_WORKFLOW_ID }} />
    </Section>}

    {tab === "events" && <Section title="Events" description="Browse event streams through persisted event indexes.">
      <div className="toolbar"><select value={selectedStore?.id ?? ""} onChange={(event) => setSelectedStoreId(event.currentTarget.value)}>{config?.stores.map((store) => <option key={store.id} value={store.id}>{store.name ?? store.id}</option>)}</select><span className="pill">{selectedEventIndex?.files.length ?? 0} files</span><span className="pill">{selectedEventIndex?.totalEvents ?? 0} events</span></div>
      <JsonBlock value={selectedEventIndex?.eventTypes ?? {}} />
      <table><thead><tr><th>Event file</th><th>Count</th><th>First</th><th>Last</th><th></th></tr></thead><tbody>{selectedEventIndex?.files.slice().reverse().slice(0, 500).map((file) => <tr key={file.path}><td><code>{file.path}</code></td><td>{file.count}</td><td>{file.firstObservedAt}</td><td>{file.lastObservedAt}</td><td><button onClick={() => selectedStore && loadEventFile(selectedStore.id, file.path)}>Load</button></td></tr>)}</tbody></table>
      {events.length ? <><h3>Loaded stream summary</h3><JsonBlock value={eventCounts(events)} /><JsonBlock value={events.slice(0, 100)} /></> : null}
    </Section>}

    {tab === "analysis" && <Section title="Advanced analysis" description="Loads resolved state shards, clusters similar products across stores, computes store price indexes, and surfaces likely favorable offers.">
      <div className="button-row"><button className="primary" onClick={loadAllProductsFromState}>Load all state snapshots</button><Field label="Cluster threshold" value={clusterThreshold} onChange={setClusterThreshold} /><Field label="Deal threshold" value={dealThreshold} onChange={setDealThreshold} /><button disabled={!products.length} onClick={persistAnalysis}>Persist analysis snapshot</button></div>
      <div className="cards"><div className="card"><b>{products.length}</b><span>loaded products</span></div><div className="card"><b>{clusters.length}</b><span>clusters</span></div><div className="card"><b>{clusters.filter((c) => c.storeIds.length > 1).length}</b><span>multi-store clusters</span></div><div className="card"><b>{deals.length}</b><span>deal candidates</span></div></div>
      <h3>Store price index</h3><table><thead><tr><th>Store</th><th>Compared products</th><th>Median relative</th><th>Average relative</th><th>Min</th><th>Max</th></tr></thead><tbody>{prices.map((row) => <tr key={row.storeId}><td>{row.storeId}</td><td>{row.comparedProducts}</td><td>{row.medianRelativePrice.toFixed(3)}</td><td>{row.averageRelativePrice.toFixed(3)}</td><td>{row.minRelativePrice.toFixed(3)}</td><td>{row.maxRelativePrice.toFixed(3)}</td></tr>)}</tbody></table>
      <h3>Likely favorable offers</h3><table><thead><tr><th>Store</th><th>Product</th><th>Price</th><th>Cluster median</th><th>Relative</th><th>Cluster size</th></tr></thead><tbody>{deals.slice(0, 200).map((deal) => <tr key={`${deal.storeId}:${deal.productId}`}><td>{deal.storeId}</td><td>{deal.url ? <a href={deal.url} target="_blank" rel="noreferrer">{deal.name}</a> : deal.name}<br/><code>{deal.productId}</code></td><td>{deal.price}</td><td>{deal.clusterMedianPrice.toFixed(2)}</td><td>{deal.relativePrice.toFixed(3)}</td><td>{deal.clusterSize}</td></tr>)}</tbody></table>
      <h3>Loaded product preview</h3><table><thead><tr><th>Store</th><th>Product</th><th>Price</th><th>Path</th></tr></thead><tbody>{products.slice(0, 100).map((item) => <tr key={`${item.storeId}:${item.path}`}><td>{item.storeId}</td><td>{loadedProductName(item.product)}</td><td>{loadedProductPrice(item.product) ?? "—"}</td><td><code>{item.path}</code></td></tr>)}</tbody></table>{analysisSnapshot ? <JsonBlock value={{ persisted: true, generatedAt: analysisSnapshot.generatedAt, productCount: analysisSnapshot.productCount, clusterCount: analysisSnapshot.clusterCount }} /> : null}
    </Section>}

    {tab === "files" && <Section title="Files" description="Raw file trees for debugging; product/event browsing should use resolved state indexes.">
      <h3>Main branch</h3><table><thead><tr><th>Path</th><th>Size</th></tr></thead><tbody>{mainFiles.slice(0, 300).map((file) => <tr key={file.path}><td><code>{file.path}</code></td><td>{formatBytes(file.size)}</td></tr>)}</tbody></table>
      <h3>Selected store branch: <code>{selectedBranch}</code></h3><table><thead><tr><th>Path</th><th>Size</th></tr></thead><tbody>{selectedFiles.slice(0, 500).map((file) => <tr key={file.path}><td><code>{file.path}</code></td><td>{formatBytes(file.size)}</td></tr>)}</tbody></table>
      <h3>Loaded file JSON</h3>{selectedJson ? <JsonBlock value={selectedJson} /> : null}
    </Section>}
  </>;
}

