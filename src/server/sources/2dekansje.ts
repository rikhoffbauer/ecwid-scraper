import type { JsonObject } from "../../shared/types.ts";
import type { ProductOfferingInput, ReadOnlySourceAdapter, SourceConfig } from "./types.ts";

export interface TweedekansjeConfig extends SourceConfig {
  kind: "2dekansje";
}

async function* crawlTweedekansjeCategory(config: TweedekansjeConfig, context: any, categoryPath: string, seenProductIds: Set<string>) {
  const baseUrl = config.url.replace(/\/$/, "");
  let cursor = "";
  let hasNextPage = true;
  const seenCursors = new Set<string>();
  
  while (hasNextPage) {
    if (cursor) {
      if (seenCursors.has(cursor)) break;
      seenCursors.add(cursor);
    }
    
    const joinChar = categoryPath.includes('?') ? '&' : '?';
    const pageUrl = cursor 
      ? `${baseUrl}${categoryPath}${joinChar}cursor=${encodeURIComponent(cursor)}&direction=next` 
      : `${baseUrl}${categoryPath}`;
      
    const response = await context.http.fetch(pageUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    
    if (!response.ok) {
      break;
    }
    
    const html = await response.text();
    
    // Reconstruct Next.js metadata from self.__next_f.push calls
    const nextFMatches = [...html.matchAll(/self\.__next_f\.push\(\s*\[\s*\d+\s*,\s*([\s\S]*?)\s*\]\s*\)/g)];
    let combinedNextF = "";
    for (const m of nextFMatches) {
      let rawStr = m[1].trim();
      if (rawStr.startsWith('"') && rawStr.endsWith('"')) {
        try {
          combinedNextF += JSON.parse(rawStr);
        } catch (e) {
          combinedNextF += rawStr.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
        }
      } else {
        combinedNextF += rawStr;
      }
    }
    
    // Parse id:json structure from the combined string
    const registry = new Map<string, any>();
    const lines = combinedNextF.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const matchLine = line.match(/^([a-fA-F0-9]+):([\s\S]*)$/);
      if (matchLine) {
        const id = matchLine[1]!;
        const content = matchLine[2]!;
        try {
          registry.set(id, JSON.parse(content));
        } catch (e) {
          // Accumulate if JSON spans multiple lines
          let accumulated = content;
          let parsed = false;
          let j = i;
          while (j < lines.length - 1 && !parsed) {
            try {
              registry.set(id, JSON.parse(accumulated));
              parsed = true;
              i = j;
            } catch (err) {
              j++;
              accumulated += '\n' + (lines[j] ?? "");
            }
          }
          if (!parsed) {
            registry.set(id, content);
          }
        }
      }
    }
    
    // Helper to resolve Next.js references recursively (memoized, circular safe)
    const cache = new Map<string, any>();
    const resolveRefs = (value: any, resolving = new Set<string>()): any => {
      if (typeof value === 'string' && value.startsWith('$')) {
        const refId = value.substring(1);
        if (cache.has(refId)) {
          return cache.get(refId);
        }
        if (resolving.has(refId)) {
          return undefined; // Circular reference detected
        }
        if (registry.has(refId)) {
          resolving.add(refId);
          const resolved = resolveRefs(registry.get(refId), resolving);
          resolving.delete(refId);
          cache.set(refId, resolved);
          return resolved;
        }
      }
      if (Array.isArray(value)) {
        return value.map(val => resolveRefs(val, resolving));
      }
      if (value && typeof value === 'object') {
        const resolvedObj: any = {};
        for (const [k, val] of Object.entries(value)) {
          resolvedObj[k] = resolveRefs(val, resolving);
        }
        return resolvedObj;
      }
      return value;
    };
    
    // Extract pageInfo
    let pageInfo: { hasNextPage?: boolean; endCursor?: string } = {};
    const pageInfoIdx = combinedNextF.indexOf('"pageInfo"');
    if (pageInfoIdx !== -1) {
      // Parse pageInfo by reading until matching brace
      let braceCount = 0;
      let start = combinedNextF.indexOf('{', pageInfoIdx);
      if (start !== -1) {
        let end = start;
        let inString = false;
        let escape = false;
        for (let i = start; i < combinedNextF.length; i++) {
          const char = combinedNextF[i];
          if (escape) { escape = false; continue; }
          if (char === '\\') { escape = true; continue; }
          if (char === '"') { inString = !inString; continue; }
          if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                end = i + 1;
                break;
              }
            }
          }
        }
        try {
          pageInfo = JSON.parse(combinedNextF.substring(start, end));
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
    
    hasNextPage = !!pageInfo.hasNextPage;
    cursor = pageInfo.endCursor || "";
    
    const products: ProductOfferingInput[] = [];
    let totalProductsOnPage = 0;
    
    for (const [id, value] of registry.entries()) {
      if (value && typeof value === 'object' && value.id && typeof value.id === 'string' && value.id.startsWith('gid://shopify/Product/')) {
        totalProductsOnPage++;
        const p = resolveRefs(value);
        const numericalId = p.id.split("/").pop();
        if (!numericalId || seenProductIds.has(numericalId)) continue;
        seenProductIds.add(numericalId);
        
        const pPrice = parseFloat(p.priceRange?.minVariantPrice?.amount || p.variants?.[0]?.price?.amount || "0");
        
        // Process compareAtPrice if available
        let compareAtPrice: number | undefined;
        if (p.marketplacePrice && p.marketplacePrice.value) {
          try {
            const marketplaceVal = JSON.parse(p.marketplacePrice.value);
            if (marketplaceVal.amount) {
              compareAtPrice = parseFloat(marketplaceVal.amount);
            }
          } catch (e) {
            // Ignore
          }
        }
        if (!compareAtPrice && p.variants?.[0]?.compareAtPrice?.amount) {
          compareAtPrice = parseFloat(p.variants[0].compareAtPrice.amount);
        }
        
        const imageUrls = p.images?.map((img: any) => img.url) || [];
        
        products.push({
          sourceId: config.id,
          sourceKind: "2dekansje",
          externalId: numericalId,
          title: p.title,
          url: `${baseUrl}/product/${p.handle}/`,
          imageUrls,
          currency: p.priceRange?.minVariantPrice?.currencyCode || p.variants?.[0]?.price?.currencyCode || "EUR",
          price: pPrice,
          compareAtPrice,
          availability: p.totalInventory > 0 || p.availableForSale ? "available" : "unavailable",
          seller: p.vendor || undefined,
          categories: p.collections?.edges?.map((edge: any) => edge.node?.handle).filter(Boolean) || [],
          attributes: {
            condition: p.condition?.value || undefined,
            sku: p.variants?.[0]?.sku || undefined,
            articleCode: p.articleCode?.value || undefined
          },
          raw: p as unknown as JsonObject
        });
      }
    }
    
    if (products.length > 0) {
      yield products;
    }
    
    // Safeguard: If we parsed 0 products in total from this response, break immediately
    if (totalProductsOnPage === 0) {
      break;
    }
  }
}

