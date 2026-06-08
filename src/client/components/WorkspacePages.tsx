import { useEffect, useState } from "react";
import { formatPrice } from "../../shared/catalog";
import { ApiClient } from "../client";
import type { DealCandidate, DirectSearchResult, EnrichmentProposal, EnrichmentProposals, EnrichmentRun, LLMProvider, LoadedProduct, OnboardingJob, PriceIndexRow, ProductCluster, ProductEvent, SavedSearch, SavedSearchDetails, StoreConfig } from "../../shared/types";
import { EmptyState, formatRelativeTime, Icon } from "./ui";

export function IntelligencePage({ products, clusters, prices, deals }: { products: any[]; clusters: any[]; prices: any[]; deals: any[] }) {
  return <main className="workspace-main"><header className="workspace-toolbar"><div><h1>Intelligence</h1><span>{products.length.toLocaleString()} tracked offerings · {clusters.length.toLocaleString()} comparison groups</span></div></header><section className="open-section"><header><h2>Favorable offers</h2><span>{deals.length} candidates</span></header>{deals.length ? <div className="table-shell"><table><thead><tr><th>Product</th><th>Source</th><th>Current</th><th>Median</th><th>Relative</th></tr></thead><tbody>{deals.slice(0, 100).map((deal) => <tr key={`${deal.storeId}:${deal.productId}`}><td><strong>{deal.name}</strong></td><td>{deal.storeId}</td><td>{formatPrice(deal.price)}</td><td>{formatPrice(deal.clusterMedianPrice)}</td><td className="positive">{Math.round((1 - deal.relativePrice) * 100)}% lower</td></tr>)}</tbody></table></div> : <EmptyState title="No favorable offers yet">More cross-source matches are needed for useful comparisons.</EmptyState>}</section><section className="open-section"><header><h2>Store price index</h2></header><div className="price-index">{prices.map((row) => <div key={row.storeId}><strong>{row.storeId}</strong><div><span style={{ width: `${Math.min(100, row.medianRelativePrice * 70)}%` }} /></div><b>{row.medianRelativePrice.toFixed(2)}×</b></div>)}</div></section><section className="open-section"><header><h2>Comparison groups</h2><span>{clusters.filter((cluster) => cluster.storeIds.length > 1).length} cross-source</span></header><div className="cluster-list">{clusters.filter((cluster) => cluster.products.length > 1).slice(0, 30).map((cluster) => <article key={cluster.id}><div><strong>{cluster.label}</strong><span>{cluster.matchType === "canonical" ? "Canonical product" : "Heuristic fallback"} · {cluster.storeIds.join(", ")}</span></div><b>{cluster.products.length} matches</b><span>{formatPrice(cluster.minPrice)} – {formatPrice(cluster.maxPrice)}</span></article>)}</div></section></main>;
}

export function ActivityPage({ events }: { events: ProductEvent[] }) {
  return <main className="workspace-main"><header className="workspace-toolbar"><div><h1>Activity</h1><span>Product changes across every source</span></div></header><section className="open-section"><div className="timeline">{events.slice(-250).reverse().map((event) => <article key={event.eventId}><span className="event-dot" /><div><strong>{event.eventType.replace("product.", "")}</strong><p>{event.storeId} · {event.productId}{("path" in event && typeof event.path === "string") ? ` · ${event.path}` : ""}</p></div><time>{formatRelativeTime(event.observedAt)}</time></article>)}</div></section></main>;
}

