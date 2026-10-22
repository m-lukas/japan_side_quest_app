'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { JAPAN_PATHS } from './japan-outline';
function project(latitude, longitude) {
  return { x: 28 + (longitude - 122) / 24 * 440, y: 452 - (latitude - 24) / 22 * 424 };
}
export default function JapanMap({ pins = [], onPin }) {
  const patternId = useId();
  const [selectedId, setSelectedId] = useState(null);
  const mapRef = useRef(null);
  const shellRef = useRef(null);
  const markerRefs = useRef(new Map());
  function clearSelection() {
    const marker = markerRefs.current.get(selectedId);
    if (marker && document.activeElement === marker) marker.blur();
    setSelectedId(null);
    onPin?.(null);
  }
  useEffect(() => {
    if (selectedId === null) return;
    function dismiss(event) {
      const control = event.target?.closest?.('[data-quest-map-control]');
      if (control && shellRef.current?.contains(control)) return;
      clearSelection();
    }
    function escape(event) {
      if (event.key === 'Escape') clearSelection();
    }
    document.addEventListener('pointerdown', dismiss, true);
    document.addEventListener('focusin', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss, true);
      document.removeEventListener('focusin', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [selectedId, onPin]);
  function selectPin(pin, fromList = false) {
    if (selectedId === pin.id) {
      clearSelection();
      return;
    }
    const previous = markerRefs.current.get(selectedId);
    if (previous && document.activeElement === previous) previous.blur();
    setSelectedId(pin.id);
    onPin?.(pin);
    if (fromList) {
      const map = mapRef.current;
      if (map) {
        const bounds = map.getBoundingClientRect();
        if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
          map.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      }
    }
  }
  const visible = pins.filter(p => p.location.longitude >= 122 && p.location.longitude <= 146 && p.location.latitude >= 24 && p.location.latitude <= 46);
  return <div ref={shellRef} className="map-shell">
    <svg ref={mapRef} className="japan-map" viewBox="0 0 500 480" role="group" aria-label="Japan mit erledigten Quests">
      <defs><pattern id={patternId} width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".7" fill="currentColor" opacity=".25"/></pattern></defs>
      <rect x="4" y="4" width="492" height="472" rx="24" fill={`url(#${patternId})`}/>
      <g className="map-grid"><path d="M28 112H468 M28 208H468 M28 304H468 M28 400H468 M126 20V460 M250 20V460 M374 20V460"/></g>
      <g className="map-land" aria-hidden="true">{JAPAN_PATHS.map((d,i) => <path key={i} d={d}/>)}</g>
      {[...visible.filter(pin => pin.id !== selectedId), ...visible.filter(pin => pin.id === selectedId)].map(pin => {
        const p = project(pin.location.latitude,pin.location.longitude);
        const selected = pin.id === selectedId;
        return <g key={pin.id} ref={node => { if (node) markerRefs.current.set(pin.id, node); else markerRefs.current.delete(pin.id); }} className="map-pin" data-quest-map-control="marker" transform={`translate(${p.x} ${p.y})`} tabIndex={0} role="button" aria-pressed={selected} aria-label={`${pin.title}, ${pin.points} Punkte`} onClick={() => selectPin(pin)} onKeyDown={e => { if (['Enter',' '].includes(e.key)) { e.preventDefault(); selectPin(pin); } }}>
          {selected && <g aria-hidden="true" pointerEvents="none">
            <circle r="15" fill="var(--violet-500)" fillOpacity=".18" stroke="none"/>
            <circle r="11" fill="none" stroke="var(--violet-500)" strokeWidth="2.5"/>
          </g>}
          <circle className="map-pin-hit" r="16"/>
          <circle className="map-pin-dot" r={selected ? 6 : 5}/>
          <title>{pin.title}</title>
        </g>;
      })}
    </svg><div className="map-key"><span className="map-key-dot"/>Erledigte Quest</div>
    {pins.length > visible.length && <p className="empty-note">{pins.length - visible.length} gespeicherte Orte liegen außerhalb dieses Kartenausschnitts.</p>}
    {visible.length > 0 && <details className="map-list"><summary>Alle Orte als Liste</summary><ul>{visible.map(pin => <li key={pin.id}><button type="button" data-quest-map-control="list" className="button secondary" aria-pressed={pin.id === selectedId} onClick={() => selectPin(pin, true)}>{pin.title}</button></li>)}</ul></details>}
  </div>;
}
