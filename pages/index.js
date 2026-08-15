import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BirthForm from '../components/BirthForm';
import BTRPanel from '../components/BTRPanel';
import NorthIndianChart from '../components/NorthIndianChart';
import SouthIndianChart from '../components/SouthIndianChart';
import PlanetTable from '../components/PlanetTable';
import ReadingsPanel from '../components/ReadingsPanel';
import TransitPanel from '../components/TransitPanel';
import { SIGNS } from '../lib/constants';

const DEFAULT_FORM = {
  name: 'Reference Chart',
  date: '1947-08-15',
  time: '00:00:00',
  place: 'New Delhi, India',
  lat: 28.6139,
  lon: 77.209,
  tz: 'Asia/Kolkata',
  ayanamsa: 'lahiri',
  nodeType: 'mean',
  rangeMinutes: 30,
  stepSeconds: 60,
};

const TABS = [
  { key: 'rectify', label: 'Rectification' },
  { key: 'chart', label: 'Charts' },
  { key: 'planets', label: 'Planetary Degrees' },
  { key: 'readings', label: 'Nadi Readings' },
  { key: 'transit', label: 'Gochar / Transits' },
];

function localDatetimeValue(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Dashboard() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const [btrIndex, setBtrIndex] = useState(0);
  const [chartStyle, setChartStyle] = useState('north');
  const [showTransits, setShowTransits] = useState(false);
  const [tab, setTab] = useState('rectify');
  const [transitDate, setTransitDate] = useState(() => localDatetimeValue());

  const requestId = useRef(0);

  const calculate = useCallback(
    async (overrides = {}, { isApply = false } = {}) => {
      const payload = { ...form, ...overrides };
      const id = ++requestId.current;

      if (isApply) setApplying(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: payload.name,
            date: payload.date,
            time: payload.time,
            tz: payload.tz,
            lat: Number(payload.lat),
            lon: Number(payload.lon),
            ayanamsa: payload.ayanamsa,
            nodeType: payload.nodeType,
            btr: { rangeMinutes: payload.rangeMinutes, stepSeconds: payload.stepSeconds },
            transitDate: payload.transitDate || undefined,
          }),
        });

        const json = await res.json();
        // A slower earlier request must never overwrite a newer result.
        if (id !== requestId.current) return;

        if (!res.ok || !json.ok) {
          setError({ error: json.error || `Request failed (${res.status})`, detail: json.detail });
          return;
        }

        setData(json);
        setBtrIndex(json.btr.baseIndex);
      } catch (err) {
        if (id === requestId.current) setError({ error: 'Network error', detail: err.message });
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setApplying(false);
        }
      }
    },
    [form]
  );

  // Cast the reference chart once on mount so the dashboard is never empty.
  useEffect(() => {
    calculate({ transitDate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Adopt a rectified time as the new stated birth time. */
  const applyRectifiedTime = useCallback(
    (variant) => {
      const nextTime = variant.timeLabel;
      const nextDate = variant.localLabel.slice(0, 10);
      setForm((f) => ({ ...f, time: nextTime, date: nextDate }));
      calculate({ time: nextTime, date: nextDate, transitDate }, { isApply: true });
    },
    [calculate, transitDate]
  );

  const onTransitDateChange = useCallback(
    (value) => {
      setTransitDate(value);
      calculate({ transitDate: value }, { isApply: true });
    },
    [calculate]
  );

  /* ---- Derived view for the currently selected BTR variant --------------- */

  const activeVariant = useMemo(() => {
    if (!data) return null;
    return data.btr.variants[Math.min(btrIndex, data.btr.variants.length - 1)];
  }, [data, btrIndex]);

  const baseVariant = useMemo(() => (data ? data.btr.variants[data.btr.baseIndex] : null), [data]);

  const changedSigns = useMemo(() => {
    if (!activeVariant || !baseVariant) return new Set();
    const out = new Set();
    if (activeVariant.ascendant.signIndex !== baseVariant.ascendant.signIndex) out.add('Lagna');
    for (const p of activeVariant.planets) {
      const b = baseVariant.planets.find((x) => x.key === p.key);
      if (b && b.signIndex !== p.signIndex) out.add(p.key);
    }
    return out;
  }, [activeVariant, baseVariant]);

  /** Natal planets currently being hit by a transit - highlighted in the chart. */
  const transitTargets = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.transit.hits.filter((h) => h.relation === 'conjunction').map((h) => h.natalPlanet))];
  }, [data]);

  const isRectified = data && btrIndex !== data.btr.baseIndex;

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
      {/* ---- Header --------------------------------------------------------- */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-gold-300">
            Nadi Jyotish <span className="text-slate-500">·</span>{' '}
            <span className="text-xl text-slate-300">Bhrigu Nadi Dashboard</span>
          </h1>
          <p className="mt-1 text-[12px] text-slate-400">
            Swiss Ephemeris sidereal positions · 150-part Nadi Amsha resolution · planet-link readings without
            dashas
          </p>
        </div>
        {data && (
          <div className="text-right text-[11px] text-slate-400">
            <div>
              Ayanamsa <span className="tnum text-gold-300">{data.chart.meta.ayanamsa.formatted}</span>{' '}
              {data.chart.meta.ayanamsa.label}
            </div>
            <div className="tnum">
              JD {data.chart.meta.jd.toFixed(6)} UT · {data.chart.meta.timing.utcLabel} UTC
            </div>
            <div>
              {data.chart.meta.ephemeris.binding} {data.chart.meta.ephemeris.swissEphemerisVersion} ·{' '}
              <span className={data.chart.meta.ephemeris.precision === 'moshier' ? 'text-saffron-400' : 'text-leaf-400'}>
                {data.chart.meta.ephemeris.precision}
              </span>{' '}
              · computed in {data.computedInMs} ms
            </div>
          </div>
        )}
      </header>

      <div className="mb-5">
        <BirthForm
          value={form}
          onChange={setForm}
          onSubmit={() => calculate({ transitDate })}
          loading={loading}
          error={error}
        />
      </div>

      {!data && loading && (
        <div className="panel p-10 text-center text-sm text-slate-400">Casting the chart…</div>
      )}

      {data && activeVariant && (
        <>
          {/* ---- Summary strip --------------------------------------------- */}
          <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryTile
              label="Native"
              value={data.chart.meta.name || '—'}
              sub={`${form.place || `${form.lat}, ${form.lon}`}`}
            />
            <SummaryTile
              label="Birth moment"
              value={activeVariant.timeLabel}
              // The variant carries its own date: a ±30 min window can cross midnight.
              sub={`${activeVariant.localLabel.slice(0, 10)} · ${data.chart.meta.timing.zone}${
                isRectified ? ' · rectified' : ''
              }`}
              tone={isRectified ? 'gold' : 'default'}
            />
            <SummaryTile
              label="Lagna"
              value={`${SIGNS[activeVariant.ascendant.signIndex].name} ${activeVariant.ascendant.dmsLabel}`}
              sub={`${SIGNS[activeVariant.ascendant.signIndex].sanskrit} · lord ${SIGNS[activeVariant.ascendant.signIndex].lord}`}
              tone="sky"
            />
            <SummaryTile
              label="Lagna Nadi Amsha"
              value={`${activeVariant.ascendant.nadiAmsha.index} / 150`}
              sub={`${activeVariant.ascendant.nadiAmsha.arcLabel} · D-150 ${activeVariant.ascendant.nadiAmsha.d150Sign}`}
              tone="gold"
            />
            <SummaryTile
              label="Nadi links found"
              value={`${data.analysis.summary.conjunctionCount + data.analysis.summary.trineCount}`}
              sub={`${data.analysis.summary.conjunctionCount} conjunct · ${data.analysis.summary.trineCount} trine · ${data.analysis.summary.tripleCount} yogas`}
            />
          </div>

          {/* ---- Tabs ------------------------------------------------------- */}
          <nav className="mb-4 flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  tab === t.key
                    ? 'bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/40'
                    : 'text-slate-400 hover:bg-ink-800 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* ---- Rectification --------------------------------------------- */}
          {tab === 'rectify' && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <BTRPanel
                btr={data.btr}
                readingsIndex={data.readingsIndex}
                index={btrIndex}
                onIndexChange={setBtrIndex}
                onApply={applyRectifiedTime}
                applying={applying}
              />
              <div className="panel p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-lg text-gold-300">Live Chart</h2>
                  <ChartToggle value={chartStyle} onChange={setChartStyle} />
                </div>
                {chartStyle === 'north' ? (
                  <NorthIndianChart view={activeVariant} highlightPlanets={[...changedSigns]} />
                ) : (
                  <SouthIndianChart view={activeVariant} highlightPlanets={[...changedSigns]} />
                )}
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                  The chart redraws on every slider step. Planets marked • have changed sign relative to the
                  stated birth time.
                </p>
              </div>
            </div>
          )}

          {/* ---- Charts ----------------------------------------------------- */}
          {tab === 'chart' && (
            <div className="panel p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg text-gold-300">Rasi Chart (D-1)</h2>
                  <p className="text-[11px] text-slate-400">
                    {isRectified
                      ? `Rectified time ${activeVariant.timeLabel}`
                      : `Stated time ${data.chart.meta.timing.timeLabel}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={showTransits}
                      onChange={(e) => setShowTransits(e.target.checked)}
                      className="accent-gold-500"
                    />
                    Overlay transits
                  </label>
                  <ChartToggle value={chartStyle} onChange={setChartStyle} />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="mx-auto w-full max-w-[520px]">
                  {chartStyle === 'north' ? (
                    <NorthIndianChart
                      view={activeVariant}
                      transit={data.transit.chart}
                      showTransits={showTransits}
                      highlightPlanets={transitTargets}
                    />
                  ) : (
                    <SouthIndianChart
                      view={activeVariant}
                      transit={data.transit.chart}
                      showTransits={showTransits}
                      highlightPlanets={transitTargets}
                    />
                  )}
                </div>

                <div className="space-y-3 text-[12px]">
                  <div className="rounded-lg border border-ink-700 bg-ink-900/50 p-3">
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Houses (whole sign from Lagna)
                    </h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {Array.from({ length: 12 }, (_, i) => {
                        const house = i + 1;
                        const signIndex = (activeVariant.lagnaSignIndex + i) % 12;
                        const occupants = activeVariant.planets.filter((p) => p.signIndex === signIndex);
                        return (
                          <div key={house} className="flex gap-2">
                            <span className="tnum w-5 shrink-0 text-right text-slate-500">{house}</span>
                            <span className="text-slate-300">{SIGNS[signIndex].name}</span>
                            <span className="truncate text-slate-500">
                              {occupants.map((p) => p.key).join(', ') || '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {showTransits && (
                    <div className="rounded-lg border border-ink-700 bg-ink-900/50 p-3">
                      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Transit overlay legend
                      </h3>
                      <p className="text-slate-400">
                        Entries prefixed <span className="text-slate-300">↻</span> are transiting positions for{' '}
                        {data.transit.moment.localLabel}. Natal planets marked • are currently under a
                        conjunction transit — see the Gochar tab for the readings.
                      </p>
                    </div>
                  )}

                  <p className="text-[11px] leading-relaxed text-slate-500">
                    North Indian style keeps the houses fixed and rotates the signs; South Indian style keeps
                    the signs fixed and rotates the houses. Both show the same chart.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ---- Planetary degrees ------------------------------------------ */}
          {tab === 'planets' && (
            <div className="panel p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg text-gold-300">Planetary Degrees</h2>
                  <p className="text-[11px] text-slate-400">
                    {isRectified
                      ? `Rectified to ${activeVariant.localLabel} (${
                          activeVariant.offsetSeconds > 0 ? '+' : '−'
                        }${Math.abs(Math.round(activeVariant.offsetSeconds / 60))} min)`
                      : `Stated birth time ${data.chart.meta.timing.localLabel}`}
                  </p>
                </div>
              </div>
              <PlanetTable view={activeVariant} changedSigns={changedSigns} />
            </div>
          )}

          {/* ---- Readings ---------------------------------------------------- */}
          {tab === 'readings' && (
            <ReadingsPanel
              variant={activeVariant}
              baseVariant={baseVariant}
              readingsIndex={data.readingsIndex}
              significators={data.manifest.significators}
            />
          )}

          {/* ---- Transits ---------------------------------------------------- */}
          {tab === 'transit' && (
            <TransitPanel
              transit={data.transit}
              natalView={activeVariant}
              transitDate={transitDate}
              onTransitDateChange={onTransitDateChange}
              refreshing={applying}
            />
          )}

          <footer className="mt-8 border-t border-ink-800 pt-4 text-[11px] leading-relaxed text-slate-500">
            <p>
              Rule corpus: {data.manifest.conjunctionPairs} conjunction/trine pairs ·{' '}
              {data.manifest.oppositionPairs} curated oppositions · {data.manifest.secondRules} 2nd-house ·{' '}
              {data.manifest.twelfthRules} 12th-house · {data.manifest.tripleYogas} three-planet yogas ·{' '}
              {data.manifest.transitRules} transit rules. Pairs without a hand-written entry are composed from
              the significator table and badged “derived”.
            </p>
            <p className="mt-1">
              Positions are computed by Swiss Ephemeris and are astronomically exact; the interpretations are a
              traditional Bhrigu Nadi corpus and are offered for study, not as advice.
            </p>
          </footer>
        </>
      )}
    </main>
  );
}

function ChartToggle({ value, onChange }) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-ink-600">
      {[
        { key: 'north', label: 'North Indian' },
        { key: 'south', label: 'South Indian' },
      ].map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 text-xs transition ${
            value === o.key ? 'bg-gold-500/20 text-gold-300' : 'text-slate-400 hover:bg-ink-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SummaryTile({ label, value, sub, tone = 'default' }) {
  const toneClass = tone === 'gold' ? 'text-gold-300' : tone === 'sky' ? 'text-sky-ish-400' : 'text-slate-100';
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-850/70 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`tnum mt-0.5 truncate text-base font-semibold ${toneClass}`} title={String(value)}>
        {value}
      </div>
      {sub && <div className="tnum mt-0.5 truncate text-[11px] text-slate-400" title={sub}>{sub}</div>}
    </div>
  );
}
