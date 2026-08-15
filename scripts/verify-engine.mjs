/**
 * Engine self-check. Run with `npm run verify`.
 *
 * Validates the Nadi Amsha grid arithmetic, whole-sign house counting, the
 * 1/5/9 trine detector and the BTR series, then prints a reference chart so
 * the ephemeris output can be eyeballed against any standard Vedic software.
 */

import {
  computeChart,
  computeChartSeries,
  computeTransit,
  nadiAmsha,
  houseFrom,
  formatDMS,
  toDMS,
  NADI_AMSHA_ARC_DEG,
  NADI_AMSHA_ARC_MINUTES,
} from '../lib/astroEngine.js';
import { analyzeChart, analyzeTransits, rulesManifest, pairKey } from '../lib/nadiRules.js';
import { ephemerisInfo } from '../lib/ephemeris.js';

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${ok ? '' : `\n         expected ${JSON.stringify(expected)}\n         actual   ${JSON.stringify(actual)}`}`);
}
function checkNear(label, actual, expected, tol) {
  const ok = Math.abs(actual - expected) <= tol;
  if (!ok) failures += 1;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${ok ? ` (${actual})` : `\n         expected ${expected} +/- ${tol}\n         actual   ${actual}`}`);
}

console.log('\n=== Ephemeris ===');
console.log(ephemerisInfo());

/* -------------------------------------------------------------------------- */
console.log('\n=== Nadi Amsha grid (150 parts of 12 arcminutes) ===');

check('arc is exactly 0.2 deg', NADI_AMSHA_ARC_DEG, 0.2);
check('arc is exactly 12 arcminutes', NADI_AMSHA_ARC_MINUTES, 12);
check('0°00\'00" Aries -> amsha 1', nadiAmsha(0).index, 1);
check('0°11\'59" Aries -> amsha 1', nadiAmsha(11.99 / 60).index, 1);
check('0°12\'00" Aries -> amsha 2', nadiAmsha(12 / 60).index, 2);
check('0°24\'00" Aries -> amsha 3', nadiAmsha(24 / 60).index, 3);
check('29°59\'59" Aries -> amsha 150', nadiAmsha(29.99972).index, 150);
check('exactly 30° -> Taurus amsha 1', nadiAmsha(30).index, 1);
check('Taurus amsha 1 zodiac index', nadiAmsha(30).indexInZodiac, 151);
check('last amsha of the zodiac', nadiAmsha(359.999).indexInZodiac, 1800);
check('amsha boundaries for 0°12\'-0°24\'', [nadiAmsha(0.25).startDeg, nadiAmsha(0.25).endDeg], [0.2, 0.4]);

// D-150 varga sign: movable counts from itself, fixed from the 9th, dual from the 5th.
check('Aries (movable) amsha 1 -> Aries', nadiAmsha(0).d150Sign, 'Aries');
check('Aries (movable) amsha 2 -> Taurus', nadiAmsha(0.2).d150Sign, 'Taurus');
check('Taurus (fixed) amsha 1 -> Capricorn (9th)', nadiAmsha(30).d150Sign, 'Capricorn');
check('Gemini (dual) amsha 1 -> Libra (5th)', nadiAmsha(60).d150Sign, 'Libra');

// Every part must be 12 arcminutes wide, with no gaps or overlaps.
let contiguous = true;
for (let i = 0; i < 150; i += 1) {
  const a = nadiAmsha(i * 0.2 + 0.0001);
  if (a.index !== i + 1) contiguous = false;
  if (Math.abs(a.endDeg - a.startDeg - 0.2) > 1e-12) contiguous = false;
}
check('all 150 parts contiguous and 0.2° wide', contiguous, true);

