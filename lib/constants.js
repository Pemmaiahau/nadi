/**
 * Pure tables and angular maths - no ephemeris, no Node built-ins.
 *
 * This module is deliberately free of any dependency on the native Swiss
 * Ephemeris addon so React components can import it on the client. Anything
 * that needs the ephemeris lives in astroEngine.js instead.
 */

export const SIGNS = [
  { name: 'Aries', sanskrit: 'Mesha', lord: 'Mars', element: 'Fire', modality: 'Movable', symbol: '♈' },
  { name: 'Taurus', sanskrit: 'Vrishabha', lord: 'Venus', element: 'Earth', modality: 'Fixed', symbol: '♉' },
  { name: 'Gemini', sanskrit: 'Mithuna', lord: 'Mercury', element: 'Air', modality: 'Dual', symbol: '♊' },
  { name: 'Cancer', sanskrit: 'Karka', lord: 'Moon', element: 'Water', modality: 'Movable', symbol: '♋' },
  { name: 'Leo', sanskrit: 'Simha', lord: 'Sun', element: 'Fire', modality: 'Fixed', symbol: '♌' },
  { name: 'Virgo', sanskrit: 'Kanya', lord: 'Mercury', element: 'Earth', modality: 'Dual', symbol: '♍' },
  { name: 'Libra', sanskrit: 'Tula', lord: 'Venus', element: 'Air', modality: 'Movable', symbol: '♎' },
  { name: 'Scorpio', sanskrit: 'Vrischika', lord: 'Mars', element: 'Water', modality: 'Fixed', symbol: '♏' },
  { name: 'Sagittarius', sanskrit: 'Dhanu', lord: 'Jupiter', element: 'Fire', modality: 'Dual', symbol: '♐' },
  { name: 'Capricorn', sanskrit: 'Makara', lord: 'Saturn', element: 'Earth', modality: 'Movable', symbol: '♑' },
  { name: 'Aquarius', sanskrit: 'Kumbha', lord: 'Saturn', element: 'Air', modality: 'Fixed', symbol: '♒' },
  { name: 'Pisces', sanskrit: 'Meena', lord: 'Jupiter', element: 'Water', modality: 'Dual', symbol: '♓' },
];

export const NAKSHATRAS = [
  { name: 'Ashwini', lord: 'Ketu' },
  { name: 'Bharani', lord: 'Venus' },
  { name: 'Krittika', lord: 'Sun' },
  { name: 'Rohini', lord: 'Moon' },
  { name: 'Mrigashira', lord: 'Mars' },
  { name: 'Ardra', lord: 'Rahu' },
  { name: 'Punarvasu', lord: 'Jupiter' },
  { name: 'Pushya', lord: 'Saturn' },
  { name: 'Ashlesha', lord: 'Mercury' },
  { name: 'Magha', lord: 'Ketu' },
  { name: 'Purva Phalguni', lord: 'Venus' },
  { name: 'Uttara Phalguni', lord: 'Sun' },
  { name: 'Hasta', lord: 'Moon' },
  { name: 'Chitra', lord: 'Mars' },
  { name: 'Swati', lord: 'Rahu' },
  { name: 'Vishakha', lord: 'Jupiter' },
  { name: 'Anuradha', lord: 'Saturn' },
  { name: 'Jyeshtha', lord: 'Mercury' },
  { name: 'Mula', lord: 'Ketu' },
  { name: 'Purva Ashadha', lord: 'Venus' },
  { name: 'Uttara Ashadha', lord: 'Sun' },
  { name: 'Shravana', lord: 'Moon' },
  { name: 'Dhanishta', lord: 'Mars' },
  { name: 'Shatabhisha', lord: 'Rahu' },
  { name: 'Purva Bhadrapada', lord: 'Jupiter' },
  { name: 'Uttara Bhadrapada', lord: 'Saturn' },
  { name: 'Revati', lord: 'Mercury' },
];

export const PLANET_ORDER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

