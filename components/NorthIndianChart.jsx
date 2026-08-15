import { useMemo } from 'react';
import { SIGNS } from '../lib/constants';
import { bodiesBySign, tokenLabel, signInHouse } from '../lib/chartView';
import { HOUSE_ANCHORS, HOUSE_POLYGONS, polygonPoints } from '../lib/northChartGeometry';

/**
 * North Indian (diamond) chart.
 *
 * Houses are fixed in position - house 1 is always the top-centre diamond and
 * they run anticlockwise. The signs rotate: whichever sign the Ascendant falls
 * in is written into house 1.
 *
 * The cell geometry lives in lib/northChartGeometry.js and is verified by
 * scripts/verify-chart-geometry.mjs.
 */

export default function NorthIndianChart({
  view,
  transit = null,
  showTransits = false,
  title = 'Rasi (D-1) — North Indian',
  highlightPlanets = [],
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
      <svg viewBox="-6 -6 412 412" className="w-full h-auto" role="img" aria-label={title}>
        <defs>
          <linearGradient id="ni-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#141430" />
            <stop offset="100%" stopColor="#0c0c1e" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="400" height="400" fill="url(#ni-bg)" />

        {/* House cells drawn first so the grid lines sit on top. */}
        {Object.keys(HOUSE_POLYGONS).map((house) => (
          <polygon
            key={`cell-${house}`}
            points={polygonPoints(Number(house))}
            fill={Number(house) === 1 ? 'rgb(212 175 55 / 0.09)' : 'transparent'}
            stroke="none"
          />
        ))}

        {/* Frame, diagonals and inner diamond. */}
        <g stroke="#3a3a6b" strokeWidth="1.2" fill="none">
          <rect x="0" y="0" width="400" height="400" strokeWidth="1.8" />
          <line x1="0" y1="0" x2="400" y2="400" />
          <line x1="400" y1="0" x2="0" y2="400" />
          <polygon points="200,0 400,200 200,400 0,200" />
        </g>

        {Object.entries(HOUSE_ANCHORS).map(([houseStr, anchor]) => {
          const house = Number(houseStr);
          const signIndex = signInHouse(lagna, house);
          const tokens = buckets[signIndex];
          const [sx, sy] = anchor.sign;
          const [bx, by] = anchor.body;
          const lineHeight = 14;
          const startY = by - ((tokens.length - 1) * lineHeight) / 2;

          return (
            <g key={`house-${house}`}>
              {/* Sign number - the rotating part of a North Indian chart. */}
              <text
                x={sx}
                y={sy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fill="#7b7bb0"
                className="tnum"
              >
                {signIndex + 1}
              </text>

              {tokens.map((t, i) => (
                <text
                  key={`${t.kind}-${t.key}`}
                  x={bx}
                  y={startY + i * lineHeight}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={t.kind === 'transit' ? 11 : 12.5}
                  fontWeight={t.isAscendant || highlight.has(t.key) ? 700 : 500}
                  fill={t.kind === 'transit' ? '#6f6f9e' : t.color}
                  opacity={t.kind === 'transit' ? 0.95 : 1}
                  className="tnum"
                >
                  {t.kind === 'transit' ? `↻${tokenLabel(t)}` : tokenLabel(t)}
                  {highlight.has(t.key) && t.kind === 'natal' ? ' •' : ''}
                </text>
              ))}
            </g>
          );
        })}
      </svg>

      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>{title}</span>
        <span>
          Lagna: <span className="text-sky-ish-400">{SIGNS[lagna].name}</span> ({SIGNS[lagna].sanskrit}) · houses
          fixed, signs rotate
          {showTransits && transit ? ' · ↻ = transit' : ''}
        </span>
      </figcaption>
    </figure>
  );
}
