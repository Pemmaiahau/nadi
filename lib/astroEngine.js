/**
 * Core sidereal astrology engine (server side - needs the native ephemeris).
 *
 * Everything here is Lahiri (Chitra Paksha) sidereal by default, whole-sign
 * houses (the house system Bhrigu Nadi actually works in), and carries exact
 * degree/minute/second precision through to the Nadi Amsha grid.
 *
 * Pure tables and angle maths live in constants.js so the browser can import
 * them without dragging in the native addon.
 */

import { DateTime } from 'luxon';
import { getEphemeris, ephemerisInfo } from './ephemeris.js';
import {
  SIGNS,
  PLANET_ORDER,
  PLANET_META,
  nadiAmsha,
  norm360,
  toDMS,
  formatDMS,
  signIndexOf,
  degreeInSign,
  nakshatraOf,
  dignityOf,
  houseFrom,
} from './constants.js';

// Re-exported so server code can pull everything from one place.
export * from './constants.js';

/* -------------------------------------------------------------------------- */
/* Time handling                                                              */
/* -------------------------------------------------------------------------- */

const FIXED_OFFSET_RE = /^([+-]?)(\d{1,2})(?::?(\d{2}))?$/;

/** Accepts an IANA zone ("Asia/Kolkata") or a raw offset ("+5:30", "-4"). */
export function resolveZone(tz) {
  if (!tz) return 'UTC';
  const trimmed = String(tz).trim();
  const m = trimmed.match(FIXED_OFFSET_RE);
  if (m) {
    const sign = m[1] === '-' ? '-' : '+';
    return `UTC${sign}${m[2]}:${m[3] || '00'}`;
  }
  return trimmed;
}

/**
 * Convert local civil birth data to Julian Day (UT).
 * @param {{date:string, time:string, tz:string, offsetSeconds?:number}} input
 */
export function toJulianDay({ date, time, tz, offsetSeconds = 0 }) {
  const eph = getEphemeris();
  const zone = resolveZone(tz);

  const [y, mo, d] = String(date).split('-').map(Number);
  const timeParts = String(time).split(':').map(Number);
  const [h, mi] = timeParts;
  const se = timeParts[2] || 0;

  if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(mi)) {
    throw new Error(`Invalid birth date/time: "${date} ${time}"`);
  }

  let local = DateTime.fromObject({ year: y, month: mo, day: d, hour: h, minute: mi, second: se }, { zone });
  if (!local.isValid) {
    throw new Error(`Invalid date/time or timezone: ${local.invalidReason} - ${local.invalidExplanation}`);
  }
  if (offsetSeconds) local = local.plus({ seconds: offsetSeconds });

  const utc = local.toUTC();
  const hourDecimal = utc.hour + utc.minute / 60 + utc.second / 3600 + utc.millisecond / 3600000;
  const jd = eph.julday(utc.year, utc.month, utc.day, hourDecimal);

  return {
    jd,
    localISO: local.toISO({ suppressMilliseconds: true }),
    utcISO: utc.toISO({ suppressMilliseconds: true }),
    localLabel: local.toFormat('yyyy-LL-dd HH:mm:ss'),
    utcLabel: utc.toFormat('yyyy-LL-dd HH:mm:ss'),
    timeLabel: local.toFormat('HH:mm:ss'),
    zone,
    offsetMinutes: local.offset,
  };
}

/* -------------------------------------------------------------------------- */
/* Chart computation                                                          */
/* -------------------------------------------------------------------------- */

function buildBody(key, lon, speed, lagnaSignIndex, extra = {}) {
  const longitude = norm360(lon);
  const sIdx = signIndexOf(longitude);
  const dInSign = degreeInSign(longitude);
  return {
    key,
    name: key,
    ...PLANET_META[key],
    lon: longitude,
    signIndex: sIdx,
    sign: SIGNS[sIdx].name,
    signSanskrit: SIGNS[sIdx].sanskrit,
    signLord: SIGNS[sIdx].lord,
    degInSign: dInSign,
    dms: toDMS(dInSign),
    dmsLabel: formatDMS(dInSign, { padDegrees: 2 }),
    speed,
    retrograde: speed < 0,
    nakshatra: nakshatraOf(longitude),
    nadiAmsha: nadiAmsha(longitude),
    house: lagnaSignIndex == null ? null : houseFrom(lagnaSignIndex, sIdx),
    dignity: dignityOf(key, sIdx, dInSign),
    ...extra,
  };
}

