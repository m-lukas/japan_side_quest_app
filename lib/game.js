import { randomInt, randomUUID } from 'node:crypto';
import { assertGameState } from './schema';

export const PROMOTED_SLOTS = 5;
export class GameError extends Error {}
function event(type, challengeId, extra = {}) {
  return { id: `evt_${randomUUID()}`, type, challengeId, at: new Date().toISOString(), ...extra };
}

// Existing active cards keep their order. Newly drawn cards are appended on promotion.
export function promoted(state) {
  return state.challenges.filter(c => c.status === 'active').sort((a, b) =>
    (a.activatedAt || '').localeCompare(b.activatedAt || '') || state.challenges.indexOf(a) - state.challenges.indexOf(b));
}
export function refillActive(state) {
  state.settings.activeSlots = PROMOTED_SLOTS;
  let drawn = 0;
  while (promoted(state).length < PROMOTED_SLOTS) {
    const choices = state.challenges.filter(c => c.status === 'available');
    if (!choices.length) break;
    const next = choices[randomInt(choices.length)];
    next.status = 'active';
    next.activatedAt = new Date().toISOString();
    state.activity.push(event('activated', next.id));
    drawn += 1;
  }
  return drawn;
}
export function needsPromotion(state) {
  return state.settings.activeSlots !== PROMOTED_SLOTS ||
    (promoted(state).length < PROMOTED_SLOTS && state.challenges.some(c => c.status === 'available'));
}
export function complete(state, challengeId, location) {
  assertGameState(state);
  const c = state.challenges.find(c => c.id === challengeId);
  if (!c) throw new GameError('Diese Quest existiert nicht mehr. Bitte aktualisieren.');
  // Safe retry after a lost response: never award the same quest twice.
  if (c.status === 'completed') return c;
  const wasPromoted = c.status === 'active';
  c.status = 'completed';
  c.completedAt = new Date().toISOString();
  c.completion = { location: normalizeLocation(location), points: c.points, source: wasPromoted ? 'promoted' : 'search' };
  state.activity.push(event('completed', c.id, { location: c.completion.location, source: c.completion.source }));
  // A search completion does NOT replace or reshuffle the promoted hand.
  if (wasPromoted) refillActive(state);
  return c;
}
export function replace(state, challengeId) {
  assertGameState(state);
  const c = state.challenges.find(c => c.id === challengeId);
  if (c?.status === 'replaced') return c;
  if (!c || c.status !== 'active') throw new GameError('Diese Quest ist nicht mehr vorgeschlagen. Bitte aktualisieren.');
  // Avoid drawing the exact same quest; the discarded card remains searchable.
  c.status = 'replaced'; c.replacedAt = new Date().toISOString();
  state.activity.push(event('replaced', c.id));
  refillActive(state);
  return c;
}
export function normalizeLocation(value) {
  if (!value || typeof value.latitude !== 'number' || typeof value.longitude !== 'number') return null;
  const { latitude, longitude, accuracyMeters } = value;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude: +latitude.toFixed(5), longitude: +longitude.toFixed(5), accuracyMeters: Number.isFinite(accuracyMeters) && accuracyMeters >= 0 ? Math.round(accuracyMeters) : null };
}
