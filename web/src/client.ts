import type { AppConfig, LoadedProduct, ProductEvent, StoreConfig } from "./types";

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

  async getProducts(): Promise<LoadedProduct[]> {
    const data = await this.fetch<Array<{ storeId?: string, productId: string; hash: string; product: Record<string, unknown> }>>("/api/products");
    return data.map(d => ({
        storeId: d.storeId || "unknown",
        path: `products/${d.productId}`,
        hash: d.hash,
        summary: (d.product as any).summary || d.product,
        product: d.product
    }));
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
}