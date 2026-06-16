import { ballMesh, pixelatedPass, afterPass, bloomPass, glitchPass,
         dotScreenPass, afterimagePass, hBlurPass } from '../main.js';
import { hideStarCanvas, showStarCanvas } from './utils.js';
import { renderNarrativeSection, revealLines } from './narrative.js';
import { state } from '../state.js';
import { crossfadeToRSong } from '../audio.js';

/* ═══════════════════════════════════════════
   SPRING DEMO SEQUENCE
═══════════════════════════════════════════ */

let _instrTimeouts = [];
let _zUnlocked     = false;
let _currentStage  = -1;   // which instruction stage we're on (-1 = none shown yet)
let _stageActive   = false; // waiting for user to press the current stage's key

// ── Stage definitions ─────────────────────────────────────────────────────────
// Each stage: the key required, the instruction text, the banner key to reveal,
// and what pass to toggle when the key is pressed
const STAGES = [
  { key: 's', text: "PRESS 'S' — ILLUMINATE THE VOID", bannerKey: 'S',
    activate: () => { bloomPass.enabled = !bloomPass.enabled; } },
  { key: 'd', text: "PRESS 'D' — DISSOLVE THE SIGNAL",  bannerKey: 'D',
    activate: () => { dotScreenPass.enabled = !dotScreenPass.enabled; } },
  { key: 'a', text: "PRESS 'A' — LEAVE A TRAIL",        bannerKey: 'A',
    activate: () => { afterimagePass.enabled = !afterimagePass.enabled; } },
  { key: 'f', text: "PRESS 'F' — BLUR THE BOUNDARY",    bannerKey: 'F',
    activate: () => { hBlurPass.enabled = !hBlurPass.enabled; } },
  { key: 'g', text: "PRESS 'G' — BREAK THE FRAME",      bannerKey: 'G',
    activate: () => {
      if (!glitchPass.enabled) {
        glitchPass.enabled = true;
        setTimeout(() => { glitchPass.enabled = false; }, 120);
      }
    }
  },
];

// ── Key → label for banner ────────────────────────────────────────────────────
const KEY_ITEMS = [
  { key: 'S', label: 'ILLUMINATE' },
  { key: 'D', label: 'DISSOLVE'   },
  { key: 'A', label: 'TRAIL'      },
  { key: 'F', label: 'BLUR'       },
  { key: 'G', label: 'BREAK'      },
  { key: 'Z', label: 'EXIT', exit: true },
];

// ── Typewriter ────────────────────────────────────────────────────────────────
function typeWriter(text, el, speed = 45) {
  el.innerHTML = '';
  let i = 0;
  function type() {
    if (i < text.length) { el.innerHTML += text.charAt(i); i++; setTimeout(type, speed); }
  }
  type();
}

// ── Banner ────────────────────────────────────────────────────────────────────
function buildBanner() {
  const banner = document.getElementById('spring-keybanner');
  if (!banner) return;
  banner.innerHTML = '';
  KEY_ITEMS.forEach(({ key, label, exit }) => {
    const item = document.createElement('div');
    item.className = `spring-key-item${exit ? ' spring-key-exit' : ''}`;
    item.id = `spring-key-${key}`;
    item.style.opacity   = '0';
    item.style.transition = 'opacity 0.5s ease';
    item.innerHTML = `<kbd>${key}</kbd><span>${label}</span>`;
    banner.appendChild(item);
  });
  banner.classList.add('visible');
}

function revealBannerKey(key) {
  const el = document.getElementById(`spring-key-${key}`);
  if (el) el.style.opacity = '1';
}

// ── Advance to next stage ─────────────────────────────────────────────────────
function advanceStage() {
  _currentStage++;
  if (_currentStage >= STAGES.length) {
    const instr = document.getElementById('spring-instructions');
    typeWriter("PLAY AMONG THE STARS.", instr);

    const t1 = setTimeout(() => {
      if (instr) instr.innerHTML = '';
      const t2 = setTimeout(() => {
        typeWriter("WHEN READY, PRESS 'Z' TO EXIT", instr);
        revealBannerKey('Z');
        _zUnlocked = true;

        // Clear after 5 seconds
  const t3 = setTimeout(() => {
    if (instr) instr.innerHTML = '';
  }, 5000);
  _instrTimeouts.push(t3);

      }, 20000);
      _instrTimeouts.push(t2);
    }, 2000);

    _instrTimeouts.push(t1);
    _stageActive = false;
    return;
  }

  // Show current stage instruction
  const stage = STAGES[_currentStage];
  const instr = document.getElementById('spring-instructions');
  typeWriter(stage.text, instr);
  revealBannerKey(stage.bannerKey);
  _stageActive = true;
}

