import { NextResponse } from 'next/server';
import {
  fetchOwnAds,
  fetchCompetitorAds,
  fetchAdLibrary,
  extractBrandDNA,
  getFullBrandContext,
  getFullBrandContextFromDB,
  clearAdLibraryCache,
  getKnownCompetitors,
  HOLA_PRIME_BRAND_DNA,
  buildBrandDNAContext,
} from '@/lib/ai-studio/adlibrary';

/**
 * GET /api/adlibrary
 *
 * Actions:
 *   ?action=own          — Fetch Hola Prime's own ads
 *   ?action=competitor&q= — Fetch competitor ads by name
 *   ?action=search&q=    — Generic ad library search
 *   ?action=brand-dna    — Fetch own ads + extract brand DNA
 *   ?action=competitors  — List known prop firm competitors
 *   ?action=clear-cache  — Clear ad library cache
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'own';

  try {
    // ── Fetch Hola Prime's own ads ──
    if (action === 'own') {
      const activeOnly = searchParams.get('active') === 'true';
      const limit = parseInt(searchParams.get('limit') || '25', 10);
      const result = await fetchOwnAds({ activeOnly, limit });
      return NextResponse.json(result);
    }

    // ── Fetch competitor ads ──
    if (action === 'competitor') {
      const q = searchParams.get('q');
      if (!q) return NextResponse.json({ error: 'Query parameter "q" required' }, { status: 400 });
      const activeOnly = searchParams.get('active') !== 'false';
      const limit = parseInt(searchParams.get('limit') || '15', 10);
      const pageId = searchParams.get('pageId') || undefined;
      const result = await fetchCompetitorAds(q, { activeOnly, limit, pageId });
      return NextResponse.json(result);
    }

    // ── Generic search ──
    if (action === 'search') {
      const q = searchParams.get('q');
      if (!q) return NextResponse.json({ error: 'Query parameter "q" required' }, { status: 400 });
      const activeOnly = searchParams.get('active') === 'true' ? 'ACTIVE' : 'ALL';
      const limit = parseInt(searchParams.get('limit') || '25', 10);
      const country = searchParams.get('country') || 'US';
      const result = await fetchAdLibrary(q, {
        adActiveStatus: activeOnly as any,
        limit,
        country,
      });
      return NextResponse.json(result);
    }

    // ── Extract Brand DNA from own ads ──
    if (action === 'brand-dna') {
      const { brandDNA, adsResult, brandDNAContext, adLibraryContext } = await getFullBrandContext();

      // getFullBrandContext now ALWAYS returns brandDNA (hardcoded fallback)
      return NextResponse.json({
        brandDNA: brandDNA || HOLA_PRIME_BRAND_DNA,
        adsSummary: {
          totalAds: adsResult?.totalCount || 10,
          activeAds: adsResult?.ads?.filter((a: any) => a.isActive).length || 10,
          fetchedAt: adsResult?.fetchedAt || new Date().toISOString(),
          source: adsResult ? 'ad-library-api' : 'hardcoded-brand-dna',
        },
        _brandDNAContext: brandDNAContext || buildBrandDNAContext(HOLA_PRIME_BRAND_DNA),
        _adLibraryContext: adLibraryContext,
      });
    }

    // ── List known competitors ──
    if (action === 'competitors') {
      return NextResponse.json({ competitors: getKnownCompetitors() });
    }

    // ── Clear cache ──
    if (action === 'clear-cache') {
      clearAdLibraryCache();
      return NextResponse.json({ success: true, message: 'Ad Library cache cleared' });
    }

    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('[AdLibrary API] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