export function EnrichmentPage({ client }: { client: ApiClient }) {
  const [runs, setRuns] = useState<EnrichmentRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [proposals, setProposals] = useState<EnrichmentProposals>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = async () => {
    const next = await client.getEnrichmentRuns();
    setRuns(next);
    if (!selectedRunId && next[0]) setSelectedRunId(next[0].id);
  };
  const loadProposals = async (runId = selectedRunId) => {
    if (!runId) { setProposals({}); return; }
    setProposals(await client.getEnrichmentProposals(runId));
  };
  useEffect(() => { void load().catch((error) => setMessage((error as Error).message)); }, [client]);
  useEffect(() => { void loadProposals().catch((error) => setMessage((error as Error).message)); }, [selectedRunId]);
  const prepare = async () => {
    setBusy(true); setMessage("");
    try {
      const result = await client.prepareEnrichmentRun();
      setSelectedRunId(result.runId);
      setMessage(`Prepared ${result.runId}. Embedding candidates: ${result.embeddingCandidates}.`);
      await load();
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  };
  const execute = async () => {
    if (!selectedRunId) return;
    setBusy(true); setMessage("");
    try {
      const result = await client.executeEnrichmentRun(selectedRunId);
      setMessage(result.validationErrors.length ? `Agent finished with ${result.validationErrors.length} validation errors.` : "Agent run completed.");
      await Promise.all([load(), loadProposals()]);
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  };
  const apply = async () => {
    if (!selectedRunId) return;
    setBusy(true); setMessage("");
    try {
      const result = await client.applyEnrichmentRun(selectedRunId);
      setMessage(`Applied: ${result.appliedCanonicalMatches} matches, ${result.createdCanonicalProducts} products, ${result.appliedLabels} labels, ${result.appliedSpecifications} specs, ${result.appliedIdentifiers} identifiers, ${result.appliedCategories} categories.`);
      await load();
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  };
  const removeRun = async () => {
    if (!selectedRunId || !confirm(`Delete enrichment run ${selectedRunId} and its audit artifact?`)) return;
    setBusy(true); setMessage("");
    try {
      await client.deleteEnrichmentRun(selectedRunId);
      setSelectedRunId("");
      setProposals({});
      setMessage("Enrichment run deleted.");
      await load();
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  };
  const review = async (table: string, proposal: EnrichmentProposal, reviewState: "accepted" | "rejected" | "pending") => {
    if (!selectedRunId) return;
    setBusy(true); setMessage("");
    try {
      await client.updateEnrichmentProposal(selectedRunId, { table, id: proposal.id, reviewState });
      await loadProposals();
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  };
  const selected = runs.find((run) => run.id === selectedRunId);
  const proposalEntries = Object.entries(proposals).filter(([, rows]) => rows.length);
  const proposalCount = Object.values(proposals).reduce((count, rows) => count + rows.length, 0);
  return <main className="workspace-main">
    <header className="workspace-toolbar"><div><h1>Enrichment</h1><span>{runs.length} runs · {proposalCount} visible proposal rows</span></div><div className="search-actions"><button disabled={busy} onClick={prepare}>Prepare run</button><button disabled={busy || !selectedRunId} onClick={execute}>Execute agent</button><button disabled={busy || !selectedRunId} onClick={apply}>Apply accepted</button><button disabled={busy || !selectedRunId} onClick={removeRun}>Delete run</button></div></header>
    {message ? <p className={message.toLowerCase().includes("error") ? "search-error" : "positive"}>{message}</p> : null}
    <section className="open-section"><header><h2>Runs</h2><span>{selected?.status ?? "No run selected"}</span></header>{runs.length ? <div className="source-list">{runs.map((run) => <article key={run.id} className={run.id === selectedRunId ? "selected" : ""}><div><span>{run.status} · {run.harness ?? "harness pending"}</span><h2>{run.id}</h2><p>{run.artifact_path ?? "No artifact"}</p>{run.error ? <p className="search-error">{run.error}</p> : null}</div><div><strong>{run.completed_at ? new Date(run.completed_at).toLocaleString() : "Prepared"}</strong><span>{new Date(run.created_at).toLocaleString()}</span><button onClick={() => setSelectedRunId(run.id)}>Inspect</button></div></article>)}</div> : <EmptyState title="No enrichment runs yet">Prepare a run to export pending offerings into a dedicated SQLite artifact.</EmptyState>}</section>
    <section className="open-section"><header><h2>Proposals</h2><span>{selectedRunId || "Select a run"}</span></header>{proposalEntries.length ? proposalEntries.map(([table, rows]) => <ProposalTable key={table} table={table} rows={rows} busy={busy} review={review} />) : <EmptyState title="No proposals">Run an agent or inspect validation errors after preparing an enrichment database.</EmptyState>}</section>
  </main>;
}

function ProposalTable({ table, rows, busy, review }: { table: string; rows: EnrichmentProposal[]; busy: boolean; review: (table: string, proposal: EnrichmentProposal, state: "accepted" | "rejected" | "pending") => void }) {
  return <div className="table-shell" style={{ marginBottom: 18 }}><table><thead><tr><th>{table}</th><th>Offering</th><th>Value</th><th>Confidence</th><th>Review</th><th /></tr></thead><tbody>{rows.slice(0, 100).map((proposal) => <tr key={`${table}:${proposal.id}`}><td>#{proposal.id}</td><td>{proposal.source_product_offering_id || "run"}</td><td><ProposalValue proposal={proposal} /></td><td>{Number(proposal.confidence).toFixed(2)}</td><td>{proposal.review_state}</td><td><div className="search-actions"><button disabled={busy} onClick={() => review(table, proposal, "accepted")}>Accept</button><button disabled={busy} onClick={() => review(table, proposal, "rejected")}>Reject</button><button disabled={busy} onClick={() => review(table, proposal, "pending")}>Reset</button></div></td></tr>)}</tbody></table></div>;
}

function ProposalValue({ proposal }: { proposal: EnrichmentProposal }) {
  let value = proposal.proposed_value_json;
  try { value = JSON.stringify(JSON.parse(proposal.proposed_value_json)); } catch {}
  return <span title={proposal.reasoning_summary}>{proposal.normalized_proposed_value ?? value}</span>;
}

export function SourcesPage({ stores, sync, syncing, client, reload }: { stores: StoreConfig[]; sync: (id?: string) => void; syncing: boolean; client: ApiClient; reload: () => Promise<void> }) {
  return <main className="workspace-main"><header className="workspace-toolbar"><div><h1>Sources</h1><span>Read-only product connections</span></div><button className="sync-button" onClick={() => sync()} disabled={syncing}><Icon name="sync" />Sync all</button></header><OnboardingWizard client={client} reload={reload} /><section className="source-list">{stores.map((store) => <article key={store.id}><div><span>{store.kind ?? "ecwid"}</span><h2>{store.name ?? store.id}</h2><p>{store.url ?? store.id}</p></div><div><strong>{store.enabled === false ? "Paused" : "Active"}</strong><span>Every {store.syncIntervalMinutes ?? 30} min</span><button onClick={() => sync(store.id)}>Sync source</button></div></article>)}</section></main>;
}

function OnboardingWizard({ client, reload }: { client: ApiClient; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [form, setForm] = useState({ id: "", name: "", catalogUrl: "", catalogPageNumber: 1, productUrl: "", searchUrl: "", searchQuery: "" });
  const [job, setJob] = useState<OnboardingJob | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (key: keyof typeof form, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const refresh = async (id: string) => {
    const next = await client.getOnboardingJob(id, token);
    setJob(next);
    if (next.status === "queued" || next.status === "running") setTimeout(() => void refresh(id), 1000);
    if (next.status === "activated") await reload();
  };
  const start = async () => {
    setBusy(true); setError("");
    try { const next = await client.createOnboardingJob(form, token); setJob(next); void refresh(next.id); }
    catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  };
  const action = async (name: "approve" | "reject" | "retry") => {
    if (!job) return;
    setBusy(true); setError("");
    try {
      const next = await client.onboardingAction(job.id, name, token); setJob(next);
      if (name === "retry") void refresh(job.id);
      if (next.status === "activated") await reload();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  };
  return <section className="onboarding"><button className="sync-button" onClick={() => setOpen(!open)}>Add unsupported website with AI</button>{open ? <div className="onboarding-panel">
    <p>Executable adapters are trusted local code. Onboarding must be enabled and protected by its dedicated token.</p>
    <div className="onboarding-grid">
      <label>Onboarding token<input type="password" value={token} onChange={(event) => setToken(event.currentTarget.value)} /></label>
      <label>Source ID<input value={form.id} onChange={(event) => change("id", event.currentTarget.value)} placeholder="example-shop" /></label>
      <label>Name<input value={form.name} onChange={(event) => change("name", event.currentTarget.value)} /></label>
      <label>Catalogue URL<input value={form.catalogUrl} onChange={(event) => change("catalogUrl", event.currentTarget.value)} /></label>
      <label>Displayed page number<input type="number" min="1" value={form.catalogPageNumber} onChange={(event) => change("catalogPageNumber", Number(event.currentTarget.value))} /></label>
      <label>Product URL<input value={form.productUrl} onChange={(event) => change("productUrl", event.currentTarget.value)} /></label>
      <label>Search URL<input value={form.searchUrl} onChange={(event) => change("searchUrl", event.currentTarget.value)} /></label>
      <label>Displayed search query<input value={form.searchQuery} onChange={(event) => change("searchQuery", event.currentTarget.value)} /></label>
    </div>
    <button disabled={busy || !token || !form.id || !form.catalogUrl || !form.productUrl || !form.searchUrl || !form.searchQuery} onClick={start}>Generate and verify adapter</button>
    {error ? <p className="search-error">{error}</p> : null}
    {job ? <div className="onboarding-result"><strong>{job.status}</strong>{job.events.map((event, index) => <p key={`${event.at}:${index}`}>{event.message}</p>)}{job.diagnostics.map((item) => <p className="search-error" key={item}>{item}</p>)}{job.preview ? <OnboardingPreview job={job} /> : null}<div className="search-actions">{job.status === "inconclusive" ? <button disabled={busy} onClick={() => action("approve")}>Approve adapter</button> : null}{["failed", "inconclusive"].includes(job.status) ? <button disabled={busy} onClick={() => action("retry")}>Retry</button> : null}{!["activated", "rejected"].includes(job.status) ? <button disabled={busy} onClick={() => action("reject")}>Reject</button> : null}</div></div> : null}
  </div> : null}</section>;
}

function OnboardingPreview({ job }: { job: OnboardingJob }) {
  const groups = [["Catalogue", job.preview!.catalog], ["Product", job.preview!.product ? [job.preview!.product] : []], ["Search", job.preview!.search], ["Next page", job.preview!.nextCatalog ?? []]] as const;
  return <div className="onboarding-previews">{groups.map(([label, products]) => <div key={label}><strong>{label} ({products.length})</strong>{products.slice(0, 5).map((product) => <a key={product.externalId} href={product.url} target="_blank" rel="noreferrer">{product.title}</a>)}</div>)}</div>;
}

type ProviderKind = "openai" | "gemini" | "openrouter" | "deepseek" | "vertex" | "litellm" | "custom";
type ProviderDraft = { id?: number; provider: ProviderKind; model: string; isDefault: boolean; apiKey: string; envName: string; baseURL: string; siteUrl: string; appName: string; projectId: string; location: string; apiVersion: "v1" | "v1beta1"; regionalEndpoint: boolean; scopes: string; allowUnauthenticatedLocalProxy: boolean };
const EMPTY_PROVIDER: ProviderDraft = { provider: "openai", model: "", isDefault: false, apiKey: "", envName: "", baseURL: "", siteUrl: "", appName: "", projectId: "", location: "", apiVersion: "v1beta1", regionalEndpoint: true, scopes: "", allowUnauthenticatedLocalProxy: false };
const PROVIDER_LABELS: Record<ProviderKind, string> = { openai: "OpenAI", gemini: "Gemini", openrouter: "OpenRouter", deepseek: "DeepSeek", vertex: "Vertex AI", litellm: "LiteLLM", custom: "Custom OpenAI-compatible" };
const DEFAULT_MODELS: Record<ProviderKind, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash",
  openrouter: "google/gemini-2.5-flash",
  deepseek: "deepseek-chat",
  vertex: "google/gemini-2.5-flash",
  litellm: "gpt-4o-mini",
  custom: "gpt-4o-mini",
};
function providerDraft(provider?: LLMProvider): ProviderDraft {
  if (!provider) return { ...EMPTY_PROVIDER, model: DEFAULT_MODELS[EMPTY_PROVIDER.provider] };
  let config: Record<string, unknown> = {}; try { config = JSON.parse(provider.configJson); } catch {}
  return { ...EMPTY_PROVIDER, id: provider.id, provider: provider.provider as ProviderKind, model: provider.model, isDefault: provider.isDefault, apiKey: String(config.apiKey ?? ""), envName: String(config.envName ?? ""), baseURL: String(config.baseURL ?? ""), siteUrl: String(config.siteUrl ?? ""), appName: String(config.appName ?? ""), projectId: String(config.projectId ?? ""), location: String(config.location ?? ""), apiVersion: config.apiVersion === "v1" ? "v1" : "v1beta1", regionalEndpoint: config.regionalEndpoint !== false, scopes: Array.isArray(config.scopes) ? config.scopes.join(", ") : "", allowUnauthenticatedLocalProxy: config.allowUnauthenticatedLocalProxy === true };
}
function providerConfig(draft: ProviderDraft): string {
  const compact = (value: Record<string, unknown>) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== "" && item !== undefined));
  if (draft.provider === "vertex") return JSON.stringify(compact({ apiKey: draft.apiKey, projectId: draft.projectId, location: draft.location, apiVersion: draft.apiVersion, regionalEndpoint: draft.regionalEndpoint, scopes: draft.scopes ? draft.scopes.split(",").map((item) => item.trim()).filter(Boolean) : undefined }));
  return JSON.stringify(compact({ apiKey: draft.apiKey, envName: draft.envName, baseURL: draft.baseURL, siteUrl: draft.provider === "openrouter" ? draft.siteUrl : undefined, appName: draft.provider === "openrouter" ? draft.appName : undefined, allowUnauthenticatedLocalProxy: draft.provider === "litellm" ? draft.allowUnauthenticatedLocalProxy : undefined }));
}

export function SettingsPage({ apiUrl, setApiUrl, client }: { apiUrl: string; setApiUrl: (value: string) => void; client: ApiClient }) {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [editing, setEditing] = useState<ProviderDraft | null>(null);
  const [testing, setTesting] = useState<{ id?: number; status: string; error?: string } | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchError, setModelFetchError] = useState<string | null>(null);

  const load = async () => { try { setProviders(await client.getLLMProviders()); } catch (e) { console.error(e); } };
  useEffect(() => { void load(); }, [client]);

  useEffect(() => {
    if (!editing) {
      setAvailableModels([]);
      setModelFetchError(null);
      return;
    }

    const triggerFetch = async () => {
      if (editing.provider === "vertex" && (!editing.projectId.trim() || !editing.location.trim())) return;
      if ((editing.provider === "custom" || editing.provider === "litellm") && !editing.baseURL.trim()) return;

      setFetchingModels(true);
      setModelFetchError(null);
      try {
        const result = await client.fetchLLMModels({
          provider: editing.provider,
          configJson: providerConfig(editing)
        });
        if (result.ok && result.models) {
          setAvailableModels(result.models);
        } else {
          setModelFetchError(result.error || "Failed to fetch models");
          setAvailableModels([]);
        }
      } catch (err) {
        setModelFetchError((err as Error).message);
        setAvailableModels([]);
      } finally {
        setFetchingModels(false);
      }
    };

    const timer = setTimeout(() => {
      const hasKey = editing.apiKey.trim().length > 0 || editing.envName.trim().length > 0;
      const isVertex = editing.provider === "vertex" && editing.projectId.trim().length > 0;
      const isCustomOrLite = (editing.provider === "custom" || editing.provider === "litellm") && editing.baseURL.trim().length > 0;

      if (editing.id || hasKey || isVertex || isCustomOrLite) {
        void triggerFetch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [editing?.id, editing?.provider, editing?.apiKey, editing?.envName, editing?.baseURL, editing?.projectId, editing?.location, editing?.apiVersion, editing?.regionalEndpoint]);

  const save = async () => {
    if (!editing) return;
    try {
      const input = { provider: editing.provider, configJson: providerConfig(editing), model: editing.model.trim(), isDefault: editing.isDefault };
      if (!input.model) throw new Error("Model is required");
      if (editing.provider === "vertex" && (!editing.projectId.trim() || !editing.location.trim())) throw new Error("Google Cloud project ID and location are required");
      if ((editing.provider === "custom" || editing.provider === "litellm") && !editing.baseURL.trim()) throw new Error("Base URL is required");
      if (editing.id) await client.updateLLMProvider(editing.id, input);
      else await client.createLLMProvider(input);
      setEditing(null);
      await load();
    } catch (e) { alert((e as Error).message); }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this provider?")) return;
    try {
      await client.deleteLLMProvider(id);
      await load();
    } catch (e) { alert((e as Error).message); }
  };

  const test = async (p: ProviderDraft | LLMProvider) => {
    setTesting({ id: p.id, status: "Testing..." });
    try {
      const result = await client.testLLMProvider({ provider: p.provider, configJson: "configJson" in p ? p.configJson : providerConfig(p), model: p.model });
      if (result.ok) setTesting({ id: p.id, status: `Success: ${result.message}` });
      else setTesting({ id: p.id, status: "Failed", error: result.error });
    } catch (e) { setTesting({ id: p.id, status: "Error", error: (e as Error).message }); }
  };

  return <main className="workspace-main narrow-page"><header className="workspace-toolbar"><div><h1>Settings</h1><span>Workspace preferences and LLM configuration</span></div></header>
    <section className="settings-section"><h2>Connection</h2><label>API URL<input value={apiUrl} onChange={(event) => setApiUrl(event.currentTarget.value)} placeholder="/api or http://localhost:3000" /></label><p>Leave blank when using the local Vite proxy.</p></section>

    <section className="settings-section">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>LLM Providers</h2>
        <button className="sync-button" onClick={() => setEditing(providerDraft())}>Add Provider</button>
      </header>
      <div className="source-list">
        {providers.map(p => <article key={p.id}>
          <div>
            <span>{p.provider} {p.isDefault ? "· Default" : ""}</span>
            <h2>{p.name ?? PROVIDER_LABELS[p.provider as ProviderKind] ?? p.provider}</h2>
            <p>Model: {p.model}</p>
          </div>
          <div>
            <button onClick={() => setEditing(providerDraft(p))}>Edit</button>
            <button onClick={() => void test(p)}>Test</button>
            {!p.isDefault && <button onClick={() => client.updateLLMProvider(p.id, { isDefault: true }).then(load)}>Set Default</button>}
            <button onClick={() => remove(p.id)}>Delete</button>
          </div>
          {testing?.id === p.id && <p style={{ marginTop: "10px" }} className={testing.error ? "search-error" : "positive"}>{testing.status} {testing.error}</p>}
        </article>)}
      </div>
      {editing ? <section className="provider-editor">
        <header><div><span>{editing.id ? "Edit configuration" : "New configuration"}</span><h3>{PROVIDER_LABELS[editing.provider]}</h3></div><button onClick={() => setEditing(null)}>Cancel</button></header>
        <div className="provider-fields">
          <label>Provider<select value={editing.provider} onChange={(event) => {
            const p = event.target.value as ProviderKind;
            setEditing({ ...EMPTY_PROVIDER, id: editing.id, provider: p, model: DEFAULT_MODELS[p], isDefault: editing.isDefault });
          }}>{Object.entries(PROVIDER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Model {fetchingModels ? <small className="fetching-indicator" style={{ color: "var(--muted)" }}>(fetching available models...)</small> : null}
            {availableModels.length > 0 ? (
              <select value={editing.model} onChange={(event) => setEditing({ ...editing, model: event.target.value })}>
                {!availableModels.includes(editing.model) && editing.model && (
                  <option value={editing.model}>{editing.model} (current)</option>
                )}
                {availableModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input value={editing.model} onChange={(event) => setEditing({ ...editing, model: event.target.value })} placeholder="Model identifier" />
            )}
            {fetchError ? <span className="search-error" style={{ fontSize: "10px", display: "block", marginTop: "4px" }}>Could not fetch models: {fetchError}</span> : null}
          </label>
          {editing.provider === "vertex" ? <>
            <label>Google Cloud project ID<input value={editing.projectId} onChange={(event) => setEditing({ ...editing, projectId: event.target.value })} /></label>
            <label>Location<input value={editing.location} onChange={(event) => setEditing({ ...editing, location: event.target.value })} placeholder="europe-west4" /></label>
            <label>API key<input type="password" value={editing.apiKey} onChange={(event) => setEditing({ ...editing, apiKey: event.target.value })} placeholder="Optional; uses x-goog-api-key" /></label>
            <label>API version<select value={editing.apiVersion} onChange={(event) => setEditing({ ...editing, apiVersion: event.target.value as "v1" | "v1beta1" })}><option value="v1">v1</option><option value="v1beta1">v1beta1</option></select></label>
            <label>OAuth scopes<input value={editing.scopes} onChange={(event) => setEditing({ ...editing, scopes: event.target.value })} placeholder="Comma-separated; optional" /></label>
            <label className="checkbox-field"><input type="checkbox" checked={editing.regionalEndpoint} onChange={(event) => setEditing({ ...editing, regionalEndpoint: event.target.checked })} />Use regional endpoint</label>
          </> : <>
            <label>API key<input type="password" value={editing.apiKey} onChange={(event) => setEditing({ ...editing, apiKey: event.target.value })} placeholder="Optional when using an environment variable" /></label>
            <label>API key environment variable<input value={editing.envName} onChange={(event) => setEditing({ ...editing, envName: event.target.value })} placeholder="Uses provider default when blank" /></label>
            <label>Base URL<input value={editing.baseURL} onChange={(event) => setEditing({ ...editing, baseURL: event.target.value })} placeholder={editing.provider === "custom" || editing.provider === "litellm" ? "Required" : "Optional override"} /></label>
            {editing.provider === "openrouter" ? <><label>Site URL<input value={editing.siteUrl} onChange={(event) => setEditing({ ...editing, siteUrl: event.target.value })} /></label><label>Application name<input value={editing.appName} onChange={(event) => setEditing({ ...editing, appName: event.target.value })} /></label></> : null}
            {editing.provider === "litellm" ? <label className="checkbox-field"><input type="checkbox" checked={editing.allowUnauthenticatedLocalProxy} onChange={(event) => setEditing({ ...editing, allowUnauthenticatedLocalProxy: event.target.checked })} />Allow unauthenticated local proxy</label> : null}
          </>}
          <label className="checkbox-field"><input type="checkbox" checked={editing.isDefault} onChange={(event) => setEditing({ ...editing, isDefault: event.target.checked })} />Default provider</label>
        </div>
        <div className="search-actions"><button onClick={() => void save()}>Save</button><button onClick={() => void test(editing)}>Test connection</button></div>
        {testing && testing.id === editing.id ? <p className={testing.error ? "search-error" : "positive"}>{testing.status} {testing.error}</p> : null}
      </section> : null}
    </section>

    <section className="settings-section"><h2>Safety</h2><p>All external product sources are permanently read-only. Internal assistant actions are audited and reversible where supported.</p></section>
  </main>;
}

export function SearchesPage({ client, stores, searches, reload, catalogueChanged }: {
  client: ApiClient; stores: StoreConfig[]; searches: SavedSearch[]; reload: () => Promise<void>; catalogueChanged: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [sourceIds, setSourceIds] = useState<string[]>(stores.map((store) => store.id));
  const [watched, setWatched] = useState(true);
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [result, setResult] = useState<DirectSearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<{ search: SavedSearch; data: SavedSearchDetails } | null>(null);
  const toggle = (id: string) => setSourceIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const direct = async () => {
    setBusy(true); setError("");
    try { setResult(await client.directSearch(query, sourceIds)); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true); setError("");
    try {
      await client.createSavedSearch({ name: name.trim() || query.trim(), query, sourceIds, watched, enabled: true, intervalMinutes });
      setName(""); await reload();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  };
  const run = async (id: number) => {
    setBusy(true); setError("");
    try { await client.runSavedSearch(id); await Promise.all([reload(), catalogueChanged()]); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  };
  const update = async (search: SavedSearch, enabled: boolean) => {
    await client.updateSavedSearch(search.id, { name: search.name, query: search.query, sourceIds: search.sourceIds, watched: search.watched, enabled, intervalMinutes: search.intervalMinutes });
    await reload();
  };
  const remove = async (id: number) => { await client.deleteSavedSearch(id); await reload(); };
  const inspect = async (search: SavedSearch) => setDetails({ search, data: await client.getSavedSearchDetails(search.id) });
  return <main className="workspace-main">
    <header className="workspace-toolbar"><div><h1>Searches</h1><span>Search source systems directly or watch a query over time</span></div></header>
    <section className="search-builder">
      <label>Search query<input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="oak chair" /></label>
      <div><span>Sources</span><div className="search-source-options">{stores.map((store) => <button key={store.id} className={sourceIds.includes(store.id) ? "selected" : ""} onClick={() => toggle(store.id)}>{store.name ?? store.id}</button>)}</div></div>
      <div className="search-actions"><button onClick={direct} disabled={busy || !query.trim() || !sourceIds.length}><Icon name="search" />Search sources</button><input value={name} onChange={(event) => setName(event.currentTarget.value)} placeholder="Saved search name" /><label><input type="checkbox" checked={watched} onChange={(event) => setWatched(event.currentTarget.checked)} /> Watch</label><input type="number" min="1" value={intervalMinutes} onChange={(event) => setIntervalMinutes(Number(event.currentTarget.value))} /><button onClick={save} disabled={busy || !query.trim() || !sourceIds.length}>Save</button></div>
      {error ? <p className="search-error">{error}</p> : null}
    </section>
    {result ? <section className="open-section"><header><h2>Direct results</h2><span>{result.products.length} products</span></header><div className="search-statuses">{result.sources.map((source) => <span key={source.sourceId} className={source.status}>{source.sourceId}: {source.status === "succeeded" ? source.count : source.error}</span>)}</div><div className="search-results">{result.products.map((product) => <article key={`${product.sourceId}:${product.externalId}`}><div><span>{product.sourceId}</span><strong>{product.title}</strong></div><b>{formatPrice(product.price)}</b><a href={product.url} target="_blank" rel="noreferrer">Open</a></article>)}</div></section> : null}
    <section className="open-section"><header><h2>Saved searches</h2><span>{searches.length}</span></header><div className="source-list">{searches.map((search) => <article key={search.id}><div><span>{search.watched ? "watched" : "saved"} · {search.sourceIds.join(", ")}</span><h2>{search.name}</h2><p>{search.query}</p></div><div><strong>{search.lastRunStatus ?? (search.enabled ? "Ready" : "Paused")}</strong><span>{search.watched ? `Every ${search.intervalMinutes} min` : "Manual runs"}</span><button disabled={busy} onClick={() => run(search.id)}>Run now</button><button onClick={() => inspect(search)}>View history</button>{search.watched ? <button onClick={() => update(search, !search.enabled)}>{search.enabled ? "Pause" : "Enable"}</button> : null}<button onClick={() => remove(search.id)}>Delete</button></div></article>)}</div></section>
    {details ? <section className="open-section"><header><h2>{details.search.name} history</h2><span>{details.data.results.length} current results · {details.data.runs.length} runs</span></header><div className="search-history"><div><h3>Current results</h3>{details.data.results.map((item) => <p key={`${item.sourceId}:${item.productId}`}>{item.sourceId} · {item.product.summary?.name ?? item.productId}</p>)}</div><div><h3>Recent runs</h3>{details.data.runs.map((run) => <p key={run.id}>{run.status} · {run.resultCount} results · {new Date(run.completedAt).toLocaleString()}</p>)}</div><div><h3>Membership changes</h3>{details.data.events.map((event) => <p key={event.id}>{event.eventType.replace("search_result.", "")} · {event.sourceId}:{event.productId}</p>)}</div></div></section> : null}
  </main>;
}