/**
 * Full sidereal chart.
 *
 * @param {object} input
 * @param {string} input.date        YYYY-MM-DD (local civil date)
 * @param {string} input.time        HH:mm or HH:mm:ss (local civil time)
 * @param {string} input.tz          IANA zone or fixed offset
 * @param {number} input.lat         Latitude,  north positive
 * @param {number} input.lon         Longitude, east positive
 * @param {string} [input.nodeType]  'mean' | 'true'
 * @param {string} [input.ayanamsa]  'lahiri' | 'raman' | 'krishnamurti'
 * @param {number} [input.offsetSeconds] BTR shift applied to the birth time
 */
export function computeChart(input) {
  const {
    date,
    time,
    tz = 'UTC',
    lat,
    lon,
    nodeType = 'mean',
    ayanamsa = 'lahiri',
    offsetSeconds = 0,
    name = '',
  } = input;

  if (typeof lat !== 'number' || Number.isNaN(lat) || Math.abs(lat) > 90) {
    throw new Error(`Latitude must be a number between -90 and 90 (got ${lat})`);
  }
  if (typeof lon !== 'number' || Number.isNaN(lon) || Math.abs(lon) > 180) {
    throw new Error(`Longitude must be a number between -180 and 180 (got ${lon})`);
  }

  const eph = getEphemeris();
  const sidMode = eph.sidModes[ayanamsa] ?? eph.sidModes.lahiri;
  eph.setSidMode(sidMode);

  const timing = toJulianDay({ date, time, tz, offsetSeconds });
  const { jd } = timing;

  // Ascendant first - every whole-sign house is counted from it. 'W' is the
  // whole-sign house system; the returned ascendant is still the exact rising
  // degree, not the sign boundary.
  const houses = eph.houses(jd, lat, lon, 'W', true);
  const ascLon = norm360(houses.ascendant);
  const lagnaSignIndex = signIndexOf(ascLon);

  const bodies = [];
  for (const key of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']) {
    const r = eph.calc(jd, eph.bodies[key], true);
    bodies.push(buildBody(key, r.lon, r.speed, lagnaSignIndex));
  }

  // Ketu is always exactly 180 deg from Rahu.
  const nodeBody = nodeType === 'true' ? eph.bodies.TrueNode : eph.bodies.MeanNode;
  const rahuRaw = eph.calc(jd, nodeBody, true);
  bodies.push(buildBody('Rahu', rahuRaw.lon, rahuRaw.speed, lagnaSignIndex, { alwaysRetrograde: true }));
  bodies.push(buildBody('Ketu', rahuRaw.lon + 180, rahuRaw.speed, lagnaSignIndex, { alwaysRetrograde: true }));

  bodies.sort((a, b) => PLANET_ORDER.indexOf(a.key) - PLANET_ORDER.indexOf(b.key));

  const ascDegInSign = degreeInSign(ascLon);
  const ascendant = {
    key: 'Lagna',
    name: 'Ascendant',
    ...PLANET_META.Lagna,
    lon: ascLon,
    signIndex: lagnaSignIndex,
    sign: SIGNS[lagnaSignIndex].name,
    signSanskrit: SIGNS[lagnaSignIndex].sanskrit,
    signLord: SIGNS[lagnaSignIndex].lord,
    degInSign: ascDegInSign,
    dms: toDMS(ascDegInSign),
    dmsLabel: formatDMS(ascDegInSign, { padDegrees: 2 }),
    nakshatra: nakshatraOf(ascLon),
    nadiAmsha: nadiAmsha(ascLon),
    house: 1,
    retrograde: false,
    speed: null,
    dignity: null,
  };

  const bySign = Array.from({ length: 12 }, () => []);
  const byHouse = Array.from({ length: 13 }, () => []);
  for (const b of bodies) {
    bySign[b.signIndex].push(b.key);
    byHouse[b.house].push(b.key);
  }

  const ayanamsaValue = eph.getAyanamsa(jd);

  return {
    meta: {
      name,
      input: { date, time, tz, lat, lon, nodeType, ayanamsa },
      offsetSeconds,
      jd,
      timing,
      ayanamsa: {
        key: ayanamsa,
        label:
          ayanamsa === 'lahiri'
            ? 'Lahiri (Chitra Paksha)'
            : ayanamsa === 'raman'
              ? 'B. V. Raman'
              : 'Krishnamurti (KP)',
        value: ayanamsaValue,
        formatted: formatDMS(ayanamsaValue),
      },
      houseSystem: 'Whole sign (Bhrigu Nadi standard)',
      ephemeris: ephemerisInfo(),
    },
    ascendant,
    planets: bodies,
    lagnaSignIndex,
    planetsBySign: bySign,
    planetsByHouse: byHouse,
    cusps: houses.cusps,
    mc: norm360(houses.mc),
  };
}

