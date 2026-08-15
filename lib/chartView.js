/**
 * Presentation helpers shared by the North and South Indian chart renderers.
 * Pure - safe to import in the browser.
 */

import { PLANET_META, SIGNS, houseFrom } from './constants.js';

/**
 * Turn a chart (full or compact) into a per-sign list of drawable tokens.
 *
 * @param {object} view    { lagnaSignIndex, ascendant, planets }
 * @param {object} [opts]
 * @param {object} [opts.transit]         optional transit chart view to overlay
 * @param {boolean} [opts.showAscendant]  draw the Lagna marker as a token
 * @returns {Array<Array<object>>} 12 buckets, indexed by sign
 */
export function bodiesBySign(view, { transit = null, showAscendant = true } = {}) {
  const buckets = Array.from({ length: 12 }, () => []);
  if (!view) return buckets;

  if (showAscendant && view.ascendant) {
    buckets[view.ascendant.signIndex].push(token(view.ascendant, 'natal', true));
  }
  for (const p of view.planets || []) {
    buckets[p.signIndex].push(token(p, 'natal', false));
  }
  if (transit) {
    for (const p of transit.planets || []) {
      buckets[p.signIndex].push(token(p, 'transit', false));
    }
  }
  return buckets;
}

function token(body, kind, isAscendant) {
  const meta = PLANET_META[body.key] || {};
  return {
    key: body.key,
    kind,
    isAscendant,
    short: meta.short || body.key.slice(0, 2),
    symbol: meta.symbol,
    color: meta.color || '#e7e7f2',
    degInSign: body.degInSign,
    deg: Math.floor(body.degInSign),
    dmsLabel: body.dmsLabel,
    retrograde: Boolean(body.retrograde),
    dignity: body.dignity,
    nadiAmsha: body.nadiAmsha,
    sign: body.sign,
  };
}

/** Label as it appears inside a chart cell, e.g. "Sa 20" or "Ju 05℞". */
export function tokenLabel(t, { withDegree = true } = {}) {
  const deg = withDegree ? ` ${String(t.deg).padStart(2, '0')}` : '';
  return `${t.short}${deg}${t.retrograde && !t.isAscendant ? '℞' : ''}`;
}

/** House number (1..12) of a sign, counted from the Ascendant sign. */
export function houseOfSign(lagnaSignIndex, signIndex) {
  return houseFrom(lagnaSignIndex, signIndex);
}

/** Sign index sitting in a given house, counted from the Ascendant sign. */
export function signInHouse(lagnaSignIndex, house) {
  return (lagnaSignIndex + house - 1) % 12;
}

export { SIGNS };
