import { useMemo } from 'react';
import { SIGNS } from '../lib/constants';
import { bodiesBySign, tokenLabel, houseOfSign } from '../lib/chartView';
import { CELL_TO_SIGN } from '../lib/southChartGeometry';

/**
 * South Indian (square) chart.
 *
 * The inverse of the North Indian layout: the signs are fixed in place -
 * Aries is always the second cell of the top row and the zodiac runs
 * clockwise - while the houses rotate with the Ascendant. The Lagna cell is
 * marked with a diagonal stroke, as it is drawn by hand.
 *
 * The cell map lives in lib/southChartGeometry.js and is verified by
 * scripts/verify-chart-geometry.mjs.
 */

export default function SouthIndianChart({
  view,
  transit = null,
  showTransits = false,
  title = 'Rasi (D-1) — South Indian',
  highlightPlanets = [],
  centre = null,
}) {
  const buckets = useMemo(
    () => bodiesBySign(view, { transit: showTransits ? transit : null }),
    [view, transit, showTransits]
  );

  if (!view) return null;
  const lagna = view.lagnaSignIndex;
  const highlight = new Set(highlightPlanets);

  return (
    <figure className="w-full">
      <div className="grid aspect-square w-full grid-cols-4 grid-rows-4 gap-[2px] rounded-lg bg-ink-700 p-[2px]">
        {Array.from({ length: 16 }, (_, i) => {
          const row = Math.floor(i / 4);
          const col = i % 4;
          const signIndex = CELL_TO_SIGN.get(`${row}-${col}`);

          // The 2x2 middle is not a sign - it carries the chart caption.
          if (signIndex === undefined) {
            if (row === 1 && col === 1) {
              return (
                <div
                  key={i}
                  className="col-span-2 row-span-2 flex flex-col items-center justify-center rounded bg-ink-900 p-2 text-center"
                >
                  {centre ?? (
                    <>
                      <div className="font-display text-sm text-gold-400">Rasi</div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        Lagna <span className="text-sky-ish-400">{SIGNS[lagna].name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{SIGNS[lagna].sanskrit}</div>
                    </>
                  )}
                </div>
              );
            }
            return null; // covered by the spanning centre cell
          }

          const tokens = buckets[signIndex];
          const house = houseOfSign(lagna, signIndex);
          const isLagna = signIndex === lagna;

          return (
            <div
              key={i}
              className={`relative min-h-[74px] overflow-hidden rounded bg-ink-850 p-1.5 ${
                isLagna ? 'ring-1 ring-gold-500/60' : ''
              }`}
            >
              {/* Hand-drawn style Lagna diagonal. */}
              {isLagna && (
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <line x1="0" y1="0" x2="38" y2="38" stroke="#d4af37" strokeWidth="2" opacity="0.75" />
                </svg>
              )}

              <div className="flex items-start justify-between text-[9px] leading-none text-slate-500">
                <span className="tnum">{house}</span>
                <span className="truncate pl-1 text-right">{SIGNS[signIndex].name.slice(0, 3)}</span>
              </div>

              <div className="mt-1 flex flex-col gap-[1px]">
                {tokens.map((t) => (
                  <span
                    key={`${t.kind}-${t.key}`}
                    className={`tnum leading-tight ${
                      t.kind === 'transit' ? 'text-[10px] opacity-80' : 'text-[11.5px]'
                    } ${t.isAscendant || highlight.has(t.key) ? 'font-bold' : 'font-medium'}`}
                    style={{ color: t.kind === 'transit' ? '#6f6f9e' : t.color }}
                    title={`${t.key} ${t.sign} ${t.dmsLabel}${t.dignity ? ` · ${t.dignity}` : ''}`}
                  >
                    {t.kind === 'transit' ? `↻${tokenLabel(t)}` : tokenLabel(t)}
                    {highlight.has(t.key) && t.kind === 'natal' ? ' •' : ''}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>{title}</span>
        <span>
          Signs fixed, houses rotate · Lagna cell ringed in gold
          {showTransits && transit ? ' · ↻ = transit' : ''}
        </span>
      </figcaption>
    </figure>
  );
}
