import { useMemo } from 'react';
import { PLANET_META, SIGNS, houseFrom } from '../lib/constants';

/**
 * Gochar (transit) overlay, read through Bhrigu Nadi transit logic: a
 * transiting planet landing on - or trine to - a natal planet activates that
 * natal planet's significations. Saturn over natal Jupiter is the headline
 * case, and is flagged as a major career/life shift.
 */

const SEVERITY = {
  major: { label: 'Major', cls: 'bg-flame-400/15 text-flame-400 ring-flame-400/30' },
  caution: { label: 'Caution', cls: 'bg-saffron-400/15 text-saffron-400 ring-saffron-400/30' },
  favourable: { label: 'Favourable', cls: 'bg-leaf-400/15 text-leaf-400 ring-leaf-400/30' },
  moderate: { label: 'Moderate', cls: 'bg-ink-700 text-slate-300 ring-ink-600' },
};

export default function TransitPanel({ transit, natalView, transitDate, onTransitDateChange, refreshing }) {
  const { hits, doubleTransits, chart: transitChart, moment } = transit;

  const positions = useMemo(() => {
    if (!natalView) return [];
    return transitChart.planets.map((p) => ({
      ...p,
      houseFromNatalLagna: houseFrom(natalView.lagnaSignIndex, p.signIndex),
    }));
  }, [transitChart, natalView]);

  return (
    <section className="panel">
      <header className="panel-head flex flex-wrap items-end justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="font-display text-lg text-gold-300">Gochar — Transit Overlay</h2>
          <p className="text-[11px] text-slate-400">
            Transiting positions for {moment.localLabel} ({moment.zone}), mapped onto the natal chart.
          </p>
        </div>
        <div>
          <label className="field-label" htmlFor="transit-date">
            Transit moment
          </label>
          <input
            id="transit-date"
            type="datetime-local"
            className="field !w-auto"
            value={transitDate}
            onChange={(e) => onTransitDateChange(e.target.value)}
          />
        </div>
      </header>

      <div className="p-4">
        {refreshing && <p className="mb-3 text-[11px] text-gold-300">Recalculating transits…</p>}

        {doubleTransits.length > 0 && (
          <div className="mb-4 space-y-2">
            {doubleTransits.map((d) => (
              <div
                key={d.id}
                className="rounded-md border border-gold-500/40 bg-gold-500/10 px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-gold-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gold-300">
                    Double transit
                  </span>
                  <h3 className="text-sm font-semibold text-gold-300">{d.title}</h3>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-slate-300">{d.text}</p>
              </div>
            ))}
          </div>
        )}

        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Active transit links <span className="tnum text-slate-600">({hits.length})</span>
        </h3>

        {hits.length === 0 ? (
          <p className="text-sm text-slate-500">
            No transiting planet is currently conjunct or trine a natal planet.
          </p>
        ) : (
          <div className="space-y-2">
            {hits.map((h) => {
              const sev = SEVERITY[h.severity] || SEVERITY.moderate;
              return (
                <article
                  key={h.id}
                  className={`rounded-md border border-ink-700 bg-ink-900/50 px-3 py-2.5 ${
                    h.severity === 'major' ? 'border-l-[3px] border-l-flame-400' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h4 className="text-sm font-semibold text-slate-100">
                      <span style={{ color: PLANET_META[h.transitPlanet]?.color }}>
                        ↻{PLANET_META[h.transitPlanet]?.symbol}
                      </span>
                      {' → '}
                      <span style={{ color: PLANET_META[h.natalPlanet]?.color }}>
                        {PLANET_META[h.natalPlanet]?.symbol}
                      </span>{' '}
                      {h.title}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      {h.exact && (
                        <span className="rounded bg-gold-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-gold-300">
                          exact
                        </span>
                      )}
                      {h.transitRetrograde && (
                        <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[9px] text-flame-400">℞</span>
                      )}
                      <span className={`rounded px-1.5 py-0.5 text-[9px] uppercase ring-1 ${sev.cls}`}>
                        {sev.label}
                      </span>
                    </div>
                  </div>
                  <p className="tnum mt-0.5 text-[11px] text-slate-500">
                    {h.relation === 'conjunction'
                      ? `Conjunct in ${h.sign}${h.gapDeg != null ? ` · ${h.gapDeg.toFixed(2)}° orb` : ''}`
                      : `Trine — transit in ${h.sign}, natal in ${h.natalSign}`}
                    {!h.curated && ' · derived'}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300">{h.text}</p>
                </article>
              );
            })}
          </div>
        )}

        <h3 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Transiting positions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-700 text-left text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-2 py-2 font-medium">Planet</th>
                <th className="px-2 py-2 font-medium">Sign</th>
                <th className="px-2 py-2 text-right font-medium">Degree</th>
                <th className="px-2 py-2 text-center font-medium">R</th>
                <th className="px-2 py-2 text-right font-medium">House from natal Lagna</th>
                <th className="px-2 py-2 text-right font-medium">Nadi Amsha</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.key} className="border-b border-ink-800/70 hover:bg-ink-800/40">
                  <td className="px-2 py-1.5 whitespace-nowrap font-medium" style={{ color: PLANET_META[p.key]?.color }}>
                    {PLANET_META[p.key]?.symbol} {p.key}
                  </td>
                  <td className="px-2 py-1.5">
                    {p.sign}
                    <span className="ml-1 text-[10px] text-slate-500">{SIGNS[p.signIndex]?.sanskrit}</span>
                  </td>
                  <td className="tnum px-2 py-1.5 text-right">{p.dmsLabel}</td>
                  <td className="px-2 py-1.5 text-center">
                    {p.retrograde ? <span className="text-flame-400">℞</span> : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="tnum px-2 py-1.5 text-right">{p.houseFromNatalLagna}</td>
                  <td className="tnum px-2 py-1.5 text-right text-slate-400">
                    {p.nadiAmsha.index}/150 · {p.nadiAmsha.d150Sign}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          Transits are computed against the natal chart at the <em>stated</em> birth time. If you rectify the
          time with the slider, press “Apply this time” to recompute this panel against the corrected chart.
        </p>
      </div>
    </section>
  );
}
