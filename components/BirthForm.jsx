import { useState } from 'react';
import { CITIES, COMMON_TIMEZONES } from '../lib/cities';

/** Birth data entry. Places come from a small built-in table so the app needs
 *  no geocoding service; anything else can be typed in directly. */
export default function BirthForm({ value, onChange, onSubmit, loading, error }) {
  const [open, setOpen] = useState(true);
  const set = (patch) => onChange({ ...value, ...patch });

  const applyCity = (name) => {
    const city = CITIES.find((c) => c.name === name);
    if (city) set({ place: city.name, lat: city.lat, lon: city.lon, tz: city.tz });
    else set({ place: name });
  };

  return (
    <section className="panel">
      <header className="panel-head flex items-center justify-between px-4 py-3">
        <div>
          <h2 className="font-display text-lg text-gold-300">Birth Data</h2>
          <p className="text-[11px] text-slate-400">
            Local civil time at the birth place — the app converts to UT itself.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-md border border-ink-600 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-ink-800"
        >
          {open ? 'Hide' : 'Edit'}
        </button>
      </header>

      {open && (
        <form
          className="p-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <label className="field-label" htmlFor="bf-name">Name</label>
              <input
                id="bf-name"
                className="field"
                value={value.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="bf-date">Date of birth</label>
              <input
                id="bf-date"
                type="date"
                className="field"
                required
                value={value.date}
                onChange={(e) => set({ date: e.target.value })}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="bf-time">Time of birth (local)</label>
              <input
                id="bf-time"
                type="time"
                step="1"
                className="field"
                required
                value={value.time}
                onChange={(e) => set({ time: e.target.value })}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="bf-place">Place</label>
              <input
                id="bf-place"
                className="field"
                list="city-list"
                value={value.place}
                onChange={(e) => applyCity(e.target.value)}
                placeholder="Start typing a city…"
              />
              <datalist id="city-list">
                {CITIES.map((c) => (
                  <option key={c.name} value={c.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="field-label" htmlFor="bf-lat">Latitude (N +)</label>
              <input
                id="bf-lat"
                type="number"
                step="0.0001"
                min="-90"
                max="90"
                className="field tnum"
                required
                value={value.lat}
                onChange={(e) => set({ lat: e.target.value })}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="bf-lon">Longitude (E +)</label>
              <input
                id="bf-lon"
                type="number"
                step="0.0001"
                min="-180"
                max="180"
                className="field tnum"
                required
                value={value.lon}
                onChange={(e) => set({ lon: e.target.value })}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="bf-tz">Timezone</label>
              <input
                id="bf-tz"
                className="field"
                list="tz-list"
                required
                value={value.tz}
                onChange={(e) => set({ tz: e.target.value })}
                placeholder="Asia/Kolkata or +5:30"
              />
              <datalist id="tz-list">
                {COMMON_TIMEZONES.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="field-label" htmlFor="bf-ayanamsa">Ayanamsa</label>
              <select
                id="bf-ayanamsa"
                className="field"
                value={value.ayanamsa}
                onChange={(e) => set({ ayanamsa: e.target.value })}
              >
                <option value="lahiri">Lahiri (Chitra Paksha)</option>
                <option value="raman">B. V. Raman</option>
                <option value="krishnamurti">Krishnamurti (KP)</option>
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="bf-node">Lunar nodes</label>
              <select
                id="bf-node"
                className="field"
                value={value.nodeType}
                onChange={(e) => set({ nodeType: e.target.value })}
              >
                <option value="mean">Mean node</option>
                <option value="true">True node</option>
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="bf-range">BTR window (± minutes)</label>
              <select
                id="bf-range"
                className="field"
                value={value.rangeMinutes}
                onChange={(e) => set({ rangeMinutes: Number(e.target.value) })}
              >
                {[5, 10, 15, 30, 60, 120].map((m) => (
                  <option key={m} value={m}>
                    ±{m} min
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="bf-step">BTR step</label>
              <select
                id="bf-step"
                className="field"
                value={value.stepSeconds}
                onChange={(e) => set({ stepSeconds: Number(e.target.value) })}
              >
                <option value={60}>1 minute</option>
                <option value={30}>30 seconds</option>
                <option value={15}>15 seconds</option>
                <option value={12}>12 seconds (≈ ⅓ amsha)</option>
                <option value={4}>4 seconds (≈ 1′ of arc)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-gold-400 disabled:opacity-50"
              >
                {loading ? 'Calculating…' : 'Cast Chart'}
              </button>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-slate-500">
            {value.rangeMinutes && value.stepSeconds
              ? `${Math.floor((value.rangeMinutes * 120) / value.stepSeconds) + 1} charts will be precomputed for the slider.`
              : ''}
          </p>

          {error && (
            <div className="mt-3 rounded-md border border-flame-400/40 bg-flame-400/10 px-3 py-2 text-[12px] text-flame-400">
              <strong>{error.error}</strong>
              {error.detail && <div className="mt-0.5 text-slate-300">{error.detail}</div>}
            </div>
          )}
        </form>
      )}
    </section>
  );
}