/* -------------------------------------------------------------------------- */
console.log('\n=== Whole-sign house counting ===');
check('same sign is the 1st', houseFrom(0, 0), 1);
check('Aries -> Leo is the 5th', houseFrom(0, 4), 5);
check('Aries -> Sagittarius is the 9th', houseFrom(0, 8), 9);
check('Aries -> Taurus is the 2nd', houseFrom(0, 1), 2);
check('Aries -> Pisces is the 12th', houseFrom(0, 11), 12);
check('Aries -> Libra is the 7th', houseFrom(0, 6), 7);
check('wraps: Pisces -> Cancer is the 5th', houseFrom(11, 3), 5);
check('wraps: Capricorn -> Virgo is the 9th', houseFrom(9, 5), 9);

/* -------------------------------------------------------------------------- */
console.log('\n=== DMS formatting ===');
check('15.5 deg -> 15°30\'', toDMS(15.5).d + ':' + toDMS(15.5).m, '15:30');
check('seconds carry correctly', formatDMS(9.9999999), '10°00\'00.00"');

/* -------------------------------------------------------------------------- */
console.log('\n=== Reference chart: 15 Aug 1947, 00:00 IST, New Delhi ===');

const reference = {
  name: 'Reference',
  date: '1947-08-15',
  time: '00:00:00',
  tz: 'Asia/Kolkata',
  lat: 28.6139,
  lon: 77.209,
  nodeType: 'mean',
  ayanamsa: 'lahiri',
};

const chart = computeChart(reference);
console.log(`  Ayanamsa      : ${chart.meta.ayanamsa.formatted} (${chart.meta.ayanamsa.label})`);
console.log(`  Julian Day UT : ${chart.meta.jd}`);
console.log(`  UTC           : ${chart.meta.timing.utcLabel}`);
console.log(
  `  Ascendant     : ${chart.ascendant.sign} ${chart.ascendant.dmsLabel}  ` +
    `| Nadi Amsha ${chart.ascendant.nadiAmsha.index}/150 (${chart.ascendant.nadiAmsha.arcLabel}) -> D150 ${chart.ascendant.nadiAmsha.d150Sign}`
);
for (const p of chart.planets) {
  console.log(
    `  ${p.key.padEnd(8)}      : ${p.sign.padEnd(12)} ${p.dmsLabel.padStart(12)}` +
      ` ${p.retrograde ? 'R' : ' '} H${String(p.house).padStart(2)}` +
      ` | NA ${String(p.nadiAmsha.index).padStart(3)}/150 -> ${p.nadiAmsha.d150Sign.padEnd(11)}` +
      ` | ${p.nakshatra.name} pada ${p.nakshatra.pada}${p.dignity ? ` | ${p.dignity}` : ''}`
  );
}

// Sanity anchors: tropical Sun is ~22° Leo on 15 Aug; with a 1947 ayanamsa of
// ~23°07' the sidereal Sun must land in late Cancer.
checkNear('ayanamsa for 1947 is ~23.1 deg', chart.meta.ayanamsa.value, 23.11, 0.05);
check('Sun is in Cancer', chart.planets.find((p) => p.key === 'Sun').sign, 'Cancer');
check('Ascendant is Taurus', chart.ascendant.sign, 'Taurus');
check('Ketu is exactly opposite Rahu', Math.round(
  ((chart.planets.find((p) => p.key === 'Ketu').lon - chart.planets.find((p) => p.key === 'Rahu').lon + 360) % 360) * 1e6
) / 1e6, 180);
check(
  'every planet has a house 1..12',
  chart.planets.every((p) => p.house >= 1 && p.house <= 12),
  true
);
check(
  'lagna sign is house 1',
  houseFrom(chart.lagnaSignIndex, chart.lagnaSignIndex),
  1
);

/* -------------------------------------------------------------------------- */
console.log('\n=== Bhrigu Nadi rule parser ===');

const analysis = analyzeChart(chart);
console.log('  Link counts   :', analysis.summary);
console.log('  Manifest      :', rulesManifest());
check('pairKey is order-independent', pairKey('Mars', 'Jupiter'), pairKey('Jupiter', 'Mars'));
check('pairKey uses planet order', pairKey('Mars', 'Jupiter'), 'Mars|Jupiter');
check('produced readings', analysis.readings.length > 0, true);
check(
  'every reading has a unique id',
  new Set(analysis.readings.map((r) => r.id)).size,
  analysis.readings.length
);

