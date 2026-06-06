import { useMemo, useState } from "react";
import type { Octokit } from "@octokit/rest";
import { buildAnalysisSnapshot, clusterProducts, dealCandidates, priceIndex, productName, productPrice } from "./analysis";
import { browserSyncStore, loadStoreStateProducts } from "./client-sync";
import { createBranchFrom, createPullRequest, deleteRepoSecret, dispatchWorkflow, getAuthenticatedUser, getTreeFilesByPath, listBranches, listFiles, listRepoSecrets, loadConfig, makeOctokit, parseRepository, readBlobText, readBlobTextByPath, readTextFile, setRepoSecret, writeJsonFile } from "./github";
import { parseJsonObject, safeJsonPreview, safePathSegment, stableStringify } from "./json";
import type { AnalysisSnapshot, AppConfig, LoadedProduct, ProductEvent, ProductMutationBatch, ProductStateIndex, RepoSecretSummary, RepoTarget, StoreConfig, StoreEventIndex, StoreManifest, StoreWebhookConfig, TreeFile } from "./types";

type TabId = "overview" | "stores" | "secrets" | "sync" | "mutations" | "products" | "events" | "analysis" | "files";
type Notice = { kind: "info" | "success" | "error"; text: string } | null;

const DEFAULT_REPOSITORY = "rikhoffbauer/ecwid-scraper";
const DEFAULT_BRANCH = "main";
const CONFIG_PATH = "config/ecwid-stores.json";
const SYNC_WORKFLOW_ID = "sync-ecwid.yml";
const PRODUCT_MUTATION_WORKFLOW_ID = "product-mutations.yml";
const EVENT_TYPES = ["product.created", "product.deleted", "product.field_changed"] as const;

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

function useSessionState(key: string, fallback: string): [string, (value: string) => void] {
  const [value, setValue] = useState(() => sessionStorage.getItem(key) ?? fallback);
  return [value, (next) => { setValue(next); sessionStorage.setItem(key, next); }];
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

function Field(props: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; help?: string }) {
  return <label className="field"><span>{props.label}</span><input type={props.type ?? "text"} value={props.value} placeholder={props.placeholder} onChange={(event) => props.onChange(event.currentTarget.value)} />{props.help ? <small>{props.help}</small> : null}</label>;
}

function TextField(props: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; help?: string }) {
  return <label className="field"><span>{props.label}</span><textarea value={props.value} placeholder={props.placeholder} onChange={(event) => props.onChange(event.currentTarget.value)} />{props.help ? <small>{props.help}</small> : null}</label>;
}

