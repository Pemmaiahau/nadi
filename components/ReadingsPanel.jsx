import { useMemo, useState } from 'react';
import { PLANET_META } from '../lib/constants';

/**
 * Bhrigu Nadi readings for the currently selected (possibly rectified) time.
 * Readings that are not present at the stated birth time are badged, so the
 * effect of the rectification slider stays visible while reading the text.
 */

const CATEGORY_ORDER = [
  { key: 'triple', label: 'Three-Planet Yogas' },
  { key: 'conjunction', label: 'Conjunctions' },
  { key: 'trine', label: 'Trines (1/5/9)' },
  { key: 'lagna', label: 'Lagna Links' },
  { key: 'opposition', label: '7th Aspects' },
  { key: 'second', label: '2nd — Future' },
  { key: 'twelfth', label: '12th — Past' },
  { key: 'house', label: 'House Placements' },
];

const POLARITY_CLASS = {
  benefic: 'pol-benefic',
  mixed: 'pol-mixed',
  challenging: 'pol-challenging',
};

export default function ReadingsPanel({ variant, baseVariant, readingsIndex, significators }) {
  const [active, setActive] = useState(() => new Set(['triple', 'conjunction', 'trine', 'lagna']));
  const [hideGenerated, setHideGenerated] = useState(false);

  const baseIds = useMemo(() => new Set(baseVariant.readings.map((r) => r.id)), [baseVariant]);

  const grouped = useMemo(() => {
    const out = {};
    for (const item of variant.readings) {
      const r = readingsIndex[item.id];
      if (!r) continue;
      if (hideGenerated && r.generated) continue;
      (out[r.category] = out[r.category] || []).push({ ...r, subtitle: item.subtitle });
    }
    for (const list of Object.values(out)) list.sort((a, b) => b.weight - a.weight);
    return out;
  }, [variant, readingsIndex, hideGenerated]);

  const counts = useMemo(() => {
    const c = {};
    for (const item of variant.readings) {
      const r = readingsIndex[item.id];
      if (!r) continue;
      c[r.category] = (c[r.category] || 0) + 1;
    }
    return c;
  }, [variant, readingsIndex]);

  const visible = CATEGORY_ORDER.filter((c) => active.has(c.key) && grouped[c.key]?.length);
  const totalShown = visible.reduce((n, c) => n + grouped[c.key].length, 0);

  const toggle = (key) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="panel">
      <header className="panel-head px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg text-gold-300">Bhrigu Nadi Readings</h2>
            <p className="text-[11px] text-slate-400">
              Planet-to-planet links, read without reference to dashas. {totalShown} shown.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-400">
            <input
              type="checkbox"
              checked={hideGenerated}
              onChange={(e) => setHideGenerated(e.target.checked)}
              className="accent-gold-500"
            />
            Curated rules only
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {CATEGORY_ORDER.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => toggle(c.key)}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                active.has(c.key)
                  ? 'border-gold-500/50 bg-gold-500/15 text-gold-300'
                  : 'border-ink-600 text-slate-400 hover:border-ink-500 hover:text-slate-300'
              }`}
            >
              {c.label}
              <span className="tnum ml-1 text-slate-500">{counts[c.key] || 0}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="max-h-[720px] space-y-5 overflow-y-auto p-4">
        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            No readings in the selected categories. Enable more filters above.
          </p>
        )}

        {visible.map((c) => (
          <div key={c.key}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {c.label}
            </h3>
            <div className="space-y-2">
              {grouped[c.key].map((r) => {
                const isNew = !baseIds.has(r.id);
                return (
                  <article
                    key={r.id}
                    className={`rounded-md border border-ink-700 border-l-[3px] bg-ink-900/50 px-3 py-2.5 ${
                      POLARITY_CLASS[r.polarity] || 'pol-mixed'
                    } ${isNew ? 'flash-in' : ''}`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h4 className="text-sm font-semibold text-slate-100">
                        {r.planets
                          ?.filter((p) => PLANET_META[p])
                          .map((p) => (
                            <span key={p} style={{ color: PLANET_META[p].color }} className="mr-1">
                              {PLANET_META[p].symbol}
                            </span>
                          ))}
                        {r.title}
                      </h4>
                      <div className="flex items-center gap-1.5">
                        {isNew && (
                          <span className="rounded bg-leaf-400/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-leaf-400">
                            rectified in
                          </span>
                        )}
                        {r.generated && (
                          <span
                            className="rounded bg-ink-700 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-slate-400"
                            title="Composed from the significator table rather than a hand-written rule"
                          >
                            derived
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">{r.theme}</span>
                      </div>
                    </div>
                    <p className="tnum mt-0.5 text-[11px] text-slate-500">{r.subtitle}</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300">{r.text}</p>
                    {r.tags?.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {r.tags.map((t) => (
                          <span key={t} className="rounded bg-ink-800 px-1.5 py-0.5 text-[9.5px] text-slate-400">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {significators && (
        <footer className="border-t border-ink-700 px-4 py-3">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Nadi Significators
          </h3>
          <div className="grid gap-x-4 gap-y-1 text-[11px] sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(significators).map(([planet, s]) => (
              <div key={planet} className="flex gap-1.5">
                <span className="font-semibold" style={{ color: PLANET_META[planet]?.color }}>
                  {PLANET_META[planet]?.symbol} {planet}
                </span>
                <span className="text-slate-400">{s.primary}</span>
              </div>
            ))}
          </div>
        </footer>
      )}
    </section>
  );
}
