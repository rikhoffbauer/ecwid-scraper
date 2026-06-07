import { OperationsDatabase } from "./src/operations/database.ts";
import { diffJson } from "./src/json-diff.ts";

const db = new OperationsDatabase(".ecwid-sync/operations.sqlite");
const evs = db.listEvents("store-1");
console.log(evs.filter(e => e.eventType === "product.field_changed").map(e => ({ path: (e as any).path, before: (e as any).before, after: (e as any).after })));
db.close();
