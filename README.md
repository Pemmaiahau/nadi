# Nadi Jyotish — Bhrigu Nadi Dashboard

A Next.js Vedic astrology application built around **Bhrigu Nadi** technique rather than
standard Parashari dasha analysis, with a **150-part Nadi Amsha** resolution engine and an
interactive **birth time rectification** dashboard.

Planetary positions come from the Swiss Ephemeris C library and are exact to the arcsecond.

---

## 1. Setup

```bash
npm install
npm run verify     # engine self-check — 40+ assertions, prints a reference chart
npm run dev        # http://localhost:3000
```

Requires Node 18+. Verified on Node 24.16 / Windows 11.

### About the ephemeris binding

The brief specified the `swisseph` npm package. That package builds through `node-gyp` and
needs Python plus a C++ toolchain — it **fails to install on a machine without MSVC**, which
is the common case on Windows. This project therefore depends on **`sweph`**, which is:

- the *same* Swiss Ephemeris C library (reports version `2.10.03`),
- an N-API binding that is actively maintained, and
- shipped with **prebuilt binaries**, so `npm install` needs no compiler.

`lib/ephemeris.js` is a thin adapter that normalises both bindings behind one interface. If
you install the original package (`npm install swisseph`) it will be picked up automatically
as a fallback; nothing else in the codebase changes.

### Ephemeris data files (optional but recommended)

Without `.se1` data files the library falls back to the built-in **Moshier** analytical
ephemeris. That is accurate to roughly **0.1″ for the planets and ~1″ for the Moon** over
1800–2100 — comfortably inside the 12-arcminute Nadi Amsha grid, so every reading in this app
is unaffected. For full Swiss precision:

1. Download `sepl_18.se1` and `semo_18.se1` from
   <https://www.astro.com/ftp/swisseph/ephe/>
2. Drop them into `./ephe/` (or set `SE_EPHE_PATH`).

The app detects them on boot and the header switches from `moshier` to `swiss-ephemeris`.

---

## 2. Architecture

```
lib/constants.js     Pure tables + angle maths. Nadi Amsha, DMS, whole-sign houses,
                     nakshatras, dignities. No native deps — safe on the client.
lib/ephemeris.js     Swiss Ephemeris adapter (sweph | swisseph), ephe path detection.
lib/astroEngine.js   Chart computation, timezone → Julian Day, BTR series, transits.
lib/nadiRules.js     Bhrigu Nadi rule corpus + the link parser.
lib/chartView.js     Presentation helpers shared by both chart renderers.
lib/cities.js        Built-in place table (no geocoding service needed).

pages/api/calculate.js   Single endpoint: chart + BTR series + readings + transits.
pages/index.js           Dashboard shell, tabs, state.

components/BirthForm.jsx          Birth data entry
components/BTRPanel.jsx           Rectification slider + live readouts + trait diff
components/NorthIndianChart.jsx   Diamond chart (SVG)
components/SouthIndianChart.jsx   Square chart (grid)
components/PlanetTable.jsx        Degrees to the arcsecond + Nadi Amsha
components/ReadingsPanel.jsx      Grouped Bhrigu Nadi readings
components/TransitPanel.jsx       Gochar overlay + transit rules

scripts/verify-engine.mjs   Standalone engine test
```

Defaults: **Lahiri (Chitra Paksha)** ayanamsa, sidereal zodiac, **whole-sign houses** (the
house system Bhrigu Nadi actually works in), **mean** lunar node.

---

## 3. The Nadi Amsha math

A sign is 30°. Divided into 150 equal parts, each part is exactly **0°12′00″** of arc:

```
30 / 150 = 0.2°  =  12 arcminutes
```

`nadiAmsha(longitude)` in `lib/constants.js` returns:

| field | meaning |
|---|---|
| `index` | 1–150 within the sign |
| `indexInZodiac` | 1–1800 across the whole zodiac |
| `startDeg` / `endDeg` | exact arc boundaries of this amsha |
| `d150Sign` | the D-150 varga sign |
| `progress` | 0–1 position through the current amsha |
| `remainingArcMinutes` | arc left before it flips |

**D-150 varga sign convention.** Counting of the 150 parts starts from the sign itself for
*movable* signs, from the 9th sign for *fixed* signs, and from the 5th for *dual* signs — the
BPHS-style rule used by Chandra Kala Nadi. This is a convention choice; if your lineage counts
differently, it is three lines in `nadiAmsha()`.