// Trines must be symmetric: if A is 5th from B then B is 9th from A.
const trineSymmetric = analysis.links.trines.every((t) => {
  const a = chart.planets.find((p) => p.key === t.planets[0]);
  const b = chart.planets.find((p) => p.key === t.planets[1]);
  const d1 = houseFrom(a.signIndex, b.signIndex);
  const d2 = houseFrom(b.signIndex, a.signIndex);
  return (d1 === 5 && d2 === 9) || (d1 === 9 && d2 === 5);
});
check('all detected trines are 5/9 symmetric', trineSymmetric, true);

// Conjunctions must be same-sign.
const conjSameSign = analysis.links.conjunctions.every((c) => {
  const a = chart.planets.find((p) => p.key === c.planets[0]);
  const b = chart.planets.find((p) => p.key === c.planets[1]);
  return a.signIndex === b.signIndex;
});
check('all detected conjunctions are same-sign', conjSameSign, true);

console.log('\n  Top readings:');
for (const r of analysis.readings.slice(0, 8)) {
  console.log(`   [${r.categoryLabel}] ${r.title} — ${r.theme}${r.generated ? ' (generated)' : ''}`);
}

/* -------------------------------------------------------------------------- */
console.log('\n=== BTR series ===');

const series = computeChartSeries(reference, 30, 60);
check('61 charts for +/-30 min at 1 min steps', series.length, 61);
check('midpoint has zero offset', series[30].meta.offsetSeconds, 0);
check('first is -1800s', series[0].meta.offsetSeconds, -1800);
check('last is +1800s', series[60].meta.offsetSeconds, 1800);
check(
  'midpoint matches the un-shifted chart',
  series[30].ascendant.lon.toFixed(9),
  chart.ascendant.lon.toFixed(9)
);

const amshaValues = series.map((c) => c.ascendant.nadiAmsha.indexInZodiac);
const distinctAmshas = new Set(amshaValues).size;
console.log(`  Lagna Nadi Amsha spans ${distinctAmshas} distinct values across the 60-minute window`);
console.log(`    at -30 min: ${amshaValues[0]}   at 0: ${amshaValues[30]}   at +30 min: ${amshaValues[60]}`);
check('the amsha actually shifts across the window', distinctAmshas > 1, true);

// The Ascendant should advance monotonically with time (barring the 360 wrap).
let monotonic = true;
for (let i = 1; i < series.length; i += 1) {
  const d = (series[i].ascendant.lon - series[i - 1].ascendant.lon + 360) % 360;
  if (d <= 0 || d > 10) monotonic = false;
}
check('ascendant advances monotonically minute by minute', monotonic, true);

// Readings should differ somewhere across a 60-minute window (that is the
// entire point of the BTR dashboard).
const idsAt = (c) => new Set(analyzeChart(c).readings.map((r) => r.id));
const first = idsAt(series[0]);
const last = idsAt(series[60]);
const changed = [...first].filter((x) => !last.has(x)).length + [...last].filter((x) => !first.has(x)).length;
console.log(`  Readings differing between -30 and +30 min: ${changed}`);

/* -------------------------------------------------------------------------- */
console.log('\n=== Transits ===');

const transit = computeTransit({ tz: 'Asia/Kolkata', lat: 28.6139, lon: 77.209 });
const tr = analyzeTransits(chart, transit);
console.log(`  Transit moment: ${tr.transitMoment.localLabel} (${tr.transitMoment.zone})`);
console.log(`  Hits: ${tr.hits.length}, double transits: ${tr.doubleTransits.length}`);
for (const h of tr.hits.slice(0, 6)) {
  console.log(`   [${h.severity}] ${h.title}${h.exact ? ' (exact)' : ''}`);
}
check('transit analysis returns an array', Array.isArray(tr.hits), true);

/* -------------------------------------------------------------------------- */
console.log(`\n=== ${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`} ===\n`);
process.exit(failures === 0 ? 0 : 1);
