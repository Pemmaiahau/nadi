/**
 * POST /api/calculate
 *
 * Computes the natal chart, the whole birth-time-rectification series, the
 * Bhrigu Nadi readings and the current transits in a single call.
 *
 * The full BTR window is returned up front so the slider can scrub without
 * hitting the network. Static reading prose is sent once in `readingsIndex`;
 * each variant only carries the ids it matched plus its own subtitle, which
 * keeps 60+ charts down to a few hundred kilobytes.
 *
 * Request body:
 * {
 *   name?:  string,
 *   date:   "YYYY-MM-DD",      // local civil date at the birth place
 *   time:   "HH:mm" | "HH:mm:ss",
 *   tz:     "Asia/Kolkata" | "+5:30",
 *   lat:    number,            // north positive
 *   lon:    number,            // east positive
 *   nodeType?: "mean" | "true",
 *   ayanamsa?: "lahiri" | "raman" | "krishnamurti",
 *   btr?:   { rangeMinutes?: number, stepSeconds?: number },
 *   transitDate?: string       // ISO datetime; defaults to now
 * }
 */

import {
  computeChart,
  computeChartSeries,
  computeTransit,
  compactChart,
} from '../../lib/astroEngine.js';
import { analyzeChart, analyzeTransits, rulesManifest } from '../../lib/nadiRules.js';

/** Reading categories excluded from the BTR variants - the UI renders the
 *  Nadi Amsha live from structured data instead of prose. */
const VARIANT_EXCLUDED_CATEGORIES = new Set(['nadiAmsha']);

function badRequest(res, message, detail) {
  return res.status(400).json({ ok: false, error: message, detail });
}

function parseNumber(value, field) {
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  if (Number.isNaN(n)) throw new Error(`"${field}" must be a number (got ${JSON.stringify(value)})`);
  return n;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' });
  }

  const started = Date.now();

  let input;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

    if (!body.date) throw new Error('"date" is required (YYYY-MM-DD)');
    if (!body.time) throw new Error('"time" is required (HH:mm or HH:mm:ss)');
    if (body.lat === undefined || body.lat === null || body.lat === '') throw new Error('"lat" is required');
    if (body.lon === undefined || body.lon === null || body.lon === '') throw new Error('"lon" is required');

    input = {
      name: String(body.name || '').slice(0, 120),
      date: String(body.date),
      time: String(body.time).length === 5 ? `${body.time}:00` : String(body.time),
      tz: String(body.tz || 'UTC'),
      lat: parseNumber(body.lat, 'lat'),
      lon: parseNumber(body.lon, 'lon'),
      nodeType: body.nodeType === 'true' ? 'true' : 'mean',
      ayanamsa: ['lahiri', 'raman', 'krishnamurti'].includes(body.ayanamsa) ? body.ayanamsa : 'lahiri',
    };

    if (Math.abs(input.lat) > 90) throw new Error('"lat" must be between -90 and 90');
    if (Math.abs(input.lon) > 180) throw new Error('"lon" must be between -180 and 180');
  } catch (err) {
    return badRequest(res, 'Invalid request body', err.message);
  }

  const rangeMinutes = Math.max(1, Math.min(120, Number(req.body?.btr?.rangeMinutes) || 30));
  const stepSeconds = Math.max(1, Math.min(600, Number(req.body?.btr?.stepSeconds) || 60));

  // Reject an unworkable BTR window here rather than letting the engine throw
  // deep in the series loop - it is an input problem, not an ephemeris fault.
  const variantCount = Math.floor((rangeMinutes * 60 * 2) / stepSeconds) + 1;
  if (variantCount > 601) {
    return badRequest(
      res,
      'BTR window too fine',
      `±${rangeMinutes} min at ${stepSeconds}s steps needs ${variantCount} charts (limit 601). ` +
        'Widen the step or narrow the range.'
    );
  }

  try {
    /* --- Base chart ------------------------------------------------------ */
    const chart = computeChart(input);
    const analysis = analyzeChart(chart);

    /* --- BTR series ------------------------------------------------------ */
    const series = computeChartSeries(input, rangeMinutes, stepSeconds);

    const readingsIndex = {};
    const variants = series.map((variantChart) => {
      const variantAnalysis = analyzeChart(variantChart);
      const matched = [];

      for (const r of variantAnalysis.readings) {
        if (VARIANT_EXCLUDED_CATEGORIES.has(r.category)) continue;
        if (!readingsIndex[r.id]) {
          // Static half of the reading, stored once.
          readingsIndex[r.id] = {
            id: r.id,
            category: r.category,
            categoryLabel: r.categoryLabel,
            title: r.title,
            theme: r.theme,
            polarity: r.polarity,
            text: r.text,
            tags: r.tags,
            planets: r.planets,
            weight: r.weight,
            generated: r.generated,
          };
        }
        // Volatile half - subtitles carry live degrees, so they ride along
        // with the variant rather than the index.
        matched.push({ id: r.id, subtitle: r.subtitle });
      }

      return { ...compactChart(variantChart), readings: matched };
    });

    const baseIndex = series.findIndex((c) => c.meta.offsetSeconds === 0);

    /* --- Transits -------------------------------------------------------- */
    const transitChart = computeTransit({
      when: req.body?.transitDate || undefined,
      tz: input.tz,
      lat: input.lat,
      lon: input.lon,
      nodeType: input.nodeType,
      ayanamsa: input.ayanamsa,
    });
    const transits = analyzeTransits(chart, transitChart);

    return res.status(200).json({
      ok: true,
      chart,
      analysis,
      btr: {
        rangeMinutes,
        stepSeconds,
        baseIndex,
        count: variants.length,
        variants,
      },
      readingsIndex,
      transit: {
        chart: compactChart(transitChart),
        moment: transits.transitMoment,
        hits: transits.hits,
        doubleTransits: transits.doubleTransits,
      },
      manifest: rulesManifest(),
      computedInMs: Date.now() - started,
    });
  } catch (err) {
    // Ephemeris and timezone failures land here - surface the real reason
    // rather than a generic 500, since almost all of them are input problems.
    const message = err?.message || String(err);
    const isInputProblem = /Invalid|must be|timezone|latitude|longitude|date\/time/i.test(message);
    return res.status(isInputProblem ? 400 : 500).json({
      ok: false,
      error: isInputProblem ? 'Could not compute the chart' : 'Ephemeris error',
      detail: message,
    });
  }
}
