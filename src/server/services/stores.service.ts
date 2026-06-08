import { OperationsDatabase } from "../operations/database.ts";
import { syncStoreStream } from "../sync.ts";
import type { StoreConfig } from "../../shared/types.ts";

export class StoresService {
  constructor(private readonly db: OperationsDatabase) {}

  listStores() {
    return this.db.listStores();
  }

  addStore(input: StoreConfig) {
    this.db.addStore(input);
  }

  updateStore(id: string, input: StoreConfig) {
    this.db.addStore({ ...input, id });
  }

  deleteStore(id: string) {
    this.db.deleteStore(id);
  }

  getConfig() {
    return {
      stores: this.db.listStores(),
      defaultSyncIntervalMinutes: 30,
    };
  }

  async *syncStores(storeIdParam?: string | null) {
    const enabledStores = this.db.listStores().filter((store: any) => store.enabled !== false);
    const config = { stores: enabledStores, defaultSyncIntervalMinutes: 30 };
    
    const targetStores = storeIdParam
      ? enabledStores.filter((s: any) => s.id === storeIdParam)
      : enabledStores;

    const now = new Date();
    const observedAt = now.toISOString().replace(/\.\d{3}Z$/, "Z");
    const runId = observedAt
      .replaceAll(/[-:]/g, "")
      .replace("T", "-")
      .replace("Z", "Z");

    for (const store of targetStores) {
      for await (const message of syncStoreStream(
        config,
        store,
        runId,
        observedAt,
        {},
        this.db,
      )) {
        yield message;
      }
    }
  }
}
