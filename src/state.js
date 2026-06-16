// ── Shared application state ──
// All modules that need to read or write phase/section/scroll import from here.
// This avoids circular dependencies and makes state changes traceable.
//
// phase values:
//   'narrative' | 'spring' | 'earth' | 'choice' | 'no-ending' | 'yes-ending'
//
// To change a value from any module:
//   import { state } from '../state.js';
//   state.phase = 'spring';

export const state = {
  phase:          'narrative',
  currentSection: 0,
  currentLine:    0,
  scrollLocked:   false,
  hasScrolled:    false,
  scrollAccum:    0,
  lastScrollY:    0,
  lastScrollHandled: 0,
  backdropRevealed: false,
  seraphsShown: false,
};

