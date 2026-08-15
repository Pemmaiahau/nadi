import { toDMS, SIGNS, PLANET_META } from '../lib/constants';

/**
 * Exact planetary positions to the arcsecond, with the Nadi Amsha each body
 * occupies. The Ascendant is listed first because in a rectification context
 * it is the fastest-moving and most decisive row in the table.
 */

function DignityBadge({ dignity }) {
  if (!dignity) return null;
  const tone = dignity.startsWith('Exalted')
    ? 'bg-leaf-400/15 text-leaf-400 ring-leaf-400/30'
    : dignity.startsWith('Debilitated')
      ? 'bg-flame-400/15 text-flame-400 ring-flame-400/30'
      : 'bg-gold-500/15 text-gold-300 ring-gold-500/30';
  return (
    <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] ring-1 ${tone}`}>{dignity}</span>
  );
}

export default function PlanetTable({ view, changedSigns = new Set() }) {
  if (!view) return null;

  const rows = [{ ...view.ascendant, key: 'Lagna', isAscendant: true }, ...view.planets];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-700 text-left text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-2 py-2 font-medium">Body</th>
            <th className="px-2 py-2 font-medium">Sign</th>
            <th className="px-2 py-2 text-right font-medium">Deg</th>
            <th className="px-2 py-2 text-right font-medium">Min</th>
            <th className="px-2 py-2 text-right font-medium">Sec</th>
            <th className="px-2 py-2 text-center font-medium">R</th>
            <th className="px-2 py-2 text-right font-medium">Hs</th>
            <th className="px-2 py-2 font-medium">Nakshatra</th>
            <th className="px-2 py-2 text-right font-medium">Nadi Amsha</th>
            <th className="px-2 py-2 font-medium">Amsha Arc</th>
            <th className="px-2 py-2 font-medium">D-150</th>
            <th className="px-2 py-2 font-medium">Dignity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const dms = toDMS(p.degInSign);
            const meta = PLANET_META[p.key] || {};
            const na = p.nadiAmsha;
            const moved = changedSigns.has(p.key);

            return (
              <tr
                key={p.key}
                className={`border-b border-ink-800/70 transition-colors hover:bg-ink-800/40 ${
                  p.isAscendant ? 'bg-gold-500/[0.06]' : ''
                } ${moved ? 'bg-leaf-400/[0.08]' : ''}`}
              >
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <span className="font-medium" style={{ color: meta.color }}>
                    {meta.symbol} {p.isAscendant ? 'Ascendant' : p.key}
                  </span>
                  {moved && (
                    <span className="ml-1.5 rounded bg-leaf-400/20 px-1 text-[9px] text-leaf-400">moved</span>
                  )}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {p.sign}
                  <span className="ml-1 text-[10px] text-slate-500">
                    {SIGNS[p.signIndex]?.sanskrit}
                  </span>
                </td>
                <td className="tnum px-2 py-1.5 text-right">{String(dms.d).padStart(2, '0')}°</td>
                <td className="tnum px-2 py-1.5 text-right">{String(dms.m).padStart(2, '0')}′</td>
                <td className="tnum px-2 py-1.5 text-right text-slate-300">{dms.s.toFixed(2)}″</td>
                <td className="px-2 py-1.5 text-center">
                  {p.retrograde ? <span className="text-flame-400">℞</span> : <span className="text-slate-600">—</span>}
                </td>
                <td className="tnum px-2 py-1.5 text-right">{p.house}</td>
                <td className="px-2 py-1.5 whitespace-nowrap text-slate-300">
                  {p.nakshatra?.name}
                  <span className="ml-1 text-[10px] text-slate-500">
                    p{p.nakshatra?.pada} · {p.nakshatra?.lord}
                  </span>
                </td>
                <td className="tnum px-2 py-1.5 text-right">
                  <span className="font-semibold text-gold-300">{na?.index}</span>
                  <span className="text-slate-500">/150</span>
                  <div className="text-[9px] text-slate-500">#{na?.indexInZodiac} of 1800</div>
                </td>
                <td className="tnum px-2 py-1.5 whitespace-nowrap text-[11px] text-slate-400">{na?.arcLabel}</td>
                <td className="px-2 py-1.5 whitespace-nowrap text-[11px] text-slate-300">{na?.d150Sign}</td>
                <td className="px-2 py-1.5">
                  <DignityBadge dignity={p.dignity} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Sidereal longitudes, whole-sign houses. Each Nadi Amsha spans exactly 0°12′ of arc — 150 of them per
        sign, 1800 across the zodiac. The Ascendant crosses one roughly every 48 seconds of clock time, which
        is why the rectification slider matters.
      </p>
    </div>
  );
}
