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
export function refillActive(state, excludeId = null) {
  state.settings.activeSlots = PROMOTED_SLOTS;
  // One-time recovery for cards discarded by earlier versions. Keep all progress.
  for (const c of state.challenges) {
    if (c.status === 'replaced') c.status = 'available';
  }
  let drawn = 0;
  while (promoted(state).length < PROMOTED_SLOTS) {
    const pool = state.challenges.filter(c => c.status === 'available');
    if (!pool.length) break;
    const alternatives = pool.filter(c => c.id !== excludeId);
    // Prefer a different card, but never leave a slot empty if a card remains.
    const choices = alternatives.length ? alternatives : pool;
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
    state.challenges.some(c => c.status === 'replaced') ||
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
  // A retry for an already returned card must not swap another slot.
  if (c && ['available', 'replaced'].includes(c.status) && c.replacedAt) {
    refillActive(state);
    return c;
  }
  if (!c || c.status !== 'active') throw new GameError('Diese Quest ist nicht mehr vorgeschlagen. Bitte aktualisieren.');
  refillActive(state);
  // With five (or fewer) unfinished cards, all are already in the hand.
  // Keep this card rather than shrinking the hand or inventing a replacement.
  if (!state.challenges.some(other => other.status === 'available')) return c;
  c.status = 'available';
  c.replacedAt = new Date().toISOString();
  delete c.activatedAt;
  state.activity.push(event('replaced', c.id));
  refillActive(state, c.id);
  return c;
}
export function normalizeLocation(value) {
  if (!value || typeof value.latitude !== 'number' || typeof value.longitude !== 'number') return null;
  const { latitude, longitude, accuracyMeters } = value;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude: +latitude.toFixed(5), longitude: +longitude.toFixed(5), accuracyMeters: Number.isFinite(accuracyMeters) && accuracyMeters >= 0 ? Math.round(accuracyMeters) : null };
}
