import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { OperationsDatabase } from "../src/server/operations/database.ts";
import { SourceOnboardingManager, validateOnboardingInput } from "../src/server/source-onboarding.ts";
import { adapterPath } from "../src/server/sources/generated.ts";

const roots: string[] = [];
const databases: OperationsDatabase[] = [];
afterEach(() => {
  for (const db of databases.splice(0)) db.close();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const input = {
  id: "generated-shop",
  name: "Generated Shop",
  catalogUrl: "https://example.com/catalog?page=1",
  catalogPageNumber: 1,
  productUrl: "https://example.com/product/one",
  searchUrl: "https://example.com/search?q=chair",
  searchQuery: "chair"
};

const adapter = `
function product(config, id, url) { return { sourceId: config.id, sourceKind: "generated", externalId: id, title: "Chair " + id, url, imageUrls: [], availability: "available", categories: ["chairs"], attributes: {}, raw: { id } }; }
export async function fetchCatalogPage({config,url,pageNumber}, context) { return { products: [product(config, String(pageNumber), url)], nextPageUrl: pageNumber === 1 ? "https://example.com/catalog?page=2" : undefined }; }
export async function fetchProduct({config,url}, context) { return product(config, "one", url); }
export async function fetchSearchResults({config,url,query}, context) { return { products: [product(config, "search-" + query, url)] }; }
`;

function manager(verdict = "PASS") {
  const root = mkdtempSync(path.join(os.tmpdir(), "onboarding-test-"));
  roots.push(root);
  const fake = path.join(root, "fake-gemini.ts");
  writeFileSync(fake, `
import { writeFileSync } from "node:fs";
if (process.argv.includes("plan")) console.log(${JSON.stringify(verdict)});
else { writeFileSync("adapter.ts", ${JSON.stringify(adapter)}); console.log("{}"); }
`);
  const db = new OperationsDatabase(":memory:");
  databases.push(db);
  return { root, db, value: new SourceOnboardingManager(db, { cwd: root, geminiCommand: [process.execPath, fake], browserCommand: [], fetchImpl: (async () => new Response("<html>fixture</html>")) as unknown as typeof fetch }) };
}

async function terminal(manager: SourceOnboardingManager, id: string) {
  for (let index = 0; index < 500; index += 1) {
    const job = manager.get(id)!;
    if (!["queued", "running"].includes(job.status)) return job;
    await Bun.sleep(20);
  }
  throw new Error("job did not finish");
}

describe("source onboarding", () => {
  test("validates public anonymous onboarding input", () => {
    expect(validateOnboardingInput(input).searchQuery).toBe("chair");
    expect(() => validateOnboardingInput({ ...input, catalogUrl: "file:///tmp/catalog" })).toThrow(/http or https/);
  });

  test("generates, verifies, activates, and persists a source", async () => {
    const setup = manager();
    const job = await terminal(setup.value, setup.value.create(input).id);
    expect(job.status).toBe("activated");
    expect(existsSync(adapterPath(input.id, setup.root))).toBe(true);
    expect(setup.db.getStore(input.id)).toMatchObject({ kind: "generated", adapterId: input.id, enabled: true });
    expect(job.preview?.catalog[0]?.externalId).toBe("1");
    expect(job.preview?.nextCatalog?.[0]?.externalId).toBe("2");
  });

  test("requires approval when independent verification is inconclusive", async () => {
    const setup = manager("INCONCLUSIVE");
    const job = await terminal(setup.value, setup.value.create(input).id);
    expect(job.status).toBe("inconclusive");
    setup.value.approve(job.id);
    expect(job.status).toBe("activated");
  });
});
