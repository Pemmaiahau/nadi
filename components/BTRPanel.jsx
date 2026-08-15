import { useMemo } from 'react';
import { SIGNS, NADI_AMSHA_ARC_MINUTES } from '../lib/constants';

/**
 * Interactive Birth Time Rectification dashboard.
 *
 * The whole ±range window is pre-computed server side, so scrubbing the slider
 * is a pure array lookup - no network, no recalculation, no lag. Everything
 * derived from the selected variant is memoised on the index alone.
 */

function formatOffset(seconds) {
  if (seconds === 0) return 'stated time';
  const sign = seconds < 0 ? '−' : '+';
  const abs = Math.abs(seconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${m}m${s ? ` ${s}s` : ''}`;
}

/** Big readout tile. */
function Stat({ label, value, sub, tone = 'default', pulse = false }) {
  const toneClass =
    tone === 'gold' ? 'text-gold-300' : tone === 'sky' ? 'text-sky-ish-400' : 'text-slate-100';
  return (
    <div className={`rounded-lg border border-ink-700 bg-ink-900/70 px-3 py-2.5 ${pulse ? 'flash-in' : ''}`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`tnum mt-0.5 text-lg font-semibold leading-tight ${toneClass}`}>{value}</div>
      {sub && <div className="tnum mt-0.5 text-[11px] leading-tight text-slate-400">{sub}</div>}
    </div>
  );
}

export default function BTRPanel({ btr, readingsIndex, index, onIndexChange, onApply, applying }) {
  const variants = btr.variants;
  const current = variants[index];
  const base = variants[btr.baseIndex];

  const derived = useMemo(() => {
    const currentIds = new Set(current.readings.map((r) => r.id));
    const baseIds = new Set(base.readings.map((r) => r.id));

    const gained = current.readings.filter((r) => !baseIds.has(r.id));
    const lost = base.readings.filter((r) => !currentIds.has(r.id));

    // Which planets (and the Lagna) changed sign relative to the stated time.
    const changedSigns = new Set();
    if (current.ascendant.signIndex !== base.ascendant.signIndex) changedSigns.add('Lagna');
    for (const p of current.planets) {
      const b = base.planets.find((x) => x.key === p.key);
      if (b && b.signIndex !== p.signIndex) changedSigns.add(p.key);
    }

    return { gained, lost, changedSigns, currentIds };
  }, [current, base]);

  /* Sign / amsha boundaries across the whole window, for the strip below the
     slider. A boundary is where the Lagna crosses into a new sign or a new
     Nadi Amsha. */
  const strip = useMemo(
    () =>
      variants.map((v, i) => {
        const prev = i > 0 ? variants[i - 1] : null;
        return {
          i,
          signIndex: v.ascendant.signIndex,
          amsha: v.ascendant.nadiAmsha.indexInZodiac,
          signBoundary: prev ? prev.ascendant.signIndex !== v.ascendant.signIndex : false,
          amshaBoundary: prev ? prev.ascendant.nadiAmsha.indexInZodiac !== v.ascendant.nadiAmsha.indexInZodiac : false,
        };
      }),
    [variants]
  );

  const amshaChanges = strip.filter((s) => s.amshaBoundary).length;
  const distinctAmshas = new Set(strip.map((s) => s.amsha)).size;
  const distinctSigns = new Set(strip.map((s) => s.signIndex)).size;

  const asc = current.ascendant;
  const moon = current.planets.find((p) => p.key === 'Moon');
  const na = asc.nadiAmsha;
  const amshaShiftedFromBase = na.indexInZodiac !== base.ascendant.nadiAmsha.indexInZodiac;

  const nudge = (delta) => onIndexChange(Math.max(0, Math.min(variants.length - 1, index + delta)));

  return (
    <section className="panel">
      <header className="panel-head flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="font-display text-lg text-gold-300">Birth Time Rectification</h2>
          <p className="text-[11px] text-slate-400">
            ±{btr.rangeMinutes} min window · {btr.stepSeconds}s steps · {btr.count} charts precomputed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onIndexChange(btr.baseIndex)}
            disabled={index === btr.baseIndex}
            className="rounded-md border border-ink-600 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-ink-500 hover:bg-ink-800 disabled:opacity-40"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => onApply(current)}
            disabled={index === btr.baseIndex || applying}
            className="rounded-md bg-gold-500/90 px-3 py-1.5 text-xs font-semibold text-ink-950 transition hover:bg-gold-400 disabled:opacity-40"
            title="Recompute the whole dashboard using this rectified time as the new stated birth time"
          >
            {applying ? 'Applying…' : 'Apply this time'}
          </button>
        </div>
      </header>

      <div className="p-4">
        {/* ---- Slider ---------------------------------------------------- */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => nudge(-1)}
            className="shrink-0 rounded-md border border-ink-600 px-2 py-1 text-sm text-slate-300 hover:bg-ink-800"
            aria-label="One step earlier"
          >
            −
          </button>

          <div className="flex-1">
            <input
              type="range"
              className="btr"
              min={0}
              max={variants.length - 1}
              step={1}
              value={index}
              onChange={(e) => onIndexChange(Number(e.target.value))}
              aria-label="Birth time offset"
              aria-valuetext={`${formatOffset(current.offsetSeconds)}, ${current.timeLabel}`}
            />

            {/* Boundary strip: where the Lagna changes sign / Nadi Amsha. */}
            <div className="mt-1 flex h-4 w-full overflow-hidden rounded border border-ink-700">
              {strip.map((s) => (
                <div
                  key={s.i}
                  className="h-full flex-1"
                  style={{
                    background:
                      s.i === index
                        ? '#e8c65a'
                        : s.signIndex % 2 === 0
                          ? 'rgba(74,74,125,0.55)'
                          : 'rgba(45,45,85,0.55)',
                    borderLeft: s.signBoundary
                      ? '2px solid #f0a04b'
                      : s.amshaBoundary
                        ? '1px solid rgba(212,175,55,0.35)'
                        : 'none',
                  }}
                  title={`${formatOffset(variants[s.i].offsetSeconds)} · ${SIGNS[s.signIndex].name} · amsha #${s.amsha}`}
                />
              ))}
            </div>

            <div className="mt-1 flex justify-between text-[10px] text-slate-500">
              <span>−{btr.rangeMinutes} min</span>
              <span className="text-slate-400">
                {distinctAmshas} Nadi Amshas · {amshaChanges} crossings · {distinctSigns} Lagna sign
                {distinctSigns > 1 ? 's' : ''} in this window
              </span>
              <span>+{btr.rangeMinutes} min</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => nudge(1)}
            className="shrink-0 rounded-md border border-ink-600 px-2 py-1 text-sm text-slate-300 hover:bg-ink-800"
            aria-label="One step later"
          >
            +
          </button>
        </div>

        {/* ---- Live readouts --------------------------------------------- */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Rectified time"
            value={current.timeLabel}
            sub={`${formatOffset(current.offsetSeconds)} · ${current.utcLabel} UT`}
            tone={index === btr.baseIndex ? 'default' : 'gold'}
          />
          <Stat
            label="Ascendant"
            value={`${SIGNS[asc.signIndex].name} ${asc.dmsLabel}`}
            sub={`${asc.nakshatra.name} pada ${asc.nakshatra.pada} · lord ${asc.nakshatra.lord}`}
            tone="sky"
          />
          <Stat
            label="Lagna Nadi Amsha"
            value={`${na.index} / 150`}
            sub={`${na.arcLabel} · D-150 ${na.d150Sign} · #${na.indexInZodiac}/1800`}
            tone="gold"
            pulse={amshaShiftedFromBase}
          />
          <Stat
            label="Moon Nadi Amsha"
            value={moon ? `${moon.nadiAmsha.index} / 150` : '—'}
            sub={
              moon
                ? `${moon.sign} ${moon.dmsLabel} · ${moon.nakshatra.name} p${moon.nakshatra.pada}`
                : undefined
            }
          />
        </div>

        {/* Progress through the current 12-arcminute amsha. */}
        <div className="mt-3 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Position inside Nadi Amsha {na.index} ({NADI_AMSHA_ARC_MINUTES}′ of arc)
            </span>
            <span className="tnum">
              {na.remainingArcMinutes.toFixed(2)}′ to the next amsha ≈ {(na.remainingArcMinutes * 4).toFixed(0)}s
              of clock time
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-500 to-saffron-400 transition-all duration-150"
              style={{ width: `${Math.min(100, Math.max(0, na.progress * 100))}%` }}
            />
          </div>
        </div>

        {/* ---- Traits toggling on / off ----------------------------------- */}
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <DeltaList
            title="Traits that appear at this time"
            emptyText="No new readings at this offset."
            items={derived.gained}
            readingsIndex={readingsIndex}
            tone="gain"
          />
          <DeltaList
            title="Traits that disappear at this time"
            emptyText="No readings lost at this offset."
            items={derived.lost}
            readingsIndex={readingsIndex}
            tone="loss"
          />
        </div>

        {derived.changedSigns.size > 0 && (
          <p className="mt-3 rounded-md border border-saffron-400/30 bg-saffron-400/10 px-3 py-2 text-[11px] text-saffron-400">
            Sign change vs the stated time:{' '}
            <span className="font-semibold">{[...derived.changedSigns].join(', ')}</span>. A whole-sign shift
            rewrites every house placement below it — this is usually the decisive rectification boundary.
          </p>
        )}
      </div>
    </section>
  );
}

function DeltaList({ title, items, readingsIndex, emptyText, tone }) {
  const border = tone === 'gain' ? 'border-leaf-400/30' : 'border-flame-400/30';
  const dot = tone === 'gain' ? 'bg-leaf-400' : 'bg-flame-400';
  const head = tone === 'gain' ? 'text-leaf-400' : 'text-flame-400';

  return (
    <div className={`rounded-lg border bg-ink-900/50 p-3 ${border}`}>
      <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${head}`}>
        {title} <span className="tnum text-slate-500">({items.length})</span>
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-[11px] text-slate-500">{emptyText}</p>
      ) : (
        <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {items.map((item) => {
            const r = readingsIndex[item.id];
            if (!r) return null;
            return (
              <li key={item.id} className="flex gap-2 text-[11.5px] leading-snug">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                <span>
                  <span className="font-medium text-slate-200">{r.title}</span>
                  <span className="text-slate-500"> · {r.categoryLabel}</span>
                  <span className="block text-slate-400">{item.subtitle}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