/**
 * Compact chart payload for the BTR series - only the fields the slider UI
 * needs, with numbers rounded so 60+ variants stay a small JSON response.
 */
export function compactChart(chart) {
  const r4 = (n) => Math.round(n * 10000) / 10000;
  return {
    offsetSeconds: chart.meta.offsetSeconds,
    localLabel: chart.meta.timing.localLabel,
    timeLabel: chart.meta.timing.timeLabel,
    utcLabel: chart.meta.timing.utcLabel,
    lagnaSignIndex: chart.lagnaSignIndex,
    ascendant: {
      key: 'Lagna',
      lon: r4(chart.ascendant.lon),
      signIndex: chart.ascendant.signIndex,
      sign: chart.ascendant.sign,
      degInSign: r4(chart.ascendant.degInSign),
      dmsLabel: chart.ascendant.dmsLabel,
      nakshatra: chart.ascendant.nakshatra,
      nadiAmsha: chart.ascendant.nadiAmsha,
      house: 1,
      retrograde: false,
    },
    planets: chart.planets.map((p) => ({
      key: p.key,
      lon: r4(p.lon),
      signIndex: p.signIndex,
      sign: p.sign,
      signLord: p.signLord,
      degInSign: r4(p.degInSign),
      dmsLabel: p.dmsLabel,
      speed: r4(p.speed),
      retrograde: p.retrograde,
      house: p.house,
      dignity: p.dignity,
      nakshatra: p.nakshatra,
      nadiAmsha: p.nadiAmsha,
    })),
  };
}

/**
 * Build the birth-time-rectification series.
 *
 * The whole +/-range window is pre-computed in one pass so the slider can
 * scrub with zero network latency - Swiss Ephemeris is fast enough that a few
 * hundred charts cost only milliseconds.
 *
 * @param {object} input          same shape as computeChart
 * @param {number} rangeMinutes   half-width of the window, e.g. 30
 * @param {number} stepSeconds    granularity, e.g. 60 (1 min) or 12 (fine)
 */
export function computeChartSeries(input, rangeMinutes = 30, stepSeconds = 60) {
  const range = Math.max(1, Math.min(180, Number(rangeMinutes) || 30));
  const step = Math.max(1, Math.min(600, Number(stepSeconds) || 60));

  const totalSteps = Math.floor((range * 60 * 2) / step);
  if (totalSteps > 600) {
    throw new Error(
      `BTR window too fine: ${totalSteps + 1} charts requested. Widen the step or narrow the range.`
    );
  }

  const series = [];
  for (let offset = -range * 60; offset <= range * 60; offset += step) {
    series.push(computeChart({ ...input, offsetSeconds: offset }));
  }
  return series;
}

/**
 * Transit (Gochar) positions for an arbitrary moment - same sidereal settings
 * as the natal chart. A location is still passed so the transit Ascendant is
 * meaningful.
 */
export function computeTransit({ when, tz = 'UTC', lat = 0, lon = 0, nodeType = 'mean', ayanamsa = 'lahiri' }) {
  const zone = resolveZone(tz);
  const dt = when ? DateTime.fromISO(when, { zone }) : DateTime.now().setZone(zone);
  const valid = dt.isValid ? dt : DateTime.now().setZone('UTC');

  return computeChart({
    date: valid.toFormat('yyyy-LL-dd'),
    time: valid.toFormat('HH:mm:ss'),
    tz: zone,
    lat,
    lon,
    nodeType,
    ayanamsa,
    name: 'Transit',
  });
}
