import { seraphRed, seraphBlue, showSeraphs, hideSeraphs } from '../shaders/seraphs.js';
import { renderer } from '../main.js';
import { state } from '../state.js';
import { fadeOutRSong, stopAllMusic, stopTurbulence, playRiser, playTurbulence } from '../audio.js';

/* ═══════════════════════════════════════════
   CHOICE SEQUENCE
═══════════════════════════════════════════ */
function showChoice() {
  state.phase = 'choice';
  state.scrollLocked = true;
  document.getElementById('scroll-driver').classList.remove('active');
  fadeOutRSong();

  setTimeout(() => {
    document.getElementById('text-block').innerHTML = '';
    const overlay = document.getElementById('choice-overlay');
    overlay.classList.add('active');
    const q    = document.getElementById('choice-question');
    const btns = document.getElementById('choice-buttons');
    q.textContent = '"Albion, knowing all of that awaits you — do you still want to enter earth?"';
    setTimeout(() => { q.classList.add('visible'); }, 100);
    setTimeout(() => { btns.classList.add('visible'); }, 600);
  }, 800);
}

document.getElementById('btn-no').addEventListener('click', triggerNoEnding);
document.getElementById('btn-yes').addEventListener('click', triggerYesEnding);

/* ═══════════════════════════════════════════
   SHARED TITLE CARD
═══════════════════════════════════════════ */
function showTitleCard(autoReturnMs = 0) {
  const tc = document.getElementById('title-card');
  tc.classList.add('active');
  setTimeout(() => tc.classList.add('visible'), 100);

  const returnBtn = document.getElementById('title-return-btn');
  if (returnBtn) {
    returnBtn.addEventListener('click', returnToBegin, { once: true });
  }

  if (autoReturnMs > 0) {
    setTimeout(returnToBegin, autoReturnMs);
  }
}

function returnToBegin() {
  stopAllMusic();
  stopTurbulence();
  const tc = document.getElementById('title-card');
  tc.classList.remove('visible');
  setTimeout(() => {
    tc.classList.remove('active');
    location.reload();
  }, 1500);
}

/* ═══════════════════════════════════════════
   NO ENDING
   — No music
   — Seraphs speak then hide
   — Scene fades to black over 10s
   — Title card appears with 30s auto-return
═══════════════════════════════════════════ */
function triggerNoEnding() {
  document.getElementById('choice-overlay').classList.remove('active');
  state.phase = 'no-ending';
  stopAllMusic();

  const noEnd = document.getElementById('no-ending');
  noEnd.classList.add('active');
  const text = document.getElementById('no-seraph-text');

  hideSeraphs();

  text.innerHTML = 'Enjoy it out here.';
  setTimeout(() => { text.style.opacity = '1'; }, 500);

  // Hide text after 4s
  setTimeout(() => {
    seraphRed.hide();
    seraphBlue.hide();
    text.style.transition = 'opacity 2s';
    text.style.opacity    = '0';
  }, 4000);

  // Fade scene to black over 10s
  const fadeEl = document.getElementById('scene-fade');
  let opacity  = 0;
  const STEPS  = 100;
  const STEP_MS = 10000 / STEPS;  // 100ms per step × 100 steps = 10s

  const noFadeTimer = setInterval(() => {
  opacity += 1 / STEPS;
  fadeEl.style.opacity = Math.min(opacity, 1).toFixed(3);
  if (opacity >= 1) {
    clearInterval(noFadeTimer);
    setTimeout(() => {
      // Clear the black fade overlay so title card is visible
      fadeEl.style.transition = 'opacity 1s ease';
      fadeEl.style.opacity    = '0';
      setTimeout(() => showTitleCard(30000), 1000);
    }, 500);
  }
}, STEP_MS);
}

