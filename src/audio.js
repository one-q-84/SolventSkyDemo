// ─────────────────────────────────────────────────────────────────────────────
//  audio.js  —  Beneath the Solvent Sky
//  Handles all music, fades, crossfades, and _Tone.js interactions.
//
//  Place at: src/audio.js
//  Put audio files at: public/audio/iFloatAloneCut.mp3
//                      public/audio/RSong.mp3
//                      public/audio/Turbulence.mp3
// ─────────────────────────────────────────────────────────────────────────────

// At top of audio.js:
let _Tone = null;

async function unlockAudio() {
  _Tone = await import('tone');  // ← package name 'tone', stored in _Tone
  await _Tone.start();
}

// ─── Music tracks ─────────────────────────────────────────────────────────────
// Using HTMLAudioElement for music — simpler, better browser support for long files
const _tracks = {
  iFloat:     new Audio('/audio/iFloatAloneCut.mp3'),
  rsong:      new Audio('/audio/RSong.mp3'),
  turbulence: new Audio('/audio/Turbulence.mp3'),
};

_tracks.iFloat.loop     = true;
_tracks.rsong.loop      = true;
_tracks.turbulence.loop = false;

// Start all at zero volume
Object.values(_tracks).forEach(t => { t.volume = 0; });

// ─── Preload ──────────────────────────────────────────────────────────────────
// Call this immediately after user clicks "Begin" (audio context now unlocked)
function preloadAudio() {
  // Priority order: iFloat → RSong → Turbulence
  // Using load() triggers browser to buffer without playing
  _tracks.iFloat.load();
  _tracks.rsong.load();
  _tracks.turbulence.load();
}

// ─── Fade helpers ─────────────────────────────────────────────────────────────
let _fadeIntervals = {};

function _clearFade(key) {
  if (_fadeIntervals[key]) {
    clearInterval(_fadeIntervals[key]);
    delete _fadeIntervals[key];
  }
}

function _fadeTo(track, key, targetVol, durationMs, onComplete) {
  _clearFade(key);
  const startVol  = track.volume;
  const diff      = targetVol - startVol;
  const steps     = 60;
  const stepMs    = durationMs / steps;
  let   step      = 0;

  _fadeIntervals[key] = setInterval(() => {
    step++;
    track.volume = Math.min(1, Math.max(0, startVol + diff * (step / steps)));
    if (step >= steps) {
      track.volume = targetVol;
      _clearFade(key);
      if (onComplete) onComplete();
    }
  }, stepMs);
}

// ─── Music API ────────────────────────────────────────────────────────────────
const TARGET_VOL   = 0.30;
const FADE_IN_MS   = 10000;
const FADE_OUT_MS  = 7000;
const CROSSFADE_MS = 5000;

function playIFloat() {
  if (_tracks.iFloat.paused) {
    _tracks.iFloat.volume = 0;
    _tracks.iFloat.play();
  }
  _fadeTo(_tracks.iFloat, 'iFloat', TARGET_VOL, FADE_IN_MS);
}

function stopIFloat(onComplete) {
  _fadeTo(_tracks.iFloat, 'iFloat', 0, FADE_OUT_MS, () => {
    _tracks.iFloat.pause();
    if (onComplete) onComplete();
  });
}

function playRSong() {
  if (_tracks.rsong.paused) {
    _tracks.rsong.volume = 0;
    _tracks.rsong.play();
  }
  _fadeTo(_tracks.rsong, 'rsong', TARGET_VOL, FADE_IN_MS);
}

function stopRSong(onComplete) {
  _fadeTo(_tracks.rsong, 'rsong', 0, FADE_OUT_MS, () => {
    _tracks.rsong.pause();
    if (onComplete) onComplete();
  });
}

function playTurbulence(onEnded) {
  _tracks.turbulence.volume = TARGET_VOL;
  _tracks.turbulence.play();
  if (onEnded) {
    _tracks.turbulence.addEventListener('ended', onEnded, { once: true });
  }
}

