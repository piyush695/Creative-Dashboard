/**
 * API Test Suite — Tests every endpoint in the Creative Studio
 * 
 * Usage:
 *   1. Start the dev server: npm run dev
 *   2. In another terminal: node scripts/test-all-endpoints.js
 * 
 * Tests run sequentially so you can see each result.
 * Green ✓ = pass, Red ✗ = fail
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const API = `${BASE}/api/studio`;

// ── Helpers ──
async function test(name, fn) {
  try {
    const start = Date.now();
    const result = await fn();
    const ms = Date.now() - start;
    console.log(`  ✓ ${name} (${ms}ms)`, result?.summary || '');
    return result?.data;
  } catch (err) {
    console.log(`  ✗ ${name} — ${err.message}`);
    return null;
  }
}

async function get(action, params = '') {
  const url = `${API}?action=${action}${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function post(body) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText.substring(0, 200)}`);
  }
  return res.json();
}

// ── Test Suites ──
async function runTests() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   Creative Studio API — Full Test Suite       ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // ━━━━━━━━━━━━ TIER 1: GET ENDPOINTS ━━━━━━━━━━━━
  console.log('━━━ GET Endpoints ━━━');

  const creatives = await test('GET /list — Fetch creative library', async () => {
    const data = await get('list');
    return { data, summary: `${data.creatives?.length || 0} creatives found` };
  });

  let testAdId = null;
  if (creatives?.creatives?.length > 0) {
    testAdId = creatives.creatives[0].adId;

    await test(`GET /aspects — Fetch ad details (${testAdId})`, async () => {
      const data = await get('aspects', `&adId=${testAdId}`);
      return { data, summary: `Score: ${data.compositeRating || 'N/A'}` };
    });
  }

  await test('GET /templates — List prompt templates', async () => {
    const data = await get('templates');
    return { data, summary: `${data.templates?.length || 0} templates` };
  });

  await test('GET /platforms — List cross-platform targets', async () => {
    const data = await get('platforms');
    return { data, summary: `${data.platforms?.length || 0} platforms: ${(data.platforms || []).map(p => p.id).join(', ')}` };
  });

  await test('GET /personas — List audience personas', async () => {
    const data = await get('personas');
    return { data, summary: `${data.personas?.length || 0} personas: ${(data.personas || []).map(p => p.id).join(', ')}` };
  });

  // ━━━━━━━━━━━━ TIER 2: TEMPLATES ━━━━━━━━━━━━
  console.log('\n━━━ Tier 2: Templates ━━━');

  const savedTemplate = await test('POST /save-template — Save a test template', async () => {
    const data = await post({
      type: 'save-template',
      name: 'Test Template ' + Date.now(),
      description: 'Created by test script',
      category: 'custom',
      prompt: 'Create a dark themed Hola Prime ad with bold $25K text',
      tone: 'premium',
      tags: ['test', 'automated'],
    });
    return { data, summary: `ID: ${data.templateId}` };
  });

  if (savedTemplate?.templateId) {
    await test('POST /delete-template — Delete test template', async () => {
      const data = await post({ type: 'delete-template', templateId: savedTemplate.templateId });
      return { data, summary: `Deleted: ${data.deleted}` };
    });
  }

  // ━━━━━━━━━━━━ TIER 2: REFINEMENT ━━━━━━━━━━━━
  console.log('\n━━━ Tier 2: Iterative Refinement ━━━');

  await test('POST /refine — Refine creative with feedback (text-only, no image)', async () => {
    const data = await post({
      type: 'refine',
      feedback: 'Make the CTA button larger and more prominent. Change the color to bright green.',
      refinementType: 'layout',
      originalBrief: {
        creativeConcept: { title: 'Test Creative' },
        copywriting: { headline: { primary: '$25K Challenge' }, cta: { primary: 'START NOW' } }
      }
    });
    return { data, summary: `Changes: ${data.creative?.changes?.length || 0}` };
  });

  // ━━━━━━━━━━━━ TIER 2: PERFORMANCE LINK ━━━━━━━━━━━━
  console.log('\n━━━ Tier 2: Performance Feedback ━━━');

  await test('POST /link-performance — Link fake CTR data', async () => {
    const data = await post({
      type: 'link-performance',
      generationId: '000000000000000000000000', // Fake ID — will return linked:false
      performance: { ctr: 2.1, roas: 3.5, spend: 100 },
    });
    return { data, summary: `Linked: ${data.linked}` };
  });

  // ━━━━━━━━━━━━ TIER 2: COMPETITOR ANALYSIS ━━━━━━━━━━━━
  console.log('\n━━━ Tier 1: Competitor Analysis ━━━');

  // Skip if no image — this needs an actual image to analyze
  console.log('  ⏭ POST /competitor-analysis — Skipped (requires image upload)');
  console.log('    To test: POST with { type: "competitor-analysis", competitorImage: "<data:image/...>" }');

  // ━━━━━━━━━━━━ TIER 4: CROSS-PLATFORM ━━━━━━━━━━━━
  console.log('\n━━━ Tier 4: Cross-Platform (SLOW — generates images) ━━━');

  await test('POST /cross-platform — Generate for 2 platforms', async () => {
    const data = await post({
      type: 'cross-platform',
      imagePrompt: 'Simple dark navy ad for Hola Prime prop trading. Large "$25K" text in white. Small "Buy Challenge" button in blue. Minimal, clean, premium.',
      platformIds: ['meta_feed', 'google_display'], // Only 2 to keep it fast
    });
    const successCount = (data.platforms || []).filter(p => p.imageUrl).length;
    return { data, summary: `${successCount}/${data.platforms?.length || 0} platforms generated` };
  });

  // ━━━━━━━━━━━━ TIER 4: PERSONA TARGETING ━━━━━━━━━━━━
  console.log('\n━━━ Tier 4: Persona Targeting (SLOW — generates images) ━━━');

  await test('POST /persona-targeting — Generate for 2 personas', async () => {
    const data = await post({
      type: 'persona-targeting',
      offer: '$25K Funded Trading Challenge for $38. 1-Step Process. 5% Profit Target. No Time Limits.',
      personaIds: ['beginner_curious', 'frustrated_trader'], // Only 2 to keep it fast
    });
    const successCount = (data.personas || []).filter(p => p.imageUrl).length;
    return { data, summary: `${successCount}/${data.personas?.length || 0} personas generated` };
  });

  // ━━━━━━━━━━━━ TIER 4: AGENTIC PIPELINE ━━━━━━━━━━━━
  console.log('\n━━━ Tier 4: Agentic Pipeline (SLOW — multi-iteration) ━━━');

  await test('POST /agentic — Self-correcting generation (1 retry max)', async () => {
    const data = await post({
      type: 'agentic',
      imagePrompt: 'Minimal Hola Prime ad. Dark navy background. Large white "$38" centered. Small "Buy Challenge" button below. Ultra-clean, premium, lots of whitespace.',
      maxRetries: 1,
      minScore: 5, // Low threshold so it passes quickly
    });
    return { 
      data, 
      summary: `Score: ${data.creative?.score?.overall || 'N/A'}/10, Iterations: ${data.creative?.iterations || 0}, Corrections: ${data.creative?.corrections?.length || 0}` 
    };
  });

  // ━━━━━━━━━━━━ TIER 1: FULL GENERATION ━━━━━━━━━━━━
  console.log('\n━━━ Tier 1: Full Custom Generation (SLOW — 3 variants + scoring) ━━━');

  if (process.argv.includes('--full')) {
    await test('POST /custom — Full 3-variant generation with scoring', async () => {
      const data = await post({
        type: 'custom',
        prompt: 'Create a split-screen meme ad. Left: sad Pepe trader with "Other Firms". Right: happy confident ape in suit with "Hola Prime". Bottom: "$38 Challenge" with "Buy Challenge" CTA button.',
      });
      const variants = data.creative?.variants || [];
      const scored = variants.filter(v => v.score);
      return {
        data,
        summary: `${variants.length} variants, ${scored.length} scored, Best: ${Math.max(...scored.map(v => v.score?.overall || 0))}/10`
      };
    });

    if (testAdId) {
      await test('POST /pattern-based — Full pattern-based generation', async () => {
        const data = await post({
          type: 'pattern-based',
          adIds: [testAdId],
        });
        const variants = data.creative?.variants || [];
        return { data, summary: `${variants.length} variants generated` };
      });
    }
  } else {
    console.log('  ⏭ Full generation tests skipped (add --full flag to run)');
    console.log('    node scripts/test-all-endpoints.js --full');
  }

  // ━━━━━━━━━━━━ SUMMARY ━━━━━━━━━━━━
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   Test suite complete!                        ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('\nTip: Image-generating tests are slow (30-120s each).');
  console.log('Run with --full flag to test full generation pipelines.\n');
}

runTests().catch(err => {
  console.error('\nTest suite crashed:', err);
  process.exit(1);
});