export function createTweedekansjeAdapter(): ReadOnlySourceAdapter<TweedekansjeConfig> {
  return {
    kind: "2dekansje",
    async *fetchProducts(config, context) {
      const baseUrl = config.url.replace(/\/$/, "");
      
      // Step 1: Fetch home page to extract categories
      const homeUrl = baseUrl + "/";
      const homeResponse = await context.http.fetch(homeUrl, {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      
      const homeHtml = homeResponse.ok ? await homeResponse.text() : "";
      
      // Extract unique category paths from hrefs
      const hrefRegex = /href=\"([^\"]+)\"/gi;
      const hrefs: string[] = [];
      let match;
      while ((match = hrefRegex.exec(homeHtml)) !== null) {
        if (match[1]) hrefs.push(match[1]);
      }
      
      const excluded = [
        "/contact", "/over-ons", "/blog", "/account", "/cart", "/checkout", "/login", 
        "/register", "/terms", "/privacy", "/cookies", "/klantenservice", "/faq", 
        "/verzendbeleid", "/retourbeleid", "/garantie", "/over-tweede-kans", 
        "/waarom-2dekansje", "/winkels", "/zakelijk-inkopen", "/affiliate", "/vacatures", "/service"
      ];
      
      let categories = [...new Set(hrefs)]
        .filter(h => h.startsWith('/') && h.length > 1 && !h.startsWith('//') && !excluded.some(ex => h.includes(ex)) && !h.includes('/product/'))
        .map(h => (h.split('?')[0] ?? "").split('#')[0]!.replace(/\/$/, ""))
        .filter((h, i, self) => self.indexOf(h) === i && !h.startsWith("/_next") && !h.includes("/cdn-cgi"));
      
      // Fallback categories if extraction yields too few or none
      const fallbackCategories = [
        "/wonen-koken",
        "/huis-tuin",
        "/hobby-sport",
        "/elektronica",
        "/mooi-gezond",
        "/auto-fiets",
        "/gereedschap",
        "/kleding",
        "/net-binnen/nieuwste-tweedekansjes"
      ];
      
      if (categories.length === 0) {
        categories = fallbackCategories;
      } else {
        // Merge with fallback to make sure we don't miss key categories
        for (const fb of fallbackCategories) {
          if (!categories.includes(fb)) {
            categories.push(fb);
          }
        }
      }
      
      const seenProductIds = new Set<string>();
      
      // Step 2: Crawl each category
      for (const category of categories) {
        yield* crawlTweedekansjeCategory(config, context, category, seenProductIds);
      }
    },

    async *searchProducts(config, input, context) {
      const searchPath = `/search?q=${encodeURIComponent(input.query)}`;
      yield* crawlTweedekansjeCategory(config, context, searchPath, new Set());
    }
  };
}
