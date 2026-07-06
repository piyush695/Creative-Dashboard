/**
 * COMPLIANCE REGRESSION CHECK for claim-gate.ts — run after ANY change to the
 * gate, the director, or the approved-facts list:
 *
 *   npx tsx server/ai-studio/claim-gate.check.mts
 *
 * Covers the three fabrications the model actually produced live ("95% profit
 * rewards", a "$99" anchor price, "in under 24 hours") plus smuggling attempts
 * across every claim surface. Exits non-zero on any failure.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { gateCreativeSpec, gateOverlayCopy, gateBriefCopy, gateImagePrompt, findViolations } from './claim-gate';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

const TP = 'she doubted him. then he withdrew $8,400';           // testimonial prompt
const OP = '$39 challenge, code WELCOME20';                      // offer prompt

console.log('\n[1] The three LIVE fabrications must be stripped:');
{
  const { spec, violations } = gateCreativeSpec({
    archetype: 'giant-number', hero: '$39', strikePrice: '$99',
    subline: 'Funded. Traded. Withdrawn. In under 24 hours.',
    bullets: ['Zero payout denials', '95% profit rewards', 'No hidden rules'],
  } as any, OP);
  check('invented strikePrice $99 dropped', spec.strikePrice === undefined);
  check('invented "24 hours" subline dropped', spec.subline === undefined);
  check('invented "95%" pill dropped, clean pills kept',
    JSON.stringify(spec.bullets) === JSON.stringify(['Zero payout denials', 'No hidden rules']));
  check('prompt-sourced $39 hero SURVIVES', spec.hero === '$39');
  check('violations reported', violations.length === 3, JSON.stringify(violations));
}

console.log('\n[2] Prompt-sourced + approved facts survive:');
{
  const { spec, violations } = gateCreativeSpec({
    archetype: 'testimonial', hero: '$8,400', promoCode: undefined,
    headlineHero: 'Paid Out.', subline: 'Real trader. Real payout.',
    testimonial: { name: 'M', handle: '@m', title: 'Hola Prime Funded Trader', body: 'She doubted him. $8,400 hit my account.', highlight: '$8,400 hit my account', date: '' },
  } as any, TP);
  check('$8,400 hero survives (from prompt)', spec.hero === '$8,400');
  check('claim-free subline untouched', spec.subline === 'Real trader. Real payout.');
  check('testimonial with prompt-sourced figure survives', !!spec.testimonial && spec.testimonial.highlight === '$8,400 hit my account');
  check('zero violations', violations.length === 0, JSON.stringify(violations));
}
check('approved "Trustpilot 4.6" passes', findViolations('Rated 4.6 on Trustpilot', TP).length === 0);
check('approved "Zero payout denials" passes', findViolations('Zero payout denials. Ever.', TP).length === 0);
check('prompt code WELCOME20 passes', findViolations('Use code WELCOME20', OP).length === 0);

console.log('\n[3] Smuggling attempts across fields:');
{
  const { spec } = gateCreativeSpec({
    archetype: 'giant-number',
    eyebrow: 'Join 50K traders', hero: '$100K', headline: 'The #1 prop firm',
    headlineHero: 'Fastest payouts', subline: 'Guaranteed instant withdrawals',
    promoCode: 'FUNDED50', ctaLabel: 'Save 45% today',
    bullets: ['24/7 support desk'],
    platePrompt: 'a phone showing a $10,000 payout notification',
  } as any, TP);
  check('count "50K traders" eyebrow dropped', spec.eyebrow === undefined);
  check('invented $100K hero dropped', spec.hero === undefined);
  check('ranking "#1" headline dropped', spec.headline === undefined);
  check('superlative "Fastest" headlineHero dropped', spec.headlineHero === undefined);
  check('guarantee "Guaranteed instant" subline dropped', spec.subline === undefined);
  check('invented promo code FUNDED50 dropped', spec.promoCode === undefined);
  check('claim ctaLabel replaced safe', spec.ctaLabel === 'Get Funded Today');
  check('"24/7" pill dropped', spec.bullets === undefined);
  check('platePrompt $10,000 stripped from image hand-off', !/\$10,?000/.test(spec.platePrompt || ''));
}

console.log('\n[4] Mixed testimonial body — invented sentence dropped, sourced kept:');
{
  const { spec } = gateCreativeSpec({
    archetype: 'testimonial',
    testimonial: { name: 'M', handle: '@m', title: 'Trader', body: 'I withdrew $8,400. The payout came in 20 minutes.', highlight: '$8,400', date: '' },
  } as any, TP);
  check('invented "20 minutes" sentence dropped', spec.testimonial?.body === 'I withdrew $8,400.');
  check('sourced highlight kept', spec.testimonial?.highlight === '$8,400');
}

console.log('\n[5] AI-lane overlay gate:');
{
  const { overlay, violations } = gateOverlayCopy({
    headline: 'Get funded in 24 hours', subheadline: 'Trusted by 50,000 traders',
    price: '$129', bullets: ['Zero payout denials', '90% profit split'],
    cta: 'Start your $500K journey', urgencyText: 'Only 5 spots left', promoCode: 'SAVE30',
  } as any, TP);
  check('invented headline dropped', overlay.headline === '');
  check('invented subheadline dropped', overlay.subheadline === '');
  check('invented price dropped', overlay.price === '');
  check('invented "90%" bullet dropped, clean kept', JSON.stringify(overlay.bullets) === JSON.stringify(['Zero payout denials']));
  check('claim CTA replaced safe', overlay.cta === 'Get Funded Today');
  check('urgency "5 spots" dropped', overlay.urgencyText === '');
  check('invented code SAVE30 dropped', overlay.promoCode === '');
  check('all 7 violations reported', violations.length === 7, String(violations.length));
}

console.log('\n[6] heuristicFallback no longer fabricates (via director module):');
{
  delete process.env.ANTHROPIC_API_KEY; // force the fallback path
  const { directCreative } = await import('./template-director');
  const r = await directCreative('a great opportunity for traders');
  const s = JSON.stringify(r.spec);
  check('no hardcoded $39 for unrelated prompt', !s.includes('$39'), s);
  check('no hardcoded WELCOME20 for unrelated prompt', !s.includes('WELCOME20'));
  const r2 = await directCreative('offer: $49 challenge with code TRADER10');
  check('fallback picks up brief figures ($49)', r2.spec.hero === '$49');
  check('fallback picks up brief code (TRADER10)', r2.spec.promoCode === 'TRADER10');
}

console.log('\n[7] Evergreen brand facts — verbatim wording passes, paraphrase fails:');
{
  check('"Up To 95% Rewards" passes (verbatim)', findViolations('Up To 95% Rewards', TP).length === 0);
  check('"95% profit split" REJECTED (real figure, wrong wording)', findViolations('95% profit split', TP).length >= 1); // ≥1: trips BOTH the 95% token and the "profit split" banned phrase
  check('original fabrication "95% profit rewards" still REJECTED', findViolations('95% profit rewards', TP).length === 1);
  check('"1-Hour Payouts" passes', findViolations('1-Hour Payouts', TP).length === 0);
  check('invented hyphenated "24-hour payouts" caught', findViolations('24-hour payouts', TP).length >= 1);
  check('"98.35% of withdrawals processed within one hour" passes', findViolations('98.35% of withdrawals processed within one hour', TP).length === 0);
  check('"50K+ traders" passes (verbatim)', findViolations('Join 50K+ traders', TP).length === 0);
  check('"50K traders" (missing +) REJECTED', findViolations('Join 50K traders', TP).length === 1);
  check('"Trustpilot 4.6" passes', findViolations('Trustpilot 4.6', TP).length === 0);
  check('invented rating "4.9 stars" caught', findViolations('rated 4.9 stars', TP).length >= 1);
}

console.log('\n[8] Active-offers config — live offers pass, expired offers auto-reject:');
{
  const scratch = path.join(os.tmpdir(), 'claim-gate-offers-test.json');
  fs.writeFileSync(scratch, JSON.stringify({
    offers: [
      { text: '$59', expires: '2199-01-01', note: 'live campaign price' },
      { text: 'SUMMER25', expires: null, note: 'open-ended code' },
      { text: 'WELCOME30', expires: '2020-01-01', note: 'EXPIRED code' },
    ],
  }));
  process.env.ACTIVE_OFFERS_PATH = scratch;
  check('live offer "$59" passes', findViolations('Now just $59', TP).length === 0);
  check('open-ended code SUMMER25 passes', findViolations('Use code SUMMER25', TP).length === 0);
  check('EXPIRED code WELCOME30 REJECTED (expired offer = compliance bug)', findViolations('Use code WELCOME30', TP).length === 1);
  check('expired offer price would also reject', findViolations('$99 deal', TP).length >= 1);
  delete process.env.ACTIVE_OFFERS_PATH;
  fs.unlinkSync(scratch);
}

console.log('\n[9] Pattern/custom-lane overlay fields (extractOverlayConfig shape):');
{
  const { overlay, violations } = gateOverlayCopy({
    headline: 'Hola Prime pays', attentionGrabber: 'Turn $500 into $50,000',
    disclaimer: 'model tried to rewrite the legal text',
  } as any, TP);
  check('attentionGrabber claim gated', overlay.attentionGrabber === '');
  check('claim-free headline untouched', overlay.headline === 'Hola Prime pays');
  check('disclaimer FORCED to fixed legal text', String(overlay.disclaimer).startsWith('HOLA PRIME PROVIDES DEMO ACCOUNTS'));
  check('violation reported for attentionGrabber', violations.some((x) => x.field === 'attentionGrabber'));
}

console.log('\n[10] Integrated mode — pre-prompt gating (baked text never sees unsourced claims):');
{
  const { text, violations } = gateImagePrompt(
    'Render a bold headline "$8,400 withdrawn" with a strikethrough "$99" price tag and the words "guaranteed 10x returns" in neon.', TP);
  check('sourced $8,400 SURVIVES in image prompt', text.includes('$8,400'));
  check('unsourced $99 stripped from image prompt', !text.includes('$99'));
  check('unsourced "guaranteed" stripped', !/guaranteed/i.test(text));
  check('unsourced "10x" stripped', !/10x/i.test(text));
  check('all strips reported', violations.length === 3, String(violations.length));
}
{
  const { brief, violations } = gateBriefCopy({
    copywriting: {
      headline: { primary: 'Get funded in 24 hours', variations: ['Up To 95% Rewards', 'Fastest firm in the game'] },
      hookText: 'Turn $500 into $50,000',
      body: { primary: 'Real traders get paid.' },
      benefitBullets: ['Zero payout denials', '90% profit split'],
      cta: { primary: 'Claim 45% off now' },
      discountText: 'USE CODE FAKE50',
      urgencyText: 'Only 3 spots left',
      disclaimerText: 'model tried to write the legal text',
    },
  } as any, TP);
  const cw = (brief as any).copywriting;
  check('brief: invented "24 hours" headline dropped', cw.headline.primary === '');
  check('brief: approved variation kept, superlative variation dropped',
    JSON.stringify(cw.headline.variations) === JSON.stringify(['Up To 95% Rewards']));
  check('brief: invented hookText dropped', cw.hookText === '');
  check('brief: clean body untouched', cw.body.primary === 'Real traders get paid.');
  check('brief: bullets filtered to approved only', JSON.stringify(cw.benefitBullets) === JSON.stringify(['Zero payout denials']));
  check('brief: claim CTA replaced safe', cw.cta.primary === 'Get Funded Today');
  check('brief: invented discount code dropped', cw.discountText === '');
  check('brief: urgency count dropped', cw.urgencyText === '');
  check('brief: disclaimer FORCED to fixed legal text', String(cw.disclaimerText).startsWith('HOLA PRIME PROVIDES DEMO ACCOUNTS'));
  // 7 = headline.primary, 1 variation, hookText, 1 bullet, cta, discountText,
  // urgencyText. The disclaimer swap is unconditional (not a violation entry).
  check('brief: violations all reported', violations.length === 7, String(violations.length));
}

console.log('\n[11] LIVE BREACH 2026-07-02 — ratios + banned phrasing ("90/10 profit split"):');
{
  check('the exact breach line is now caught',
    findViolations('90/10 profit split · Fast withdrawals · Zero Payout Denial', 'a funded trader celebrating his first payout').length >= 1);
  check('bare ratio "80/20" caught', findViolations('80/20 on all accounts', TP).length === 1);
  check('"profit split" BANNED even with no figure', findViolations('the best profit split around', TP).length >= 1);
  check('banned phrase allowed when USER typed it', findViolations('90/10 profit split', 'promote our 90/10 profit split') .length === 0);
  check('approved "Up To 95% Rewards" unaffected', findViolations('Up To 95% Rewards', TP).length === 0);
  const { overlay } = gateOverlayCopy({ bullets: ['90/10 profit split', 'Zero Payout Denials'] } as any, 'a funded trader celebrating his first payout');
  check('overlay bullets: breach pill dropped, approved kept', JSON.stringify(overlay.bullets) === JSON.stringify(['Zero Payout Denials']));
}

console.log('\n[12] LIVE LEAK 2026-07-06 — step counts + spelled numbers ("1-Step Process · Zero Payout Denial"):');
{
  const MS = 'Mid season sale. $100K Challenge, was $450 now $248, code NEWMS45. New users only.';
  check('the exact leaked subheadline is now caught',
    findViolations('1-Step Process · No Time Limits · Zero Payout Denial', MS).length >= 2);
  check('step count "1-Step" caught', findViolations('1-Step Process', MS).length >= 1);
  check('"2 phase evaluation" caught', findViolations('2 phase evaluation', TP).length >= 1);
  check('spelled "two-step challenge" caught', findViolations('two-step challenge', TP).length >= 1);
  check('spelled "one hour payouts" caught (not the approved wording)', findViolations('one hour payouts', TP).length >= 1);
  check('singular "Zero Payout Denial" caught (approved fact is plural)', findViolations('Zero Payout Denial', TP).length >= 1);
  check('invented "zero fees" caught', findViolations('zero fees on all accounts', TP).length >= 1);
  check('EXACT "Zero Payout Denials" still passes', findViolations('Zero Payout Denials', TP).length === 0);
  check('98.35% fact verbatim (contains "one hour") still passes',
    findViolations('98.35% of withdrawals processed within one hour', TP).length === 0);
  check('user-typed "1-step" survives from brief', findViolations('1-Step Challenge', 'promote our 1-step challenge').length === 0);
  const { text } = gateImagePrompt('dark trading scene, ZERO letterforms or digits visible anywhere', TP);
  check('"zero letterforms" art direction NOT stripped from image prompts', /ZERO letterforms/i.test(text));
  const { overlay } = gateOverlayCopy({ subheadline: '1-Step Process · No Time Limits · Zero Payout Denial' } as any, MS);
  check('overlay: the leaked subheadline field dropped whole', overlay.subheadline === '');
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
