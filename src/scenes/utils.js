// ── Shared utility functions ──
// hideScrollIndicator() — fades and disables the scroll prompt permanently
// hideStarCanvas()      — hides mid/fg star layers during spring demo
// showStarCanvas()      — restores mid/fg star layers after spring demo
// clearNarrativeText()  — fades out text block, clears it, calls callback

import { midLayer, fgLayer, milkyWay } from '../shaders/stars.js';
import { seraphRed, seraphBlue } from '../shaders/seraphs.js';

function hideScrollIndicator() {
  const el = document.getElementById('scroll-indicator');
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
}

function hideStarCanvas() {
  // Only hide mid and fg star layers — keep bg stars faintly visible behind tunnel
  midLayer.points.visible = false;
  fgLayer.points.visible  = false;
  milkyWay.visible        = false;
  seraphRed.hide();   // instead of = false
  seraphBlue.hide();
}

function showStarCanvas() {
  midLayer.points.visible = true;
  fgLayer.points.visible  = true;
  milkyWay.visible        = true;
  // Seraphs restored separately by updateSeraphs/show and hide seraphs functions
}

function clearNarrativeText(cb) {
  const tb = document.getElementById('text-block');
  tb.style.transition = 'opacity 0.6s ease';
  tb.style.opacity = '0';
  setTimeout(() => {
    tb.innerHTML = '';
    tb.style.opacity = '1';
    tb.style.transition = '';
    if (cb) cb();
  }, 650);
}

export { hideScrollIndicator, hideStarCanvas, showStarCanvas, clearNarrativeText };
