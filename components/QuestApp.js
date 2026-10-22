'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import JapanMap from './JapanMap';
import { Icon, Capsule, Backdrop } from './GameArt';

const STATUS = { active: 'Vorgeschlagen', available: 'Im Stapel', completed: 'Erledigt', replaced: 'Getauscht' };
const date = value => value ? new Date(value).toLocaleDateString('de-DE', { timeZone: 'Asia/Tokyo' }) : '';
const titleCase = title => title?.trim().toLowerCase() === 'japan side quest' ? 'Japan Side Quest' : title;
async function request(url, options) {
  const response = await fetch(url, { cache: 'no-store', ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Die Anfrage ist fehlgeschlagen (${response.status}).`);
  return body;
}

function Confetti() {
  return <div className="confetti-burst" aria-hidden="true">{Array.from({ length: 42 }, (_, i) => <i key={i} style={{ left: `${i * 37 % 100}%`, '--delay': `${i % 7 * 55}ms`, '--confetti-color': ['#b689ff','#ffcc69','#65dcc5','#ff8fa9'][i % 4] }}/>)}</div>;
}
function Score({ totals }) {
  const percent = totals.allPoints ? Math.min(100, totals.completedPoints / totals.allPoints * 100) : 0;
  return <section className="score-panel" aria-label="Dein Punktestand">
    <Capsule points={totals.completedPoints}/>
    <div className="score-content"><span className="score-label">Deine Punkte</span><div className="score-value">{totals.completedPoints}<span> / {totals.allPoints}</span></div><div className="score-track"><i style={{width: `${percent}%`}}/></div><small>{totals.completedCount} von {totals.totalCount} Quests erledigt</small></div>
  </section>;
}
function QuestCard({ quest, onComplete, onReplace, disabled, compact = false }) {
  return <article className={`challenge-card ${compact ? 'search-card' : ''}`}>
    <header className="challenge-heading"><Capsule points={quest.points}/><div><span className="quest-label">{compact ? quest.status === 'active' ? 'Bereits vorgeschlagen' : 'Passt gerade' : 'Deine nächste Quest'}</span><h2>{quest.title}</h2></div></header>
    <div className="challenge-body"><p>{quest.description}</p><div className="card-actions"><button className="button primary" disabled={disabled} onClick={() => onComplete(quest)}><Icon name="check" size={18}/>Erledigt</button>{!compact && <button className="button secondary" disabled={disabled} onClick={() => onReplace(quest)}><Icon name="swap" size={18}/>Tauschen</button>}</div></div>
  </article>;
}

function QuestSearch({ token, revision, disabled, onComplete }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState({ results: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (query.trim().length < 2) { setResult({ results: [], total: 0 }); setLoading(false); setError(''); return; }
    const controller = new AbortController();
    setLoading(true); setError(''); setResult({ results: [], total: 0 });
    const timer = setTimeout(async () => {
      try {
        const data = await request(`/api/search?t=${encodeURIComponent(token)}&q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        if (!controller.signal.aborted) setResult(data);
      } catch (e) { if (!controller.signal.aborted) setError(e.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, token, revision]);
  return <section className="search-section" aria-labelledby="search-title">
    <div className="section-title"><Icon name="search"/><div><h2 id="search-title">Der Moment hat andere Pläne?</h2><p>Finde eine passende Quest. Deine fünf Vorschläge bleiben dabei erhalten.</p></div></div>
    <div className="search-field"><Icon name="search"/><label className="sr-only" htmlFor="quest-search">Andere Quests suchen</label><input id="quest-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Zum Beispiel Essen, Kamera oder Natur" autoComplete="off" maxLength={100}/>{query && <button className="icon-button" onClick={() => setQuery('')} aria-label="Suche leeren"><Icon name="close" size={18}/></button>}</div>
    <div className="search-status" role="status">{loading ? 'Quests werden gesucht ...' : error || (query.trim().length < 2 ? 'Suche ab zwei Zeichen. Auch getauschte Karten sind hier wieder auffindbar.' : result.total ? `${result.total} passende Quests${result.total > 30 ? ', die ersten 30 werden angezeigt' : ''}` : 'Keine offenen Quests gefunden. Versuch ein anderes Wort.')}</div>
    {result.results.length > 0 && <div className="search-results">{result.results.map(q => <QuestCard key={q.id} quest={q} onComplete={onComplete} disabled={disabled} compact/>)}</div>}
  </section>;
}

function CompletionModal({ action, onClose, onConfirm, saving, error }) {
  const dialog = useRef(null);
  const closeButton = useRef(null);
  const [location, setLocation] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle');
  const [geoMessage, setGeoMessage] = useState('');
  const cancelled = useRef(false);
  const completing = action.type === 'complete';
  useEffect(() => {
    cancelled.current = false;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; closeButton.current?.focus();
    const trap = e => {
      if (e.key !== 'Tab') return;
      const controls = [...dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')];
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { cancelled.current = true; document.body.style.overflow = overflow; document.removeEventListener('keydown', trap); previous?.focus(); };
  }, []);
  // The location request starts only after Daniel sees the consent explanation.
  const locate = () => {
    if (!navigator.geolocation) { setGeoStatus('failed'); setGeoMessage('Dieser Browser unterstützt keinen Standort. Du kannst ohne GPS abschließen.'); return; }
    setGeoStatus('loading'); setGeoMessage('Standort wird gesucht ...');
    navigator.geolocation.getCurrentPosition(p => {
      if (cancelled.current) return;
      setLocation({latitude:p.coords.latitude, longitude:p.coords.longitude, accuracyMeters:p.coords.accuracy});
      setGeoStatus('ready'); setGeoMessage(`Standort bereit. Genauigkeit ungefähr ${Math.round(p.coords.accuracy)} m.`);
    }, () => { if (!cancelled.current) { setGeoStatus('failed'); setGeoMessage('Kein Standort verfügbar. Du kannst ohne GPS abschließen.'); } }, { enableHighAccuracy:true, timeout:10000, maximumAge:60000 });
  };
  return <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && !saving && onClose()} onKeyDown={e => e.key === 'Escape' && !saving && onClose()}>
    <section ref={dialog} className="modal" role="dialog" aria-modal="true" aria-labelledby="action-title">
      <button ref={closeButton} className="icon-button modal-close" onClick={onClose} disabled={saving} aria-label="Schließen"><Icon name="close"/></button>
      <div className="modal-top"><Capsule points={action.quest.points}/><span>{completing ? 'Eine Geschichte mehr' : 'Neue Karte, neues Glück'}</span></div>
      <h2 id="action-title">{completing ? 'Quest geschafft?' : 'Diese Quest tauschen?'}</h2><h3>{action.quest.title}</h3>
      <p>{completing ? `Du sammelst ${action.quest.points} Punkte. Für deine Karte kannst du den Ort dieses Moments speichern.` : 'Diese Karte verlässt deine Vorschläge. Wenn der Stapel noch Karten enthält, kommt eine neue dazu. Über die Suche kannst du diese Quest später wiederfinden.'}</p>
      {completing && <div className="location-choice"><button className="button secondary" onClick={locate} disabled={saving || geoStatus === 'loading'}><Icon name="location" size={18}/>{geoStatus === 'ready' ? 'Standort aktualisieren' : geoStatus === 'loading' ? 'Suche läuft ...' : 'Standort hinzufügen'}</button><small role="status">{geoMessage || 'Kein Tracking. Nur ein Standort pro erledigter Quest.'}</small></div>}
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="button secondary" disabled={saving} onClick={onClose}>Zurück</button><button className="button primary" disabled={saving} onClick={() => onConfirm(location)}>{saving ? 'Speichern ...' : !completing ? 'Neue Karte ziehen' : location ? 'Erledigt bestätigen' : 'Ohne GPS abschließen'}</button></div>
    </section>
  </div>;
}

function MapView({ data }) {
  const [selected, setSelected] = useState(null);
  return <section className="map-page"><div className="section-title"><Icon name="map"/><div><h2>Deine Erinnerungen auf der Karte</h2><p>{data.mapPins.length} Quests mit Standort</p></div></div><JapanMap pins={data.mapPins} onPin={setSelected}/>{!data.mapPins.length && <p className="empty-note">Noch keine Pins. Erledige eine Quest mit Standort, um deine Karte zu füllen.</p>}{selected && <div className="pin-detail"><Capsule points={selected.points} small/><div><strong>{selected.title}</strong><small>{date(selected.completedAt)}</small></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="Details schließen"><Icon name="close"/></button></div>}{data.completedWithoutLocation.length > 0 && <section className="no-location"><h3>Ohne Standort erledigt</h3><ul>{data.completedWithoutLocation.map(q => <li key={q.id}>{q.title}<span>{q.points} Punkte</span></li>)}</ul></section>}</section>;
}
function Explanation() {
  return <section className="explanation"><div className="explanation-heading"><Icon name="torii" size={44}/><span className="display-font">Kleine Quests. Große Erinnerungen.</span></div><div className="explanation-grid">
    <article><span className="step-number">01</span><h2>Fünf Ideen für unterwegs</h2><p>Deine fünf Karten sind Vorschläge, kein Reiseplan. Sie bleiben gespeichert, auch wenn du den Browser schließt oder das Gerät wechselst.</p></article>
    <article><span className="step-number">02</span><h2>Erledigen oder tauschen</h2><p>Geschafft? Bestätige die Quest und sammle Punkte. Danach füllt eine neue Karte deinen freien Platz. Passt etwas nicht, darfst du es tauschen.</p></article>
    <article><span className="step-number">03</span><h2>Der Moment entscheidet</h2><p>Schon am richtigen Ort für etwas anderes? Such im Katalog und erledige eine passende Quest direkt. Deine Vorschläge ändern sich dabei nicht, außer du erledigst eine dieser fünf Karten.</p></article>
    <article><span className="step-number">04</span><h2>Erinnerungen sammeln</h2><p>Speichere beim Abschluss freiwillig deinen Standort für die Karte. Die Einwegkamera ist für besondere Fotos, nicht als Pflichtbeweis. Achte auf Regeln vor Ort und frag Menschen vor dem Fotografieren.</p></article>
  </div><p className="explanation-note">Jede Quest zählt einmal. Getauschte Karten bleiben über die Suche erreichbar. Ist der Stapel leer, gibt es weniger als fünf Vorschläge. Deine Reise geht trotzdem weiter.</p></section>;
}

function AdminView({ data }) {
  return <main className="admin-page"><div className="admin-stats">{Object.entries(STATUS).map(([key,label]) => <div key={key}><strong>{data.challenges.filter(q => q.status === key).length}</strong><span>{label}</span></div>)}</div>
    <MapView data={data}/>
    {Object.entries(STATUS).map(([status,label]) => <section className="admin-group" key={status}><h2>{label}</h2>{data.challenges.filter(q => q.status === status).map(q => <article className="admin-row" key={q.id}><Capsule points={q.points} small/><div><strong>{q.title}</strong><p>{q.description}</p><small>{q.id}{q.completedAt ? ` / ${date(q.completedAt)}` : ''}{q.completion?.source === 'search' ? ' / über die Suche' : ''}</small></div></article>)}</section>)}
    <section className="activity"><h2>Letzte Aktivität</h2>{data.activity.map(a => <p key={a.id}><span>{a.type === 'completed' ? 'Erledigt' : a.type === 'replaced' ? 'Getauscht' : 'Gezogen'}: {data.challenges.find(q => q.id === a.challengeId)?.title || a.challengeId}</span><time>{date(a.at)}</time></p>)}</section>
  </main>;
}

export default function QuestApp({ token, role }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [theme, setTheme] = useState('light');
  const [tab, setTab] = useState('quests'), [action, setAction] = useState(null), [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false), [celebration, setCelebration] = useState(0), [revision, setRevision] = useState(0), [notice, setNotice] = useState('');
  const busy = useRef(false), requestSequence = useRef(0), noticeTimer = useRef(null);
  const load = useCallback(async () => {
    if (busy.current) return;
    const seq = ++requestSequence.current;
    try { const next = await request(`/api/game?t=${encodeURIComponent(token)}`); if (seq === requestSequence.current && !busy.current) { setData(next); setError(''); } }
    catch(e) { if (seq === requestSequence.current) setError(e.message); }
  }, [token]);
  useEffect(() => { setTheme(document.documentElement.dataset.theme || 'light'); }, []);
  useEffect(() => { load(); const timer = setInterval(load, 90000); const focus = () => document.visibilityState === 'visible' && load(); document.addEventListener('visibilitychange',focus); return () => { ++requestSequence.current; clearInterval(timer); document.removeEventListener('visibilitychange',focus); }; }, [load]);
  useEffect(() => { if (!celebration) return; const timer = setTimeout(() => setCelebration(0),1800); return () => clearTimeout(timer); }, [celebration]);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  const toggleTheme = () => { const next = theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; try { localStorage.setItem('japan-quest-theme',next); } catch {} setTheme(next); };
  const showAction = (type, quest) => { if (busy.current) return; setActionError(''); setAction({type,quest}); };
  const confirmAction = async location => {
    if (busy.current || !action) return;
    busy.current = true; setSaving(true); ++requestSequence.current;
    try {
      const next = await request(`/api/challenge/${action.type}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({token, challengeId:action.quest.id, location}) });
      setData(next); setRevision(r => r + 1); setError(''); setAction(null);
      if (action.type === 'complete') { setCelebration(Date.now()); setNotice(`Geschafft! ${action.quest.points} Punkte gesammelt.`); }
      else setNotice('Deine Vorschläge wurden aktualisiert.');
      clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setNotice(''),5000);
    } catch(e) { setActionError(e.message); } finally { busy.current = false; setSaving(false); }
  };
  return <div className="site-shell"><Backdrop/><div className="app-container">
    <div className="masthead"><div className="brand"><span className="brand-mark"><Icon name="torii" size={26}/></span><span>Japan Quest Log</span></div><button className="icon-button theme-button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'}><Icon name={theme === 'dark' ? 'sun' : 'moon'}/></button></div>
    {error && <div className="error-banner" role="alert"><span>{error}</span><button className="button secondary" onClick={load}>Erneut laden</button></div>}
    {!data && !error && <div className="loading" role="status"><div className="loading-capsule"><Capsule points="?"/></div><h1>Deine Quests werden gezogen ...</h1></div>}
    {data && <><header className="hero"><div className="hero-copy"><p className="eyebrow">{role === 'admin' ? 'Dein Kontrollraum' : `${data.meta.playerName}s Reiseabenteuer`}</p><h1 className="display-font">{titleCase(data.meta.title)}</h1><span className="hero-japanese" lang="ja">旅のクエスト</span></div><Score totals={data.totals}/></header>
      {role === 'admin' ? <AdminView data={data}/> : <><nav className="tabs" aria-label="Ansichten">{[['quests','card','Quests'],['map','map','Karte'],['explanation','help','Erklärung']].map(([id,icon,label]) => <button key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}><Icon name={icon} size={20}/>{label}</button>)}</nav>
        {tab === 'quests' && <main><div className="hand-heading"><div><h2>Für dich gezogen</h2><p>Deine {data.active.length} aktuellen Vorschläge</p></div><span className="hand-count">{data.active.length} / 5</span></div>
          {data.active.length < 5 && <p className="empty-note">{data.active.length ? 'Der Stapel ist fast leer. Deine übrigen Vorschläge bleiben hier.' : 'Alle Karten gezogen! Über die Suche kannst du noch offene, getauschte Quests erledigen.'}</p>}
          <div className="quest-grid">{data.active.map(q => <QuestCard key={q.id} quest={q} onComplete={q => showAction('complete',q)} onReplace={q => showAction('replace',q)} disabled={saving}/>)}</div>
          <QuestSearch token={token} revision={revision} disabled={saving} onComplete={q => showAction('complete',q)}/>
        </main>}
        {tab === 'map' && <MapView data={data}/>}{tab === 'explanation' && <Explanation/>}
      </>}
    </>}
    <footer className="app-footer"><Icon name="bamboo" size={26}/><span>Japan Quest Log</span><Icon name="torii" size={26}/></footer>
  </div>{notice && <div className="toast" role="status"><Icon name="check"/>{notice}</div>}{celebration > 0 && <Confetti key={celebration}/>}{action && <CompletionModal key={`${action.type}-${action.quest.id}`} action={action} saving={saving} error={actionError} onClose={() => !busy.current && setAction(null)} onConfirm={confirmAction}/>}</div>;
}
