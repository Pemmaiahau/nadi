/**
 * Swiss Ephemeris adapter.
 *
 * Two npm bindings expose the same underlying C library with different APIs:
 *   - `sweph`    (N-API, maintained, ships prebuilt binaries)  -> preferred
 *   - `swisseph` (legacy nan bindings, requires node-gyp + a C++ toolchain)
 *
 * This module normalises both behind one interface so the rest of the engine
 * never has to care which one is installed.
 *
 * Ephemeris data: if `./ephe/*.se1` files are present we use the full Swiss
 * Ephemeris (SEFLG_SWIEPH, ~0.001" accuracy). Otherwise we fall back to the
 * built-in Moshier analytical ephemeris (SEFLG_MOSEPH), which needs no data
 * files and is accurate to roughly 0.1" for the planets and ~1" for the Moon
 * between 1800-2100 - well inside the 12-arcminute Nadi Amsha grid, but see
 * README for how to install the data files for full precision.
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

// Native .node addons cannot be `import`ed. createRequire gives us a CJS
// loader that works both under Next's server bundle and in plain Node ESM.
const require = createRequire(import.meta.url);

let backend = null;

function loadBackend() {
  if (backend) return backend;

  // Preferred: sweph
  try {
    // eslint-disable-next-line global-require
    const sweph = require('sweph');
    backend = makeSwephBackend(sweph);
    return backend;
  } catch (err) {
    if (err && err.code !== 'MODULE_NOT_FOUND') throw err;
  }

  // Fallback: legacy swisseph. The specifier is assembled at runtime so
  // bundlers do not try to resolve an optional dependency that is usually
  // absent - it only exists if the user installed it deliberately.
  try {
    const legacy = ['swiss', 'eph'].join('');
    const swisseph = require(legacy);
    backend = makeLegacyBackend(swisseph);
    return backend;
  } catch (err) {
    if (err && err.code !== 'MODULE_NOT_FOUND') throw err;
  }

  throw new Error(
    'No Swiss Ephemeris binding found. Install one with `npm install sweph` ' +
      '(recommended, ships prebuilt binaries) or `npm install swisseph` ' +
      '(needs Python + a C++ toolchain).'
  );
}

function resolveEphePath() {
  const configured = process.env.SE_EPHE_PATH;
  const candidates = [
    configured,
    path.join(process.cwd(), 'ephe'),
    path.join(process.cwd(), 'public', 'ephe'),
  ].filter(Boolean);

  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.toLowerCase().endsWith('.se1'))) {
        return dir;
      }
    } catch {
      /* unreadable directory - keep looking */
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* sweph (N-API)                                                              */
/* -------------------------------------------------------------------------- */

function makeSwephBackend(sweph) {
  const C = sweph.constants;
  const ephePath = resolveEphePath();
  if (ephePath) sweph.set_ephe_path(ephePath);

  const baseFlag = ephePath ? C.SEFLG_SWIEPH : C.SEFLG_MOSEPH;

  return {
    name: 'sweph',
    version: sweph.version(),
    ephePath,
    precision: ephePath ? 'swiss-ephemeris' : 'moshier',
    C,

    julday: (y, m, d, hourDecimal) => sweph.julday(y, m, d, hourDecimal, C.SE_GREG_CAL),

    setSidMode: (sidMode) => sweph.set_sid_mode(sidMode, 0, 0),

    getAyanamsa: (jd) => {
      const res = sweph.get_ayanamsa_ex_ut(jd, baseFlag);
      return typeof res === 'object' ? res.data : res;
    },

    /** @returns {{lon:number, lat:number, dist:number, speed:number}} */
    calc: (jd, body, sidereal) => {
      let flags = baseFlag | C.SEFLG_SPEED;
      if (sidereal) flags |= C.SEFLG_SIDEREAL;
      const res = sweph.calc_ut(jd, body, flags);
      if (res.error && !res.data) throw new Error(`swe_calc_ut failed: ${res.error}`);
      return { lon: res.data[0], lat: res.data[1], dist: res.data[2], speed: res.data[3] };
    },

    /** @returns {{ascendant:number, mc:number, armc:number, cusps:number[]}} */
    houses: (jd, lat, lon, hsys, sidereal) => {
      let flags = 0;
      if (sidereal) flags |= C.SEFLG_SIDEREAL;
      const res = sweph.houses_ex2(jd, flags, lat, lon, hsys);
      if (res.error && !res.data) throw new Error(`swe_houses_ex2 failed: ${res.error}`);
      const points = res.data.points;
      // sweph returns 12 cusps with index 0 == house 1.
      const cusps = res.data.houses.slice(0, 12);
      return { ascendant: points[0], mc: points[1], armc: points[2], cusps };
    },

    bodies: {
      Sun: C.SE_SUN,
      Moon: C.SE_MOON,
      Mars: C.SE_MARS,
      Mercury: C.SE_MERCURY,
      Jupiter: C.SE_JUPITER,
      Venus: C.SE_VENUS,
      Saturn: C.SE_SATURN,
      MeanNode: C.SE_MEAN_NODE,
      TrueNode: C.SE_TRUE_NODE,
    },
    sidModes: { lahiri: C.SE_SIDM_LAHIRI, raman: C.SE_SIDM_RAMAN, krishnamurti: C.SE_SIDM_KRISHNAMURTI },
  };
}