export const PLANET_META = {
  Sun: { short: 'Su', symbol: '☉', sanskrit: 'Surya', color: '#f0a04b' },
  Moon: { short: 'Mo', symbol: '☽', sanskrit: 'Chandra', color: '#cfd8e3' },
  Mars: { short: 'Ma', symbol: '♂', sanskrit: 'Mangala', color: '#e05252' },
  Mercury: { short: 'Me', symbol: '☿', sanskrit: 'Budha', color: '#4fb477' },
  Jupiter: { short: 'Ju', symbol: '♃', sanskrit: 'Guru', color: '#e8c65a' },
  Venus: { short: 'Ve', symbol: '♀', sanskrit: 'Shukra', color: '#e58ec4' },
  Saturn: { short: 'Sa', symbol: '♄', sanskrit: 'Shani', color: '#7c8db5' },
  Rahu: { short: 'Ra', symbol: '☊', sanskrit: 'Rahu', color: '#9b7fd4' },
  Ketu: { short: 'Ke', symbol: '☋', sanskrit: 'Ketu', color: '#b98f6f' },
  Lagna: { short: 'As', symbol: '↑', sanskrit: 'Lagna', color: '#8fd3f4' },
};

/** Exaltation / debilitation / own-sign table (sign index, exact degree). */
export const DIGNITY = {
  Sun: { exalt: [0, 10], debil: [6, 10], own: [4] },
  Moon: { exalt: [1, 3], debil: [7, 3], own: [3] },
  Mars: { exalt: [9, 28], debil: [3, 28], own: [0, 7] },
  Mercury: { exalt: [5, 15], debil: [11, 15], own: [2, 5] },
  Jupiter: { exalt: [3, 5], debil: [9, 5], own: [8, 11] },
  Venus: { exalt: [11, 27], debil: [5, 27], own: [1, 6] },
  Saturn: { exalt: [6, 20], debil: [0, 20], own: [9, 10] },
  Rahu: { exalt: [1, 20], debil: [7, 20], own: [] },
  Ketu: { exalt: [7, 20], debil: [1, 20], own: [] },
};

/* -------------------------------------------------------------------------- */
/* Nadi Amsha - the 150-fold division                                         */
/* -------------------------------------------------------------------------- */

/** Each zodiac sign (30 deg) splits into 150 equal parts. */
export const NADI_AMSHA_COUNT = 150;

/** 30 / 150 = 0.2 deg = exactly 0 deg 12 arcminutes. */
export const NADI_AMSHA_ARC_DEG = 30 / NADI_AMSHA_COUNT;

/** 0.2 deg expressed in arcminutes - the number every Nadi reading hinges on. */
export const NADI_AMSHA_ARC_MINUTES = NADI_AMSHA_ARC_DEG * 60; // 12

/**
 * Nadi Amsha (D-150) for an absolute sidereal longitude.
 *
 * Returns both the 1..150 index inside the sign and the 1..1800 index across
 * the whole zodiac, the exact arc boundaries, and the D-150 varga sign.
 *
 * Varga sign convention (BPHS-style, as used by Chandra Kala Nadi): counting
 * of the 150 parts starts from the sign itself for movable signs, from the
 * 9th sign for fixed signs, and from the 5th sign for dual signs.
 */
export function nadiAmsha(longitude) {
  const lon = norm360(longitude);
  const signIndex = Math.floor(lon / 30);
  const degInSign = lon - signIndex * 30;

  // 0-based part number inside the sign, clamped so a floating-point 30.0
  // never spills into a 151st part.
  const partIndex = Math.min(NADI_AMSHA_COUNT - 1, Math.floor(degInSign / NADI_AMSHA_ARC_DEG));

  const startDeg = partIndex * NADI_AMSHA_ARC_DEG;
  const endDeg = startDeg + NADI_AMSHA_ARC_DEG;

  const { modality } = SIGNS[signIndex];
  const startSign =
    modality === 'Movable' ? signIndex : modality === 'Fixed' ? (signIndex + 8) % 12 : (signIndex + 4) % 12;
  const d150SignIndex = (startSign + partIndex) % 12;

  return {
    index: partIndex + 1, // 1..150 within the sign
    indexInZodiac: signIndex * NADI_AMSHA_COUNT + partIndex + 1, // 1..1800
    signIndex,
    sign: SIGNS[signIndex].name,
    startDeg,
    endDeg,
    startLon: signIndex * 30 + startDeg,
    endLon: signIndex * 30 + endDeg,
    arcLabel: `${formatDMS(startDeg, { padDegrees: 2, seconds: false })} – ${formatDMS(endDeg, { padDegrees: 2, seconds: false })}`,
    d150SignIndex,
    d150Sign: SIGNS[d150SignIndex].name,
    progress: (degInSign - startDeg) / NADI_AMSHA_ARC_DEG, // 0..1 through this amsha
    /** Arc still to travel before the amsha flips, in arcminutes. */
    remainingArcMinutes: (endDeg - degInSign) * 60,
  };
}