/* ═══════════════════════════════════════════
   YES ENDING — WARP + TEAR + CHROMATIC COLLAPSE
   — Riser plays immediately
   — Turbulence plays 1s later
   — When turbulence track ends naturally → returnToBegin()
   — Title card also has manual return button
═══════════════════════════════════════════ */
function triggerYesEnding() {
  hideSeraphs();
  document.getElementById('choice-overlay').classList.remove('active');
  state.phase = 'yes-ending';

  // Riser fires immediately, turbulence follows 1s later
  // When turbulence ends naturally, trigger returnToBegin
  playRiser();
  setTimeout(() => {
    playTurbulence(() => {
      // Track ended naturally — return to begin after brief pause
      setTimeout(returnToBegin, 2000);
    });
  }, 1000);

  const overlay = document.getElementById('supernova-overlay');
  overlay.classList.add('active');

  const canvas = document.getElementById('supernova-canvas');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const threeCanvas = renderer.domElement;

  // ── Warp streaks ──────────────────────────────────────────────────────────
  const streaks = Array.from({length: 320}, () => ({
    angle:  Math.random() * Math.PI * 2,
    dist:   80 + Math.random() * 300,
    speed:  0.8 + Math.random() * 2.2,
    len:    4 + Math.random() * 18,
    bright: 0.4 + Math.random() * 0.6,
    hue:    Math.random() < 0.7 ? 'white' : (Math.random()<0.5 ? '#aaddff' : '#ffeebb'),
  }));

  let warpStart = null;

  function drawFrame(ts) {
    if (!warpStart) warpStart = ts;
    const t = (ts - warpStart) / 1000;

    ctx.clearRect(0, 0, W, H);

    // ── Phase 2: vertical crack ───────────────────────────────────────────
    if (t >= 2.5 && t < 5.5) {
      const tearT = Math.min((t-2.5)/1.5, 1.0);

      if (t < 3.0) {
        const dotR = (t-2.5)*8;
        ctx.save(); ctx.globalAlpha=0.9;
        ctx.fillStyle='#fff'; ctx.shadowBlur=20; ctx.shadowColor='#aaddff';
        ctx.beginPath(); ctx.arc(cx,cy,dotR,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }

      const crackH = tearT * (H/2);
      ctx.save();
      const cg = ctx.createLinearGradient(0,cy-crackH,0,cy+crackH);
      cg.addColorStop(0,   'rgba(180,220,255,0)');
      cg.addColorStop(0.1, 'rgba(200,230,255,0.9)');
      cg.addColorStop(0.5, 'rgba(255,255,255,1)');
      cg.addColorStop(0.9, 'rgba(200,230,255,0.9)');
      cg.addColorStop(1,   'rgba(180,220,255,0)');
      ctx.globalAlpha = tearT;
      ctx.strokeStyle = cg;
      ctx.lineWidth   = 1 + tearT*2;
      ctx.shadowBlur  = 18*tearT; ctx.shadowColor='#88aaff';
      ctx.beginPath(); ctx.moveTo(cx, cy-crackH); ctx.lineTo(cx, cy+crackH); ctx.stroke();
      ctx.restore();

      [-1,1].forEach(side => {
        const fw = tearT*60;
        const fg = ctx.createLinearGradient(cx,0,cx+side*fw,0);
        fg.addColorStop(0, side<0?'rgba(255,60,60,0.12)':'rgba(60,100,255,0.12)');
        fg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save(); ctx.globalAlpha=tearT*0.6; ctx.fillStyle=fg;
        ctx.fillRect(side<0?cx-fw:cx, 0, fw, H);
        ctx.restore();
      });
    }

    // ── Phase 3: tears expand to devour screen ────────────────────────────
    if (t >= 4.0) {
      const caT     = Math.min((t-4.0)/1.0, 1.0);
      const expandT = t >= 5.0 ? Math.min((t-5.0)/1.5, 1.0) : 0;

      const shift = caT * 28;
      if (shift > 0.5) {
        try {
          ctx.save(); ctx.globalCompositeOperation='screen'; ctx.globalAlpha=0.55;
          ctx.drawImage(threeCanvas, -shift, 0, W, H); ctx.restore();
          ctx.save(); ctx.globalCompositeOperation='screen'; ctx.globalAlpha=0.55;
          ctx.drawImage(threeCanvas,  shift, 0, W, H); ctx.restore();
          ctx.save(); ctx.globalCompositeOperation='screen'; ctx.globalAlpha=0.45;
          ctx.drawImage(threeCanvas, 0, 0, W, H); ctx.restore();
        } catch(e){}
      }

      if (t < 6.5) {
        const vw = 2 + caT*3;
        ctx.save();
        const vg = ctx.createLinearGradient(0,0,0,H);
        vg.addColorStop(0,   'rgba(180,220,255,0)');
        vg.addColorStop(0.15,'rgba(255,255,255,0.9)');
        vg.addColorStop(0.5, 'rgba(255,255,255,1)');
        vg.addColorStop(0.85,'rgba(255,255,255,0.9)');
        vg.addColorStop(1,   'rgba(180,220,255,0)');
        ctx.globalAlpha = Math.min(caT*1.5, 1.0);
        ctx.strokeStyle = vg; ctx.lineWidth=vw;
        ctx.shadowBlur=24; ctx.shadowColor='#fff';
        ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(cx,H); ctx.stroke();
        ctx.restore();
      }

      const hWing = expandT * (W/2 + 40);
      if (hWing > 2) {
        ctx.save();
        ctx.globalAlpha = Math.min(expandT * 1.4, 1.0);
        const hg = ctx.createLinearGradient(cx-hWing,cy,cx+hWing,cy);
        hg.addColorStop(0,    'rgba(60,80,255,0)');
        hg.addColorStop(0.12, 'rgba(80,60,255,0.8)');
        hg.addColorStop(0.48, 'rgba(255,255,255,1)');
        hg.addColorStop(0.52, 'rgba(255,255,255,1)');
        hg.addColorStop(0.88, 'rgba(255,80,60,0.8)');
        hg.addColorStop(1,    'rgba(255,60,40,0)');
        ctx.strokeStyle=hg; ctx.lineWidth=3+expandT*4;
        ctx.shadowBlur=32; ctx.shadowColor='#fff';
        ctx.beginPath(); ctx.moveTo(cx-hWing,cy); ctx.lineTo(cx+hWing,cy); ctx.stroke();
        ctx.restore();
      }

      if (expandT > 0.5) {
        const fillA = (expandT - 0.5) * 2.0;
        const bandH = fillA * H * 0.3;
        const bandG = ctx.createLinearGradient(0,cy-bandH,0,cy+bandH);
        bandG.addColorStop(0,   'rgba(255,255,255,0)');
        bandG.addColorStop(0.3, `rgba(255,255,255,${fillA*0.4})`);
        bandG.addColorStop(0.5, `rgba(255,255,255,${fillA*0.7})`);
        bandG.addColorStop(0.7, `rgba(255,255,255,${fillA*0.4})`);
        bandG.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.save(); ctx.fillStyle=bandG;
        ctx.fillRect(0, cy-bandH, W, bandH*2);
        ctx.restore();
      }
    }

    // ── Phase 4: RUMBLE + WHITE WASH ─────────────────────────────────────
    if (t >= 6.5) {
      const rumbleT = Math.min((t - 6.5) / 2.0, 1.0);
      ctx.fillStyle = `rgba(255,255,255,${rumbleT * 0.92})`;
      ctx.fillRect(0, 0, W, H);
      const shakeX = (Math.random() * 2 - 1) * rumbleT * 18;
      const shakeY = (Math.random() * 2 - 1) * rumbleT * 18;
      ctx.save();
      ctx.translate(shakeX, shakeY);
      const resistAlpha = (1 - rumbleT) * 0.4 * (0.5 + 0.5 * Math.sin(t * 22));
      ctx.fillStyle = `rgba(0,0,0,${resistAlpha})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // ── Phase 5: CUT TO BLACK ─────────────────────────────────────────────
    if (t >= 8.5) {
      const blackT = Math.min((t-8.5)/1.0, 1.0);
      ctx.fillStyle = `rgba(0,0,0,${blackT})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Text chromatic aberration
    const textBlock = document.getElementById('text-block');
    if (textBlock && t >= 4.0 && t < 8.5) {
      const caT    = Math.min((t-4.0)/1.0, 1.0);
      const offset = Math.round(caT * 14);
      textBlock.style.textShadow = offset > 0
        ? `${-offset}px 0 0 rgba(255,40,40,0.7), ${offset}px 0 0 rgba(40,80,255,0.7)`
        : '';
    } else if (textBlock) {
      textBlock.style.textShadow = '';
    }

    if (t < 9.5) {
      requestAnimationFrame(drawFrame);
    } else {
      if (textBlock) textBlock.style.textShadow = '';
      // Show title card — button-only return (track end handles time-based)
      showTitleCard(0);
    }
  }

  requestAnimationFrame(drawFrame);
}

export { showChoice, triggerNoEnding, triggerYesEnding, showTitleCard };