**On the 150 amsha names:** the traditional list of Sanskrit Nadi Amsa names (Vasudha,
Vaishnavi, …) is *deliberately not included*. Reproducing 150 names from memory would mean
inventing most of them, and a wrong name is worse than no name. The numeric index, exact arc
and D-150 sign are all computed exactly. To add names, create `lib/nadiAmshaNames.js`
exporting a 150-element array and read it in `nadiAmsha()`.

**Why this drives rectification:** the Ascendant moves ~1° every 4 minutes, so it crosses one
Nadi Amsha roughly **every 48 seconds of clock time**. A birth time recorded to the nearest
five minutes is therefore uncertain by about six Nadi Amshas.

---

## 4. The Bhrigu Nadi rule engine

Bhrigu Nadi reads planet-to-planet links and ignores the Ascendant and dashas. All distances
are **whole-sign**; degrees only grade how tight a link is.

| link | detection | meaning |
|---|---|---|
| Conjunction | same sign | significations fuse |
| Trine (1/5/9) | 5 or 9 signs apart | read *as* conjunct |
| 2nd | 2nd sign from a planet | the **future** of that planet's significations |
| 12th | 12th sign from a planet | the **past** behind them |
| 7th | opposite sign | direct mutual aspect |

Significators: Jupiter = native (male) / husband · Venus = native (female) / wife / wealth ·
Saturn = karma & profession · Mars = energy / husband / brother · Mercury = intellect &
business · Rahu = foreign / illusion / expansion · Ketu = liberation / blockage / roots ·
Sun = soul / father / authority · Moon = mind / mother.

Corpus size:

- **36** conjunction/trine pairs (every planetary pair, hand-written)
- **13** curated 7th-aspect readings
- **26** 2nd-house (future) and **23** 12th-house (past) readings
- **14** three-planet yogas
- **27** transit rules
- **9** Lagna-link readings + 12 house significations

`analyzeChart(chart)` scans the chart and returns matched readings with stable ids. Pairs
without a hand-written entry get a reading composed from the significator table and are badged
**“derived”** in the UI — there is a *Curated rules only* toggle to hide them.

The corpus is an editable baseline written in the Bhrigu Nadi idiom. It is a starting
dictionary to tune against your own practice, not a scanned classical text.

---

## 5. Birth time rectification

The API precomputes the **entire ±range window in one call** — 61 charts for the ±30 min / 1 min
default — so dragging the slider is an array lookup with no network round trip and no lag.
Swiss Ephemeris is fast enough that all 61 charts cost a few hundred milliseconds.

The panel shows, live:

- rectified clock time and UT
- Ascendant sign, exact degree, nakshatra and pada
- **Lagna and Moon Nadi Amsha** (n/150, arc, D-150 sign)
- progress through the current 12′ amsha and seconds until it flips
- a boundary strip marking every Lagna sign change and amsha crossing in the window
- **traits that appear / disappear** relative to the stated birth time

Step granularity goes down to **4 seconds** (≈ 1′ of arc). *Apply this time* adopts the
rectified moment as the new stated birth time and recomputes everything.

Note that planet-to-planet links barely move in an hour — what actually toggles inside a
rectification window is the Lagna layer (house placements, Lagna conjunctions/trines) and the
Nadi Amsha. That is the layer the diff panel tracks.

---

## 6. API

`POST /api/calculate`

```jsonc
{
  "name": "Reference",
  "date": "1947-08-15",          // local civil date at the birth place
  "time": "00:00:00",
  "tz": "Asia/Kolkata",          // IANA zone, or a fixed offset like "+5:30"
  "lat": 28.6139,                // north positive
  "lon": 77.209,                 // east positive
  "nodeType": "mean",            // "mean" | "true"
  "ayanamsa": "lahiri",          // "lahiri" | "raman" | "krishnamurti"
  "btr": { "rangeMinutes": 30, "stepSeconds": 60 },
  "transitDate": "2026-08-15T21:00"
}
```

Response: `chart`, `analysis`, `btr.variants[]`, `readingsIndex`, `transit`, `manifest`.

Static reading prose is sent once in `readingsIndex`; each variant carries only matched ids
plus its own subtitle, which keeps 61 charts to a few hundred KB.

Historical DST and pre-1947 zone offsets are handled by Luxon's IANA database, so
`Asia/Kolkata` in 1947 resolves correctly.

---

## 7. Scope notes

- Divisional charts other than D-1 and the D-150 amsha sign are not rendered.
- Dashas are deliberately absent — Bhrigu Nadi does not use them.
- Positions are astronomically exact; the interpretations are a traditional corpus offered for
  study, not as advice.