function stopTurbulence() {
  _tracks.turbulence.pause();
  _tracks.turbulence.currentTime = 0;
  _tracks.turbulence.volume = 0;
}

// Crossfade iFloat → RSong (both fades happen simultaneously over CROSSFADE_MS)
function crossfadeToRSong() {
  _fadeTo(_tracks.iFloat, 'iFloat', 0, CROSSFADE_MS, () => {
    _tracks.iFloat.pause();
  });
  if (_tracks.rsong.paused) {
    _tracks.rsong.volume = 0;
    _tracks.rsong.play();
  }
  _fadeTo(_tracks.rsong, 'rsong', TARGET_VOL, CROSSFADE_MS);
}

// Stop everything immediately (used for "No" path)
function stopAllMusic() {
  Object.entries(_tracks).forEach(([key, track]) => {
    _clearFade(key);
    track.pause();
    track.volume = 0;
  });
}

// Fade out RSong when choice screen appears
function fadeOutRSong() {
  _fadeTo(_tracks.rsong, 'rsong', 0, 10000, () => {
    _tracks.rsong.pause();
  });
}

// ─── _Tone.js — Hover (earth objects) ─────────────────────────────────────────
// ─── Hover — wind whoosh ──────────────────────────────────────────────────────
const _windTrack = new Audio('/audio/wind.mp3');
_windTrack.volume = 0;
let _hoverCount  = 0;

function playHover() {
  // Reset and play from start each hover
  _windTrack.currentTime = 0;
  _windTrack.volume      = 0;
  _windTrack.play();

  // Pan direction alternates per hover — left→right or right→left
  // Using AudioContext for panning since HTMLAudioElement doesn't support it natively
  if (!_windTrack._panNode) {
    const ctx        = new AudioContext();
    const source     = ctx.createMediaElementSource(_windTrack);
    const panner     = ctx.createStereoPanner();
    source.connect(panner);
    panner.connect(ctx.destination);
    _windTrack._panNode = panner;
    _windTrack._ctx     = ctx;
  }

  const panStart = _hoverCount % 2 === 0 ? -1 :  1;
  const panEnd   = _hoverCount % 2 === 0 ?  1 : -1;
  _windTrack._panNode.pan.setValueAtTime(panStart, _windTrack._ctx.currentTime);
  _windTrack._panNode.pan.linearRampToValueAtTime(panEnd, _windTrack._ctx.currentTime + 1.0);

  // Fade in then out over the whoosh duration
  _fadeTo(_windTrack, 'wind', 0.7, 400, () => {
    setTimeout(() => _fadeTo(_windTrack, 'wind', 0, 600), 800);
  });

  _hoverCount++;
}

// ─── _Tone.js — "I Do" hypersonic riser ───────────────────────────────────────
let _riserSynth = null;

function playRiser() {
  if (_riserSynth) { _riserSynth.dispose(); _riserSynth = null; }

  const reverb = new _Tone.Reverb({ decay: 4, wet: 0.7 }).toDestination();
  _riserSynth  = new _Tone.Synth({
    oscillator: { type: 'sawtooth' },
    envelope:   { attack: 0.8, decay: 0.1, sustain: 1.0, release: 2.0 },
  }).connect(reverb);
  _riserSynth.volume.value = -6;

  // Sweep from low to high over 3 seconds
  _riserSynth.triggerAttack('C2', _Tone.now());
  _riserSynth.frequency.exponentialRampToValueAtTime(
    _Tone.Frequency('C6').toFrequency(),
    _Tone.now() + 3
  );
  setTimeout(() => {
    if (_riserSynth) {
      _riserSynth.triggerRelease();
      setTimeout(() => { if (_riserSynth) { _riserSynth.dispose(); _riserSynth = null; } }, 2500);
    }
  }, 3000);
}



export {
  preloadAudio,
  unlockAudio,
  playIFloat,
  stopIFloat,
  playRSong,
  stopRSong,
  playTurbulence,
  stopTurbulence,
  crossfadeToRSong,
  stopAllMusic,
  fadeOutRSong,
  playHover,
  playRiser,
};
