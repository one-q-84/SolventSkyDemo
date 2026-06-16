// ── Narrative text system ──
// renderNarrativeSection(idx) — renders a section's lines into #text-block.
//   Line 0 always starts at full opacity (.revealed class applied immediately).
//   All other lines start at 10% opacity and reveal on scroll.
// revealLines(upToIndex) — adds .revealed to all lines up to index (additive).
// getLinesTotalInSection(idx) — returns total line count including prompt.
//
// Text opacity is controlled entirely via CSS:
//   .story-line          { opacity: 0.10 }   default dim state
//   .story-line.revealed { opacity: 1    }   revealed state (never removed)
//
// Speaker colors via CSS classes: speaker-red, speaker-blue, speaker-self, emphasis

import { STORY_SECTIONS } from '../data/story.js';

/* ═══════════════════════════════════════════
   NARRATIVE TEXT SYSTEM
═══════════════════════════════════════════ */
function renderNarrativeSection(idx) {
  const tb = document.getElementById('text-block');
  tb.innerHTML = '';
  const section = STORY_SECTIONS[idx];
  if (!section) return;

  section.lines.forEach((line, i) => {
    const span = document.createElement('span');
    // Preserve color/style classes, start all at 10% except line 0
    span.className = `story-line ${line.cls || ''}`;
    if (i === 0) span.classList.add('revealed'); // first line always full
    span.textContent = line.text;
    span.dataset.lineIndex = i;
    tb.appendChild(span);
  });

  if (section.prompt) {
    const p = document.createElement('span');
    p.className = 'story-line prompt';
    p.textContent = `↓  ${section.prompt}  ↓`;
    p.dataset.lineIndex = section.lines.length;
    tb.appendChild(p);
  }
}

// Reveal lines up to and including upToIndex — additive, never removes revealed
function revealLines(upToIndex) {
  const lines = document.querySelectorAll('.story-line');
  lines.forEach(line => {
    const i = parseInt(line.dataset.lineIndex);
    if (i <= upToIndex) line.classList.add('revealed');
  });
}

function getLinesTotalInSection(idx) {
  const section = STORY_SECTIONS[idx];
  if (!section) return 0;
  return section.lines.length + (section.prompt ? 1 : 0);
}

export { renderNarrativeSection, revealLines, getLinesTotalInSection };
