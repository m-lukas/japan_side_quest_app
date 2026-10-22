const STATUSES = new Set(['available', 'active', 'completed', 'replaced']);
export function assertGameState(state) {
  if (!state || typeof state !== 'object' || !Array.isArray(state.challenges)) throw new Error('Gist: challenges muss ein Array sein.');
  if (!Array.isArray(state.activity)) state.activity = [];
  state.settings = { activeSlots: 5, playerName: 'Daniel', ...state.settings };
  const ids = new Set();
  for (const c of state.challenges) {
    if (typeof c.id !== 'string' || !c.id || typeof c.title !== 'string' || typeof c.description !== 'string') throw new Error('Gist: Challenge ohne gültige id, title oder description.');
    if (ids.has(c.id)) throw new Error(`Gist: doppelte Challenge-ID ${c.id}.`);
    ids.add(c.id);
    if (!STATUSES.has(c.status) || !Number.isFinite(c.points) || c.points < 0) throw new Error(`Gist: ungültiger Status oder Punkte bei ${c.id}.`);
  }
  if (state.challenges.filter(c => c.status === 'active').length > 5) throw new Error('Gist: mehr als fünf aktive Quests. Bitte überschüssige Karten auf available setzen.');
  return state;
}
export function cleanChallenge(c) {
  return { id: c.id, title: c.title, description: c.description, points: c.points, status: c.status, activatedAt: c.activatedAt || null };
}
export function searchChallenges(state, query) {
  const q = query.trim().toLocaleLowerCase('de-DE').slice(0, 100);
  if (q.length < 2) return { results: [], total: 0 };
  const results = state.challenges.filter(c => c.status !== 'completed' &&
    [c.title, c.description, ...(c.tags || [])].some(text => text.toLocaleLowerCase('de-DE').includes(q)));
  return { results: results.slice(0, 30).map(cleanChallenge), total: results.length };
}
export function publicDanielState(state) {
  const completed = state.challenges.filter(c => c.status === 'completed');
  const located = c => c.completion?.location && Number.isFinite(c.completion.location.latitude) && Number.isFinite(c.completion.location.longitude);
  const active = state.challenges.filter(c => c.status === 'active').sort((a,b) => (a.activatedAt || '').localeCompare(b.activatedAt || ''));
  return {
    meta: { title: state.meta?.title || 'Japan Side Quest', playerName: state.settings.playerName || 'Daniel' },
    active: active.map(cleanChallenge),
    mapPins: completed.filter(located).map(c => ({ id: c.id, title: c.title, points: c.completion?.points ?? c.points, completedAt: c.completedAt, location: c.completion.location })),
    completedWithoutLocation: completed.filter(c => !located(c)).map(c => ({ id: c.id, title: c.title, points: c.completion?.points ?? c.points, completedAt: c.completedAt })),
    totals: { completedPoints: completed.reduce((sum,c) => sum + (c.completion?.points ?? c.points), 0), allPoints: state.challenges.reduce((sum,c) => sum + c.points, 0), completedCount: completed.length, totalCount: state.challenges.length, remainingAvailable: state.challenges.filter(c => c.status === 'available').length },
  };
}
export function adminState(state) {
  return { ...publicDanielState(state), activeSlots: 5, challenges: state.challenges.map(c => ({ ...c })), activity: [...state.activity].slice(-100).reverse() };
}