/* -------------------------------------------------------------------------- */
/* Angle helpers                                                              */
/* -------------------------------------------------------------------------- */

export function norm360(deg) {
  const x = deg % 360;
  return x < 0 ? x + 360 : x;
}

/** Split a degree value into d/m/s, guarding against 59.9999 -> 60 rounding. */
export function toDMS(deg) {
  const sign = deg < 0 ? -1 : 1;
  const abs = Math.abs(deg);
  let d = Math.floor(abs);
  let m = Math.floor((abs - d) * 60);
  let s = Math.round((abs - d - m / 60) * 3600 * 100) / 100;

  if (s >= 60) {
    s -= 60;
    m += 1;
  }
  if (m >= 60) {
    m -= 60;
    d += 1;
  }
  return { sign, d, m, s };
}

export function formatDMS(deg, { padDegrees = 0, seconds = true } = {}) {
  const { sign, d, m, s } = toDMS(deg);
  const dd = padDegrees ? String(d).padStart(padDegrees, '0') : String(d);
  const mm = String(m).padStart(2, '0');
  const ss = s.toFixed(2).padStart(5, '0');
  return `${sign < 0 ? '-' : ''}${dd}°${mm}'${seconds ? `${ss}"` : ''}`;
}

export function signIndexOf(longitude) {
  return Math.floor(norm360(longitude) / 30);
}

export function degreeInSign(longitude) {
  const lon = norm360(longitude);
  return lon - Math.floor(lon / 30) * 30;
}

export function nakshatraOf(longitude) {
  const lon = norm360(longitude);
  const span = 360 / 27; // 13 deg 20'
  const idx = Math.min(26, Math.floor(lon / span));
  const within = lon - idx * span;
  const pada = Math.min(4, Math.floor(within / (span / 4)) + 1);
  return {
    index: idx + 1,
    name: NAKSHATRAS[idx].name,
    lord: NAKSHATRAS[idx].lord,
    pada,
    degInNakshatra: within,
  };
}

export function dignityOf(planetKey, signIndex, degInSign) {
  const table = DIGNITY[planetKey];
  if (!table) return null;
  if (table.exalt && table.exalt[0] === signIndex) {
    return Math.abs(degInSign - table.exalt[1]) < 1 ? 'Exalted (deep)' : 'Exalted';
  }
  if (table.debil && table.debil[0] === signIndex) {
    return Math.abs(degInSign - table.debil[1]) < 1 ? 'Debilitated (deep)' : 'Debilitated';
  }
  if (table.own && table.own.includes(signIndex)) return 'Own sign';
  return null;
}

/* -------------------------------------------------------------------------- */
/* House math (whole sign - what Nadi actually uses)                          */
/* -------------------------------------------------------------------------- */

/**
 * Whole-sign house of a body counted from a reference sign.
 * The reference sign itself is house 1.
 * @returns {number} 1..12
 */
export function houseFrom(referenceSignIndex, targetSignIndex) {
  return ((targetSignIndex - referenceSignIndex + 12) % 12) + 1;
}

/** Signed shortest angular separation between two longitudes, -180..180. */
export function angularSeparation(a, b) {
  let diff = norm360(a) - norm360(b);
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

export function ordinalSuffix(n) {
  if (n >= 11 && n <= 13) return 'th';
  return { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
}