function Section(props: { title: string; description?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return <section className="panel"><div className="panel-head"><div><h2>{props.title}</h2>{props.description ? <p>{props.description}</p> : null}</div>{props.right ? <div className="panel-actions">{props.right}</div> : null}</div>{props.children}</section>;
}

function NoticeBar({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return <div className={`notice ${notice.kind}`}>{notice.text}</div>;
}

function JsonBlock(props: { value: unknown }) {
  return <pre className="json">{typeof props.value === "string" ? props.value : safeJsonPreview(props.value)}</pre>;
}

function parseWebhookEvents(value: string): StoreWebhookConfig["events"] {
  const items = value.split(",").map((item) => item.trim()).filter(Boolean);
  return (items.length ? items : ["*"]) as StoreWebhookConfig["events"];
}

function cleanStore(store: StoreConfig, config: AppConfig): StoreConfig {
  const id = store.id.trim();
  const cleaned: StoreConfig = {
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
  return cleaned;
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

export function App() {
  const [repository, setRepository] = useSessionState("ecwid-ui.repository", DEFAULT_REPOSITORY);
  const [branch, setBranch] = useSessionState("ecwid-ui.branch", DEFAULT_BRANCH);
  const [token, setToken] = useState(() => sessionStorage.getItem("ecwid-ui.token") ?? "");
  const [keepToken, setKeepToken] = useState(() => sessionStorage.getItem("ecwid-ui.keepToken") === "true");
  const [tab, setTab] = useState<TabId>("overview");
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
  const [productSearch, setProductSearch] = useState("");
  const [syncMaxProducts, setSyncMaxProducts] = useState("");
  const [analysisSnapshot, setAnalysisSnapshot] = useState<AnalysisSnapshot | null>(null);
  const [mutationOp, setMutationOp] = useState<"upsert" | "delete">("upsert");
  const [mutationProductId, setMutationProductId] = useState("");
  const [mutationJson, setMutationJson] = useState("{\n  \"id\": \"new-product-id\",\n  \"name\": \"New product\",\n  \"price\": 0\n}");
  const [mutationNote, setMutationNote] = useState("");
  const [mutationAllowOutdatedBase, setMutationAllowOutdatedBase] = useState(false);

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
  const filteredProductRecords = (selectedProductIndex?.records ?? []).filter((record) => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return true;
    return [record.productId, record.summary.name, record.summary.sku, record.summary.url, ...(record.summary.categoryNames ?? [])].filter(Boolean).join(" ").toLowerCase().includes(q);
  });
  const clusters = useMemo(() => clusterProducts(products, Number(clusterThreshold) || 0.55), [products, clusterThreshold]);
  const prices = useMemo(() => priceIndex(clusters), [clusters]);
  const deals = useMemo(() => dealCandidates(clusters, Number(dealThreshold) || 0.75), [clusters, dealThreshold]);
  const tabs: Array<[TabId, string]> = [["overview", "Overview"], ["stores", "Stores"], ["secrets", "Secrets"], ["sync", "Sync"], ["mutations", "Product edits"], ["products", "Products"], ["events", "Events"], ["analysis", "Analysis"], ["files", "Files"]];

  function persistToken(nextKeep: boolean, nextToken = token) {
    setKeepToken(nextKeep);
    sessionStorage.setItem("ecwid-ui.keepToken", String(nextKeep));
    if (nextKeep) sessionStorage.setItem("ecwid-ui.token", nextToken);
    else sessionStorage.removeItem("ecwid-ui.token");
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

  async function saveTokensJsonSecret() {
    await saveSecret("ECWID_STORE_TOKENS_JSON", tokensJson);
  }

  async function removeSecret(name: string) {
    await run(`Deleting ${name}`, async () => {
      if (!octokit || !target) return;
      await deleteRepoSecret(octokit, target, name);
      setSecrets(await listRepoSecrets(octokit, target));
    });
  }

  async function dispatchStoreSync(storeId?: string, force = true) {
    await run("Dispatching scheduled sync workflow", async () => {
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

  async function loadProductFile(storeId: string, filePath: string) {
    await run("Loading product JSON", async () => {
      if (!octokit || !target || !config) return;
      const text = await readBlobTextByPath(octokit, target, filePath, storeBranch(config, storeId));
      setSelectedJson(parseJsonObject(text, filePath));
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

  async function prepareProductEdit(record: ProductStateIndex["records"][number]) {
    await run("Preparing product edit", async () => {
      if (!octokit || !target || !config || !selectedStore) return;
      const text = await readBlobTextByPath(octokit, target, record.path, storeBranch(config, selectedStore.id));
      setMutationOp("upsert");
      setMutationProductId(record.productId);
      setMutationJson(JSON.stringify(JSON.parse(text), null, 2));
      setTab("mutations");
    });
  }

  function prepareProductDelete(record: ProductStateIndex["records"][number]) {
    setMutationOp("delete");
    setMutationProductId(record.productId);
    setMutationJson("{}");
    setTab("mutations");
  }

  function selectedMutationRecord(productId: string) {
    return selectedProductIndex?.records.find((record) => record.productId === productId);
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
      return {
        schemaVersion: 1,
        kind: "ecwid-product-mutation-batch",
        source: "web-ui",
        requestId,
        storeId: store.id,
        requestedAt,
        requestedBy: authUser || undefined,
        baseProductsHash,
        allowOutdatedBase: mutationAllowOutdatedBase,
        note: mutationNote.trim() || undefined,
        operations: [{ op: "delete", productId, expectHash: record?.hash }]
      };
    }

    const product = parseJsonObject<Record<string, unknown>>(mutationJson, "product JSON");
    if (product === null || typeof product !== "object" || Array.isArray(product)) throw new Error("Product JSON must be an object.");
    const rawId = product.id;
    if (typeof rawId !== "string" && typeof rawId !== "number") throw new Error("Product JSON must contain string/number id.");
    const productId = String(rawId);
    const record = selectedMutationRecord(productId);
    return {
      schemaVersion: 1,
      kind: "ecwid-product-mutation-batch",
      source: "web-ui",
      requestId,
      storeId: store.id,
      requestedAt,
      requestedBy: authUser || undefined,
      baseProductsHash,
      allowOutdatedBase: mutationAllowOutdatedBase,
      note: mutationNote.trim() || undefined,
      operations: [{ op: "upsert", productId, product, expectHash: record?.hash }]
    };
  }

  async function submitProductMutation(mode: "dispatch" | "pr") {
    await run(mode === "pr" ? "Opening product mutation PR" : "Dispatching product mutation workflow", async () => {
      if (!octokit || !target || !selectedStore) return;
      const request = buildProductMutationRequest(selectedStore);
      const requestBranch = `product-mutations/${safePathSegment(request.storeId)}/${safePathSegment(request.requestId)}`;
      const requestPath = `product-mutations/${safePathSegment(request.storeId)}/${safePathSegment(request.requestId)}.json`;
      await createBranchFrom(octokit, target, requestBranch, target.branch);
      await writeJsonFile(octokit, target, {
        branch: requestBranch,
        path: requestPath,
        value: request,
        message: `products(ecwid:${request.storeId}): request ${mutationOp} ${request.operations[0]?.productId ?? "product"}`
      });
      if (mode === "pr") {
        const pr = await createPullRequest(octokit, target, {
          head: requestBranch,
          title: `products(ecwid:${request.storeId}): ${mutationOp} ${request.operations[0]?.productId ?? "product"}`,
          body: `Product mutation request written to \`${requestPath}\`. Merge this PR to let the product-mutations workflow apply it to \`${storeBranch(config!, request.storeId)}\`.`
        });
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
      setProducts(loaded);
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

  return <>
    <header className="hero"><div><p className="eyebrow">Ecwid Product Git Watch</p><h1>Store control plane</h1><p className="lede">Manage stores, secrets, browser-side syncs, resolved state snapshots, event streams, and cross-store analysis from a static GitHub Pages app.</p></div></header>
    <section className="panel auth-panel">
      <div className="grid connection-grid">
        <Field label="Repository" value={repository} onChange={setRepository} placeholder="owner/name" />
        <Field label="Main branch" value={branch} onChange={setBranch} />
        <Field label="GitHub token" value={token} onChange={(value) => { setToken(value); if (keepToken) sessionStorage.setItem("ecwid-ui.token", value); }} type="password" help="Needs contents:write; secrets:write for secret management; actions:write only for workflow fallback." />
      </div>
      <label className="check-row"><input type="checkbox" checked={keepToken} onChange={(event) => persistToken(event.currentTarget.checked)} /> keep GitHub token in this browser session</label>
      <div className="button-row"><button disabled={busy} onClick={refreshAll}>Refresh</button>{authUser ? <span className="muted">Authenticated as {authUser}</span> : null}</div>
    </section>
    <nav className="tabs">{tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}</nav>
    <NoticeBar notice={notice} />

    {tab === "overview" && <Section title="Overview" description="Current config, store branches, resolved state indexes, and latest sync metadata.">
      <div className="cards"><div className="card"><b>{config?.stores.length ?? 0}</b><span>configured stores</span></div><div className="card"><b>{storeBranches.length}</b><span>store branches</span></div><div className="card"><b>{Object.values(productIndexes).reduce((sum, index) => sum + (index?.productCount ?? 0), 0)}</b><span>indexed products</span></div><div className="card"><b>{Object.values(eventIndexes).reduce((sum, index) => sum + (index?.totalEvents ?? 0), 0)}</b><span>indexed events</span></div></div>
      <table><thead><tr><th>Store</th><th>Branch</th><th>Interval</th><th>Products</th><th>Events</th><th>Last sync</th><th>Next due</th><th>Action</th></tr></thead><tbody>{config?.stores.map((store) => <tr key={store.id}><td>{store.url ? <a href={store.url} target={"_blank"}>{store.name ?? store.id}</a> : store.name ?? store.id}<br/><span>{store.id}</span></td><td><code>{storeBranch(config, store.id)}</code></td><td>{store.syncIntervalMinutes ?? config.defaultSyncIntervalMinutes} min</td><td>{productIndexes[store.id]?.productCount ?? manifests[store.id]?.productCount ?? "—"}</td><td>{eventIndexes[store.id]?.totalEvents ?? "—"}</td><td>{manifests[store.id]?.lastSyncedAt ?? "—"}</td><td>{manifests[store.id]?.nextSyncNotBefore ?? "—"}</td><td><button onClick={() => { setSelectedStoreId(store.id); setTab("sync"); }}>Sync</button></td></tr>)}</tbody></table>
    </Section>}

    {tab === "stores" && <Section title="Stores" description="Add stores, edit intervals, configure webhooks, then save config/ecwid-stores.json." right={<button className="primary" onClick={saveStores} disabled={busy || !config}>Save stores</button>}>
      <div className="button-row"><button onClick={() => setDraftStores([...draftStores, emptyStore()])}>Add store</button><button onClick={() => config && setDraftStores(config.stores)}>Reset draft</button></div>
      <div className="stack">{draftStores.map((store, index) => <div className="store-editor" key={`${store.id}-${index}`}>
        <div className="store-editor-grid">
          <Field label="Store ID" value={store.id} onChange={(value) => setDraftStores(updateStore(draftStores, index, { id: value, tokenEnv: normalizeSecretName(value) }))} />
          <Field label="Name" value={store.name ?? ""} onChange={(value) => setDraftStores(updateStore(draftStores, index, { name: value }))} />
          <Field label="URL" value={store.url ?? ""} onChange={(value) => setDraftStores(updateStore(draftStores, index, { url: value }))} />
          <Field label="Token env" value={store.tokenEnv ?? ""} onChange={(value) => setDraftStores(updateStore(draftStores, index, { tokenEnv: value }))} help="Used by Actions; browser sync asks for the token separately." />
          <Field label="Interval minutes" type="number" value={String(store.syncIntervalMinutes ?? 30)} onChange={(value) => setDraftStores(updateStore(draftStores, index, { syncIntervalMinutes: Number(value) }))} />
          <Field label="Limit" type="number" value={String(store.limit ?? 200)} onChange={(value) => setDraftStores(updateStore(draftStores, index, { limit: Number(value) }))} />
          <Field label="Request delay ms" type="number" value={String(store.requestDelayMs ?? 100)} onChange={(value) => setDraftStores(updateStore(draftStores, index, { requestDelayMs: Number(value) }))} />
        </div>
        <label className="check-row"><input type="checkbox" checked={store.enabled !== false} onChange={(event) => setDraftStores(updateStore(draftStores, index, { enabled: event.currentTarget.checked }))} /> enabled</label>
        <div className="button-row"><button className="danger" onClick={() => setDraftStores(draftStores.filter((_, i) => i !== index))}>Remove store</button>{store.id ? <button onClick={() => { setSelectedStoreId(store.id); setTab("sync"); }}>Open sync</button> : null}</div>
        <h3>Webhooks</h3>
        {(store.webhooks ?? []).map((hook, hookIndex) => <div className="webhook-editor" key={`${hook.id}-${hookIndex}`}>
          <div className="store-editor-grid"><Field label="Webhook ID" value={hook.id} onChange={(value) => setDraftStores(updateWebhook(draftStores, index, hookIndex, { id: value }))} /><Field label="URL" value={hook.url} onChange={(value) => setDraftStores(updateWebhook(draftStores, index, hookIndex, { url: value }))} /><Field label="Events" value={(hook.events ?? ["*"]).join(",")} onChange={(value) => setDraftStores(updateWebhook(draftStores, index, hookIndex, { events: parseWebhookEvents(value) }))} help={`* or ${EVENT_TYPES.join(",")}`} /><Field label="Secret env" value={hook.secretEnv ?? ""} onChange={(value) => setDraftStores(updateWebhook(draftStores, index, hookIndex, { secretEnv: value || undefined }))} /></div>
          <label className="check-row"><input type="checkbox" checked={hook.enabled !== false} onChange={(event) => setDraftStores(updateWebhook(draftStores, index, hookIndex, { enabled: event.currentTarget.checked }))} /> enabled</label>
          <button className="danger" onClick={() => setDraftStores(updateStore(draftStores, index, { webhooks: (store.webhooks ?? []).filter((_, i) => i !== hookIndex) }))}>Remove webhook</button>
        </div>)}
        <button onClick={() => setDraftStores(updateStore(draftStores, index, { webhooks: [...(store.webhooks ?? []), { id: `webhook-${(store.webhooks ?? []).length + 1}`, url: "", enabled: true, events: ["*"] }] }))}>Add webhook</button>
      </div>)}</div>
    </Section>}

    {tab === "secrets" && <Section title="Secrets" description="Set individual token secrets or the arbitrary-store JSON token map used by scheduled syncs.">
      <div className="grid three"><Field label="Secret name" value={secretName} onChange={setSecretName} placeholder="ECWID_99490018_TOKEN" /><Field label="Secret value" value={secretValue} onChange={setSecretValue} type="password" /><button onClick={() => saveSecret()} disabled={busy}>Save secret</button></div>
      <TextField label="ECWID_STORE_TOKENS_JSON" value={tokensJson} onChange={setTokensJson} help='For stores added from the UI: {"99490018":"public_...","other":"secret_..."}' />
      <button onClick={saveTokensJsonSecret} disabled={busy}>Save JSON token map secret</button>
      <table><thead><tr><th>Name</th><th>Created</th><th>Updated</th><th></th></tr></thead><tbody>{secrets.map((secret) => <tr key={secret.name}><td><code>{secret.name}</code></td><td>{secret.created_at}</td><td>{secret.updated_at}</td><td><button className="danger" onClick={() => removeSecret(secret.name)}>Delete</button></td></tr>)}</tbody></table>
    </Section>}

    {tab === "sync" && <Section title="On-demand sync" description="Runs entirely in this browser: fetches Ecwid products with the token you provide, commits product files, event streams, and resolved state snapshots directly through the GitHub Git API.">
      <div className="toolbar"><select value={selectedStore?.id ?? ""} onChange={(event) => setSelectedStoreId(event.currentTarget.value)}>{config?.stores.map((store) => <option key={store.id} value={store.id}>{store.name ?? store.id}</option>)}</select><Field label="Ecwid API token for browser sync" value={selectedStore ? manualTokens[selectedStore.id] ?? "" : ""} onChange={(value) => selectedStore && setManualTokens({ ...manualTokens, [selectedStore.id]: value })} type="password" help="Not stored unless you save it as a GitHub secret." /><button className="primary" disabled={!selectedStore || busy} onClick={() => selectedStore && syncStoreInBrowser(selectedStore)}>Sync selected in browser</button></div>
      <div className="button-row"><Field label="Optional max products for test sync" value={syncMaxProducts} onChange={setSyncMaxProducts} type="number" /><button disabled={!selectedStore || busy} onClick={() => selectedStore && saveSecret(selectedStore.tokenEnv ?? normalizeSecretName(selectedStore.id), manualTokens[selectedStore.id] ?? "")}>Save token as store secret</button><button disabled={!selectedStore || busy} onClick={() => selectedStore && dispatchStoreSync(selectedStore.id, true)}>Fallback: dispatch Actions sync</button></div>
      {selectedStore ? <JsonBlock value={{ store: selectedStore, branch: selectedBranch, manifest: manifests[selectedStore.id], productIndex: productIndexes[selectedStore.id] ? { productCount: productIndexes[selectedStore.id]?.productCount, shards: productIndexes[selectedStore.id]?.shards.length } : null, eventIndex: eventIndexes[selectedStore.id] }} /> : null}
    </Section>}

    {tab === "mutations" && <Section title="Product edits" description="Create one reviewable product mutation JSON file. A GitHub workflow validates that file, then expands it into product files, state indexes, and event streams on the store branch.">
      <div className="toolbar"><select value={selectedStore?.id ?? ""} onChange={(event) => setSelectedStoreId(event.currentTarget.value)}>{config?.stores.map((store) => <option key={store.id} value={store.id}>{store.name ?? store.id}</option>)}</select><span className="pill">branch: <code>{selectedBranch || "—"}</code></span><span className="pill">base: <code>{selectedProductIndex?.productsHash?.slice(0, 12) ?? manifests[selectedStore?.id ?? ""]?.productsHash?.slice(0, 12) ?? "—"}</code></span></div>
      <div className="grid three">
        <label className="field"><span>Operation</span><select value={mutationOp} onChange={(event) => setMutationOp(event.currentTarget.value as "upsert" | "delete")}><option value="upsert">add/update product</option><option value="delete">delete product</option></select></label>
        <Field label="Product ID" value={mutationProductId} onChange={setMutationProductId} help="Required for delete; auto-derived from product JSON for upsert." />
        <label className="check-row"><input type="checkbox" checked={mutationAllowOutdatedBase} onChange={(event) => setMutationAllowOutdatedBase(event.currentTarget.checked)} /> allow outdated base hash</label>
      </div>
      {mutationOp === "upsert" ? <TextField label="Product JSON" value={mutationJson} onChange={setMutationJson} help="Full Ecwid product snapshot. The workflow writes this to products/&lt;id&gt;.json and rebuilds state indexes." /> : <JsonBlock value={{ deleteProductId: mutationProductId || "<product id>", expectHash: selectedMutationRecord(mutationProductId)?.hash ?? "not found in loaded index" }} />}
      <TextField label="Note" value={mutationNote} onChange={setMutationNote} help="Optional context stored in the single mutation request file." />
      <div className="button-row"><button className="primary" disabled={!selectedStore || busy} onClick={() => submitProductMutation("dispatch")}>Commit request + run workflow</button><button disabled={!selectedStore || busy} onClick={() => submitProductMutation("pr")}>Open review PR</button></div>
      <JsonBlock value={{ requestFile: selectedStore ? `product-mutations/${safePathSegment(selectedStore.id)}/<request-id>.json` : null, workflow: PRODUCT_MUTATION_WORKFLOW_ID, behavior: "The browser commits one JSON file. GitHub Actions applies it to the store branch and regenerates products/, events/, and state/." }} />
    </Section>}

    {tab === "products" && <Section title="Products" description="Browse resolved state snapshots instead of walking tens of thousands of product files.">
      <div className="toolbar"><select value={selectedStore?.id ?? ""} onChange={(event) => setSelectedStoreId(event.currentTarget.value)}>{config?.stores.map((store) => <option key={store.id} value={store.id}>{store.name ?? store.id}</option>)}</select><Field label="Search" value={productSearch} onChange={setProductSearch} placeholder="name, sku, id, category" /><span className="pill">{filteredProductRecords.length} / {selectedProductIndex?.productCount ?? 0}</span></div>
      <table><thead><tr><th>ID</th><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Shard</th><th></th></tr></thead><tbody>{filteredProductRecords.slice(0, 500).map((record) => <tr key={record.productId}><td><code>{record.productId}</code></td><td>{record.summary.name ?? "—"}</td><td>{record.summary.sku ?? "—"}</td><td>{record.summary.price ?? record.summary.defaultDisplayedPrice ?? "—"}</td><td>{record.summary.inStock === false ? "out" : record.summary.quantity ?? "—"}</td><td><code>{record.shardPath}</code></td><td><div className="button-row"><button onClick={() => selectedStore && loadProductFile(selectedStore.id, record.path)}>View JSON</button><button onClick={() => prepareProductEdit(record)}>Edit</button><button className="danger" onClick={() => prepareProductDelete(record)}>Delete</button></div></td></tr>)}</tbody></table>
      {selectedJson ? <JsonBlock value={selectedJson} /> : null}
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
      <h3>Clusters</h3><table><thead><tr><th>Cluster</th><th>Products</th><th>Stores</th><th>Median</th><th>Min</th><th>Max</th></tr></thead><tbody>{clusters.slice(0, 300).map((cluster) => <tr key={cluster.id}><td>{cluster.label}</td><td>{cluster.products.length}</td><td>{cluster.storeIds.join(", ")}</td><td>{cluster.medianPrice?.toFixed(2) ?? "—"}</td><td>{cluster.minPrice ?? "—"}</td><td>{cluster.maxPrice ?? "—"}</td></tr>)}</tbody></table>
      {analysisSnapshot ? <JsonBlock value={{ persisted: true, generatedAt: analysisSnapshot.generatedAt, productCount: analysisSnapshot.productCount, clusterCount: analysisSnapshot.clusterCount }} /> : null}
      <h3>Loaded product preview</h3><table><thead><tr><th>Store</th><th>Product</th><th>Price</th><th>Path</th></tr></thead><tbody>{products.slice(0, 100).map((item) => <tr key={`${item.storeId}:${item.path}`}><td>{item.storeId}</td><td>{productName(item.product)}</td><td>{productPrice(item.product) ?? "—"}</td><td><code>{item.path}</code></td></tr>)}</tbody></table>
    </Section>}

    {tab === "files" && <Section title="Files" description="Raw file trees for debugging; product/event browsing should use resolved state indexes.">
      <h3>Main branch</h3><table><thead><tr><th>Path</th><th>Size</th></tr></thead><tbody>{mainFiles.slice(0, 300).map((file) => <tr key={file.path}><td><code>{file.path}</code></td><td>{formatBytes(file.size)}</td></tr>)}</tbody></table>
      <h3>Selected store branch: <code>{selectedBranch}</code></h3><table><thead><tr><th>Path</th><th>Size</th></tr></thead><tbody>{selectedFiles.slice(0, 500).map((file) => <tr key={file.path}><td><code>{file.path}</code></td><td>{formatBytes(file.size)}</td></tr>)}</tbody></table>
      <h3>Loaded file JSON</h3>{selectedJson ? <JsonBlock value={selectedJson} /> : null}
    </Section>}
  </>;
}
