import type { AppConfig, DirectSearchResult, EnrichmentApplyResult, EnrichmentProposals, EnrichmentRun, LoadedProduct, OnboardingJob, ProductEvent, SavedSearch, SavedSearchDetails, StoreConfig } from "../shared/types";

export class ApiClient {
  constructor(private url: string) {}

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.url}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
    if (!res.ok) {
        throw new Error(`API Error: ${res.statusText}`);
    }
    return res.json();
  }

  async searchProducts(params: {
    query?: string;
    storeFilter?: string[];
    favorites?: string[];
    activeListKeys?: string[];
    showHidden?: boolean;
    sortKey?: string;
    offset?: number;
    limit?: number;
  }): Promise<{ total: number; products: import("../shared/catalog").CatalogProduct[] }> {
    const res = await this.fetch<{ total: number; products: any[] }>("/api/products/search", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return {
      total: res.total,
      products: res.products
    };
  }

  async getAnalysis(): Promise<import("../shared/types").AnalysisSnapshot> {
    return this.fetch<import("../shared/types").AnalysisSnapshot>("/api/analysis");
  }

  async getEvents(): Promise<ProductEvent[]> {
    return this.fetch<ProductEvent[]>("/api/events");
  }

  async sync(storeId?: string, onProgress?: (message: string) => void): Promise<void> {
    const url = storeId ? `/api/sync?storeId=${encodeURIComponent(storeId)}` : "/api/sync";
    const response = await fetch(`${this.url}${url}`, {
        method: "POST"
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
            const chunk = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            boundary = buffer.indexOf("\n\n");
            
            const eventMatch = chunk.match(/^event:\s*(.*?)$/m);
            const dataMatch = chunk.match(/^data:\s*(.*?)$/m);
            
            if (eventMatch && dataMatch && dataMatch[1]) {
                const event = eventMatch[1];
                const data = JSON.parse(dataMatch[1]);
                
                if (event === "error") {
                    throw new Error(data.error);
                } else if (event === "progress") {
                    if (onProgress) {
                        if (data.type === 'progress') {
                            onProgress(`Syncing ${data.storeId}... Fetched ${data.fetched}`);
                        } else if (data.type === 'summary') {
                            onProgress(`Finished ${data.summary.storeId}. Fetched: ${data.summary.fetched}, Created: ${data.summary.created}, Updated: ${data.summary.updated}`);
                        }
                    }
                } else if (event === "done") {
                    return;
                }
            }
        }
    }
  }

  async getConfig(): Promise<AppConfig> {
      const res = await this.fetch<any>("/api/config").catch(() => null);
      if (res) return res;
      return {
          defaultSyncIntervalMinutes: 30,
          stores: []
      };
  }

  async createStore(store: StoreConfig): Promise<void> {
    await this.fetch("/api/stores", { method: "POST", body: JSON.stringify(store) });
  }

  async updateStore(id: string, store: StoreConfig): Promise<void> {
    await this.fetch(`/api/stores/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(store) });
  }

  async deleteStore(id: string): Promise<void> {
    await this.fetch(`/api/stores/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async directSearch(query: string, sourceIds: string[]): Promise<DirectSearchResult> {
    return this.fetch("/api/search/direct", { method: "POST", body: JSON.stringify({ query, sourceIds }) });
  }

  async getSavedSearches(): Promise<SavedSearch[]> {
    return this.fetch("/api/searches");
  }

  async createSavedSearch(input: Omit<SavedSearch, "id" | "nextRunAt" | "lastRunAt" | "lastRunStatus">): Promise<SavedSearch> {
    return this.fetch("/api/searches", { method: "POST", body: JSON.stringify(input) });
  }

  async updateSavedSearch(id: number, input: Omit<SavedSearch, "id" | "nextRunAt" | "lastRunAt" | "lastRunStatus">): Promise<SavedSearch> {
    return this.fetch(`/api/searches/${id}`, { method: "PUT", body: JSON.stringify(input) });
  }

  async deleteSavedSearch(id: number): Promise<void> {
    await this.fetch(`/api/searches/${id}`, { method: "DELETE" });
  }

  async runSavedSearch(id: number): Promise<unknown> {
    return this.fetch(`/api/searches/${id}/run`, { method: "POST" });
  }

  async getSavedSearchDetails(id: number): Promise<SavedSearchDetails> {
    const [results, runs, events] = await Promise.all([
      this.fetch<SavedSearchDetails["results"]>(`/api/searches/${id}/results`),
      this.fetch<SavedSearchDetails["runs"]>(`/api/searches/${id}/runs`),
      this.fetch<SavedSearchDetails["events"]>(`/api/searches/${id}/events`)
    ]);
    return { results, runs, events };
  }

  async createOnboardingJob(input: Record<string, unknown>, token: string): Promise<OnboardingJob> {
    return this.fetch("/api/source-onboarding/jobs", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(input) });
  }

  async getOnboardingJob(id: string, token: string): Promise<OnboardingJob> {
    return this.fetch(`/api/source-onboarding/jobs/${id}`, { headers: { authorization: `Bearer ${token}` } });
  }

  async onboardingAction(id: string, action: "approve" | "reject" | "retry", token: string): Promise<OnboardingJob> {
    return this.fetch(`/api/source-onboarding/jobs/${id}/${action}`, { method: "POST", headers: { authorization: `Bearer ${token}` } });
  }

  async getLLMProviders(): Promise<LLMProvider[]> {
    return this.fetch<LLMProvider[]>("/api/llm-providers");
  }

  async createLLMProvider(input: Omit<LLMProvider, "id" | "createdAt" | "updatedAt">): Promise<LLMProvider> {
    return this.fetch("/api/llm-providers", { method: "POST", body: JSON.stringify(input) });
  }

  async updateLLMProvider(id: number, input: Partial<Omit<LLMProvider, "id" | "createdAt" | "updatedAt">>): Promise<LLMProvider> {
    return this.fetch(`/api/llm-providers/${id}`, { method: "PUT", body: JSON.stringify(input) });
  }

  async deleteLLMProvider(id: number): Promise<void> {
    await this.fetch(`/api/llm-providers/${id}`, { method: "DELETE" });
  }

  async testLLMProvider(input: { provider: string; configJson: string; model: string }): Promise<{ ok: boolean; message?: string; error?: string }> {
    return this.fetch("/api/llm-providers/test", { method: "POST", body: JSON.stringify(input) });
  }

  async fetchLLMModels(input: { provider: string; configJson: string }): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    return this.fetch("/api/llm-providers/models", { method: "POST", body: JSON.stringify(input) });
  }

  async getEnrichmentRuns(): Promise<EnrichmentRun[]> {
    return this.fetch("/api/enrichment/runs");
  }

  async prepareEnrichmentRun(input: { runId?: string; embeddingProviderId?: number; embeddingModel?: string; minimumEmbeddingScore?: number } = {}): Promise<{ runId: string; databasePath: string; embeddingCandidates: number; validationErrors: string[] }> {
    return this.fetch("/api/enrichment/runs", { method: "POST", body: JSON.stringify(input) });
  }

  async executeEnrichmentRun(runId: string): Promise<{ code: number; stdout: string; stderr: string; validationErrors: string[] }> {
    return this.fetch(`/api/enrichment/runs/${encodeURIComponent(runId)}/execute`, { method: "POST" });
  }

  async getEnrichmentProposals(runId: string): Promise<EnrichmentProposals> {
    return this.fetch(`/api/enrichment/runs/${encodeURIComponent(runId)}/proposals`);
  }

  async updateEnrichmentProposal(runId: string, input: { table: string; id: number; reviewState: "pending" | "accepted" | "rejected" }): Promise<{ updated: boolean }> {
    return this.fetch(`/api/enrichment/runs/${encodeURIComponent(runId)}/proposals`, { method: "POST", body: JSON.stringify(input) });
  }

  async applyEnrichmentRun(runId: string): Promise<EnrichmentApplyResult> {
    return this.fetch(`/api/enrichment/runs/${encodeURIComponent(runId)}/apply`, { method: "POST" });
  }

  async deleteEnrichmentRun(runId: string): Promise<void> {
    await this.fetch(`/api/enrichment/runs/${encodeURIComponent(runId)}`, { method: "DELETE" });
  }
}
import type { LLMProvider } from "../shared/types";