/* -------------------------------------------------------------------------- */
/* swisseph (legacy nan bindings)                                             */
/* -------------------------------------------------------------------------- */

function makeLegacyBackend(swe) {
  const ephePath = resolveEphePath();
  if (ephePath) swe.swe_set_ephe_path(ephePath);

  const baseFlag = ephePath ? swe.SEFLG_SWIEPH : swe.SEFLG_MOSEPH;

  return {
    name: 'swisseph',
    version: typeof swe.swe_version === 'function' ? swe.swe_version() : 'unknown',
    ephePath,
    precision: ephePath ? 'swiss-ephemeris' : 'moshier',
    C: swe,

    julday: (y, m, d, hourDecimal) => swe.swe_julday(y, m, d, hourDecimal, swe.SE_GREG_CAL),

    setSidMode: (sidMode) => swe.swe_set_sid_mode(sidMode, 0, 0),

    getAyanamsa: (jd) => swe.swe_get_ayanamsa_ut(jd),

    calc: (jd, body, sidereal) => {
      let flags = baseFlag | swe.SEFLG_SPEED;
      if (sidereal) flags |= swe.SEFLG_SIDEREAL;
      const res = swe.swe_calc_ut(jd, body, flags);
      if (res.error) throw new Error(`swe_calc_ut failed: ${res.error}`);
      return {
        lon: res.longitude,
        lat: res.latitude,
        dist: res.distance,
        speed: res.longitudeSpeed,
      };
    },

    houses: (jd, lat, lon, hsys, sidereal) => {
      const flags = sidereal ? swe.SEFLG_SIDEREAL : 0;
      const res = swe.swe_houses_ex(jd, flags, lat, lon, hsys);
      if (res.error) throw new Error(`swe_houses_ex failed: ${res.error}`);
      return {
        ascendant: res.ascendant,
        mc: res.mc,
        armc: res.armc,
        cusps: (res.house || []).slice(0, 12),
      };
    },

    bodies: {
      Sun: swe.SE_SUN,
      Moon: swe.SE_MOON,
      Mars: swe.SE_MARS,
      Mercury: swe.SE_MERCURY,
      Jupiter: swe.SE_JUPITER,
      Venus: swe.SE_VENUS,
      Saturn: swe.SE_SATURN,
      MeanNode: swe.SE_MEAN_NODE,
      TrueNode: swe.SE_TRUE_NODE,
    },
    sidModes: {
      lahiri: swe.SE_SIDM_LAHIRI,
      raman: swe.SE_SIDM_RAMAN,
      krishnamurti: swe.SE_SIDM_KRISHNAMURTI,
    },
  };
}

export function getEphemeris() {
  return loadBackend();
}

export function ephemerisInfo() {
  const b = loadBackend();
  return {
    binding: b.name,
    swissEphemerisVersion: b.version,
    ephePath: b.ephePath,
    precision: b.precision,
    note:
      b.precision === 'moshier'
        ? 'Using the built-in Moshier ephemeris (no .se1 data files found). Accurate to ~0.1" for planets, ~1" for the Moon.'
        : 'Using full Swiss Ephemeris data files.',
  };
}