// ── Start ─────────────────────────────────────────────────────────────────────
function startSpringDemo() {
  state.phase        = 'spring';
  state.scrollLocked = true;
  _currentStage      = -1;
  _stageActive       = false;
  _zUnlocked         = false;

  ballMesh.visible      = true;
  pixelatedPass.enabled = true;
  afterPass.enabled     = true;
  bloomPass.enabled     = false;

  const overlay = document.getElementById('spring-overlay');
  overlay.style.opacity    = '0';
  overlay.style.transition = 'opacity 5s ease';  // ← adjust this number
  overlay.classList.add('active');

  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    hideStarCanvas();  // ← moved here so stars hide as spring fades in
  }));

  buildBanner();
  _instrTimeouts.forEach(t => clearTimeout(t));
  _instrTimeouts = [];
  const t = setTimeout(() => advanceStage(), 1500);
  _instrTimeouts.push(t);
};

  buildBanner();

  // Clear old timeouts
  _instrTimeouts.forEach(t => clearTimeout(t));
  _instrTimeouts = [];

  // Show first instruction after a short intro delay
  const t = setTimeout(() => advanceStage(), 1500);
  _instrTimeouts.push(t);


// ── End ───────────────────────────────────────────────────────────────────────
function endSpringDemo() {
  _instrTimeouts.forEach(t => clearTimeout(t));
  _instrTimeouts = [];
  _currentStage  = -1;
  _stageActive   = false;
  _zUnlocked     = false;

  const FADE_OUT = 2000;  // ← one number to change for both

  const overlay = document.getElementById('spring-overlay');
  overlay.style.transition = `opacity ${FADE_OUT/1000}s ease`;
  overlay.style.opacity    = '0';

  const banner = document.getElementById('spring-keybanner');
  if (banner) { banner.classList.remove('visible'); banner.innerHTML = ''; }

  setTimeout(() => {
    overlay.classList.remove('active');
    overlay.style.opacity    = '';
    overlay.style.transition = '';

    ballMesh.visible       = false;
    bloomPass.enabled      = false;
    pixelatedPass.enabled  = false;
    afterPass.enabled      = false;
    glitchPass.enabled     = false;
    dotScreenPass.enabled  = false;
    afterimagePass.enabled = false;
    hBlurPass.enabled      = false;

    crossfadeToRSong();

    showStarCanvas();

    state.phase          = 'narrative';
    state.seraphsShown   = false;
    state.scrollLocked   = false;
    state.currentSection = 1;
    state.currentLine    = 0;
    renderNarrativeSection(1);
    revealLines(0);
    document.getElementById('scroll-driver').classList.add('active');
  }, FADE_OUT);  // ← matches transition duration exactly
}

// ── Key handler ───────────────────────────────────────────────────────────────
function handleSpringKeydown(key) {
  if (state.phase !== 'spring') return;

  // Z exit — only if unlocked, handled independently of stages
  if (key === 'z' && _zUnlocked) {
    endSpringDemo();
    return;
  }

  // No stage active yet — ignore all other keys
  if (!_stageActive && _currentStage < STAGES.length - 1) return;

  const stage = STAGES[_currentStage];

  if (_stageActive && stage && key === stage.key) {
    stage.activate();
    _stageActive = false;
    const t = setTimeout(() => advanceStage(), 800);
    _instrTimeouts.push(t);
    return;
  }


  // Allow toggling previously unlocked effects
  if (_currentStage > 0) {
    const unlockedStages = STAGES.slice(0, _currentStage);
    const match = unlockedStages.find(s => s.key === key);
    if (match) match.activate();
  }
}

export { startSpringDemo, endSpringDemo, handleSpringKeydown };