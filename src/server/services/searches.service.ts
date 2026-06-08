import { OperationsDatabase } from "../operations/database.ts";
import { runDueSavedSearches, runSavedSearch, searchSources } from "../searches.ts";

export class SearchesService {
  constructor(private readonly db: OperationsDatabase) {}

  async searchDirect(query: string, sourceIds: string[]) {
    return searchSources(this.db.listStores(), {
      query: query ?? "",
      sourceIds: sourceIds ?? [],
    });
  }

  listSavedSearches() {
    return this.db.listSavedSearches();
  }

  createSavedSearch(input: any) {
    if (
      !input.name?.trim() ||
      !input.query?.trim() ||
      !Array.isArray(input.sourceIds) ||
      !input.sourceIds.length
    ) {
      throw new Error("name, query, and at least one sourceId are required");
    }
    return this.db.createSavedSearch({
      ...input,
      name: input.name.trim(),
      query: input.query.trim(),
    });
  }

  async runDueSavedSearches() {
    return runDueSavedSearches(this.db);
  }

  getSavedSearch(id: number) {
    return this.db.savedSearch(id);
  }

  updateSavedSearch(id: number, input: any) {
    if (
      !input.name?.trim() ||
      !input.query?.trim() ||
      !Array.isArray(input.sourceIds) ||
      !input.sourceIds.length
    ) {
      throw new Error("name, query, and at least one sourceId are required");
    }
    return this.db.updateSavedSearch(id, {
      ...input,
      name: input.name.trim(),
      query: input.query.trim(),
    });
  }

  deleteSavedSearch(id: number) {
    return this.db.deleteSavedSearch(id);
  }

  async runSavedSearch(id: number) {
    const search = this.db.savedSearch(id);
    if (!search) throw new Error("not found");
    return runSavedSearch(this.db, search);
  }

  listSavedSearchResults(id: number) {
    return this.db.listSavedSearchResults(id);
  }

  listSavedSearchRuns(id: number) {
    return this.db.listSavedSearchRuns(id);
  }

  listSavedSearchEvents(id: number) {
    return this.db.listSavedSearchEvents(id);
  }
}
