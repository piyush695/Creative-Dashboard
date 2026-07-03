import { NextResponse } from "next/server";
import {
  fetchOwnAds,
  fetchCompetitorAds,
  fetchAdLibrary,
  getFullBrandContext,
  clearAdLibraryCache,
  getKnownCompetitors,
  HOLA_PRIME_BRAND_DNA,
  buildBrandDNAContext,
} from "@/server/ai-studio/adlibrary";
import {
  upsertAds,
  getTopPerformingAds,
  getAdsByBrand,
  getAdById,
  getAdLibraryStats,
} from "@/server/ai-studio/ad-library-db";
import { syncAdLibrary } from "@/server/ai-studio/ad-library-sync";
import { requireSession } from "@/server/api-auth";
import { syncLocalAdLibrary } from "@/server/ai-studio/ad-library-local-sync";
import { summarizePatterns, buildPatternContext } from "@/server/ai-studio/ad-pattern-extractor";

/**
 * GET /api/adlibrary
 *
 * Live Meta API actions:
 *   ?action=own              — Fetch HolaPrime ads (live API). Also upserts into DB.
 *   ?action=competitor&q=    — Fetch competitor ads by name. Also upserts into DB.
 *   ?action=search&q=        — Generic ad library search.
 *   ?action=brand-dna        — Fetch own ads + extract aggregate Brand DNA.
 *
 * Stored DB actions:
 *   ?action=stats            — Counts, brand breakdown, last sync time.
 *   ?action=top              — Top performers from DB (sorted by performanceScore).
 *   ?action=browse&brand=    — All ads stored for a brand.
 *   ?action=detail&id=       — Single stored ad by Meta ID.
 *   ?action=pattern-summary  — Aggregated pattern insights for prompt injection.
 *
 * Sync:
 *   ?action=sync-all         — Run full sync (HolaPrime + 12 competitors across 10 countries).
 *                              Returns when complete. Long-running.
 *   ?action=sync-status      — Stub for future async-mode tracking.
 *
 * Meta:
 *   ?action=competitors      — List configured competitor brands.
 *   ?action=clear-cache      — Clear in-memory Meta API cache (DB untouched).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "own";

  try {
    // ─── Live Meta API actions — also persist on the way through ────────
    if (action === "own") {
      const activeOnly = searchParams.get("active") === "true";
      const limit = parseInt(searchParams.get("limit") || "25", 10);
      const result = await fetchOwnAds({ activeOnly, limit });
      if (result.ads.length > 0) {
        await upsertAds(result.ads, "own", "Hola Prime");
      }
      return NextResponse.json(result);
    }

    if (action === "competitor") {
      const q = searchParams.get("q");
      if (!q) return NextResponse.json({ error: 'Query parameter "q" required' }, { status: 400 });
      const activeOnly = searchParams.get("active") !== "false";
      const limit = parseInt(searchParams.get("limit") || "15", 10);
      const pageId = searchParams.get("pageId") || undefined;
      const result = await fetchCompetitorAds(q, { activeOnly, limit, pageId });
      if (result.ads.length > 0) {
        await upsertAds(result.ads, "competitor", q);
      }
      return NextResponse.json(result);
    }

    if (action === "search") {
      const q = searchParams.get("q");
      if (!q) return NextResponse.json({ error: 'Query parameter "q" required' }, { status: 400 });
      const activeOnly = searchParams.get("active") === "true" ? "ACTIVE" : "ALL";
      const limit = parseInt(searchParams.get("limit") || "25", 10);
      const country = searchParams.get("country") || "US";
      const result = await fetchAdLibrary(q, {
        adActiveStatus: activeOnly as any,
        limit,
        country,
      });
      return NextResponse.json(result);
    }

    if (action === "brand-dna") {
      const { brandDNA, adsResult, brandDNAContext, adLibraryContext } = await getFullBrandContext();
      return NextResponse.json({
        brandDNA: brandDNA || HOLA_PRIME_BRAND_DNA,
        adsSummary: {
          totalAds: adsResult?.totalCount || 10,
          activeAds: adsResult?.ads?.filter((a: any) => a.isActive).length || 10,
          fetchedAt: adsResult?.fetchedAt || new Date().toISOString(),
          source: adsResult ? "ad-library-api" : "hardcoded-brand-dna",
        },
        _brandDNAContext: brandDNAContext || buildBrandDNAContext(HOLA_PRIME_BRAND_DNA),
        _adLibraryContext: adLibraryContext,
      });
    }

    // ─── Stored DB actions ──────────────────────────────────────────────
    if (action === "stats") {
      const stats = await getAdLibraryStats();
      return NextResponse.json(stats);
    }

    if (action === "top") {
      const limit = parseInt(searchParams.get("limit") || "20", 10);
      const source = (searchParams.get("source") as "own" | "competitor" | null) || undefined;
      const brand = searchParams.get("brand") || undefined;
      const activeOnly = searchParams.get("active") !== "false";
      const top = await getTopPerformingAds({ limit, source, brand, activeOnly });
      return NextResponse.json({ ads: top, totalCount: top.length });
    }

    if (action === "browse") {
      const brand = searchParams.get("brand");
      if (!brand) {
        return NextResponse.json({ error: 'Query parameter "brand" required' }, { status: 400 });
      }
      const limit = parseInt(searchParams.get("limit") || "50", 10);
      const ads = await getAdsByBrand(brand, limit);
      return NextResponse.json({ ads, totalCount: ads.length, brand });
    }

    if (action === "detail") {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: 'Query parameter "id" required' }, { status: 400 });
      const ad = await getAdById(id);
      if (!ad) return NextResponse.json({ error: "Ad not found" }, { status: 404 });
      return NextResponse.json({ ad });
    }

    if (action === "pattern-summary") {
      const limit = parseInt(searchParams.get("limit") || "60", 10);
      const source = (searchParams.get("source") as "own" | "competitor" | null) || undefined;
      const top = await getTopPerformingAds({ limit, source, activeOnly: true });
      const summary = summarizePatterns(top);
      const context = buildPatternContext(summary);
      return NextResponse.json({ summary, context, sourceAdCount: top.length });
    }

    // ─── Sync (mutating-by-GET: writes to Mongo) — verified session required ──
    if (action === "sync-all" || action === "sync-local") {
      const unauth = await requireSession();
      if (unauth) return unauth;
    }
    if (action === "sync-all") {
      const skipPatterns = searchParams.get("skipPatterns") === "true";
      const countriesParam = searchParams.get("countries");
      const countries = countriesParam ? countriesParam.split(",").map((c) => c.trim()) : undefined;
      const adsPerBrand = searchParams.get("adsPerBrand")
        ? parseInt(searchParams.get("adsPerBrand")!, 10)
        : undefined;

      const result = await syncAdLibrary({
        countries,
        adsPerBrand,
        skipPatterns,
      });
      return NextResponse.json({ success: true, result });
    }

    // ─── Local sync (manual fallback — reads from public/ad-library-uploads) ─
    if (action === "sync-local") {
      const skipPatterns = searchParams.get("skipPatterns") === "true";
      const patternBudget = searchParams.get("patternBudget")
        ? parseInt(searchParams.get("patternBudget")!, 10)
        : undefined;

      const result = await syncLocalAdLibrary({
        patternBudget,
        skipPatterns,
      });
      return NextResponse.json({ success: true, result });
    }

    // ─── Meta ────────────────────────────────────────────────────────────
    if (action === "competitors") {
      return NextResponse.json({ competitors: getKnownCompetitors() });
    }

    if (action === "clear-cache") {
      clearAdLibraryCache();
      return NextResponse.json({ success: true, message: "In-memory ad library cache cleared" });
    }

    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("[AdLibrary API] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
