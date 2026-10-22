import { assertGameState } from './schema';
import { refillActive, needsPromotion, GameError } from './game';
const API = 'https://api.github.com/gists';
function config() {
  const gistId = process.env.GITHUB_GIST_ID;
  const token = process.env.GITHUB_TOKEN;
  const filename = process.env.GIST_FILENAME || 'japan-side-quest.json';
  if (!gistId || !token) throw new Error('Gist nicht konfiguriert. GITHUB_GIST_ID und GITHUB_TOKEN setzen.');
  return { gistId, token, filename };
}
function headers(token) {
  return { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };
}
export async function readGameState() {
  const { gistId, token, filename } = config();
  const res = await fetch(`${API}/${gistId}`, { headers: headers(token), cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Gist konnte nicht geladen werden (${res.status}).`);
  const gist = await res.json();
  const file = gist.files?.[filename];
  if (file?.truncated) throw new Error('Gist-Datei ist zu groß. Bitte die Aktivitätshistorie archivieren.');
  if (!file?.content) throw new Error(`Datei ${filename} fehlt im Gist.`);
  let state;
  try { state = JSON.parse(file.content); } catch { throw new Error('Gist enthält ungültiges JSON.'); }
  return assertGameState(state);
}
// Serialize writes within a warm instance. Gists offer no cross-instance transactions.
let queue = Promise.resolve();
export function updateGameState(mutator) {
  const work = queue.then(() => update(mutator));
  queue = work.catch(() => {});
  return work;
}
async function update(mutator) {
  const { gistId, token, filename } = config();
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const state = await readGameState();
      const result = await mutator(state);
      state.meta = { ...state.meta, version: Number(state.meta?.version || 0) + 1, updatedAt: new Date().toISOString() };
      const body = { files: { [filename]: { content: JSON.stringify(state, null, 2) + '\n' } } };
      const res = await fetch(`${API}/${gistId}`, { method: 'PATCH', headers: headers(token), body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`Gist konnte nicht gespeichert werden (${res.status}).`);
      return { state, result };
    } catch (err) {
      if (err instanceof GameError) throw err;
      lastError = err;
    }
  }
  throw lastError;
}
// Migrates an existing three-card game once. Reloads thereafter are read-only.
export async function readyGameState() {
  const state = await readGameState();
  if (!needsPromotion(state)) return state;
  return (await updateGameState(s => refillActive(s))).state;
}
