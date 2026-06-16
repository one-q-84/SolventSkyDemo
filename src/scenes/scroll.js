// ── Scroll handling and section progression ──
// onScroll()             — throttled scroll handler, accumulates delta
// advanceLine()          — reveals next line in current section
// checkSectionTrigger()  — at section end: fires spring/earth/choice or advances
//
// Key values:
//   SCROLL_PER_LINE (90) — how many scroll pixels advance one line
//   Throttle interval (80ms) — minimum ms between scroll events processed

import { STORY_SECTIONS } from '../data/story.js';
import { renderNarrativeSection, revealLines, getLinesTotalInSection } from './narrative.js';
import { startSpringDemo } from './spring.js';
import { startEarthSection } from './earth.js';
import { showChoice } from './ending.js';
import { updateSeraphs, showSeraphs, hideSeraphs } from '../shaders/seraphs.js';
import { hideScrollIndicator, clearNarrativeText } from './utils.js';
import { state } from '../state.js';
import { crossfadeToRSong } from '../audio.js';

const SCROLL_PER_LINE = 90;
const scrollDriver = document.getElementById('scroll-driver');

function onScroll() {
  if (state.scrollLocked || state.phase !== 'narrative') return;

  const now = Date.now();
  if (now - state.lastScrollHandled < 80) return;
  state.lastScrollHandled = now;

  if (!state.hasScrolled) {
    state.hasScrolled = true;
    hideScrollIndicator();
  }

  const scrollY = scrollDriver.scrollTop;
  const delta = scrollY - state.lastScrollY;
  state.lastScrollY = scrollY;

  // Reset spacer trick to allow infinite scrolling
  if (scrollY > 400) {
    scrollDriver.scrollTop = 200;
    state.lastScrollY = 200;
  }

  if (delta <= 0) return;

  state.scrollAccum += delta;
  if (state.scrollAccum >= SCROLL_PER_LINE) {
    state.scrollAccum = 0;
    advanceLine();
  }
}

function advanceLine() {
  const section = STORY_SECTIONS[state.currentSection];
  if (!section) return;

  const totalLines = getLinesTotalInSection(state.currentSection);
  state.currentLine++;
  revealLines(state.currentLine);
  
if (
  state.currentSection === 1 &&
  state.currentLine    === 1 &&  
  !state.seraphsShown
) {
  state.seraphsShown = true;
  showSeraphs();
}

  // Fade in the space backdrop when line index 1 (second line) is first revealed
if (state.currentSection === 0 && state.currentLine === 1 && !state.backdropRevealed) {
  state.backdropRevealed = true;
  document.querySelector('#canvas-container canvas').style.opacity = '1';
}

  if (state.currentLine >= totalLines) {
    checkSectionTrigger();
  }
}

function checkSectionTrigger() {
  const section = STORY_SECTIONS[state.currentSection];

  if (section.trigger === 'spring') {
    state.scrollLocked = true;
    scrollDriver.classList.remove('active');
    hideScrollIndicator();
    clearNarrativeText(() => setTimeout(startSpringDemo, 600));
    return;
  }
  if (section.trigger === 'earth') {
    state.scrollLocked = true;
    clearNarrativeText(() => setTimeout(startEarthSection, 600));
    return;
  }
  if (section.trigger === 'choice') {
    clearNarrativeText(() => setTimeout(showChoice, 600));
    return;
  }

 // Advance to next section
  state.currentSection++;
  if (state.currentSection >= STORY_SECTIONS.length) return;
  state.currentLine = 0;
  renderNarrativeSection(state.currentSection);
  revealLines(0);

if (state.currentSection === 0) {
  hideSeraphs();
  }
}

export { onScroll };
