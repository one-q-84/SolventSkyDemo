import * as THREE from 'three';
import { EARTH_OBJECTS } from '../data/story.js';
import { renderNarrativeSection, revealLines } from './narrative.js';
import { showSeraphs, hideSeraphs } from '../shaders/seraphs.js';
import { glitchPass } from '../main.js';
import { hideStarCanvas, showStarCanvas } from './utils.js';
import { state } from '../state.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { playHover } from '../audio.js';

/* ═══════════════════════════════════════════
   MODULE-LEVEL STATE
═══════════════════════════════════════════ */
let earthScene, earthCamera, earthRenderer;
let earthObjects        = [];
let earthRaycaster, earthMouse;
let earthCountdownTimer = null;
let earthSecondsLeft    = 42;
let hoveredEarthObj     = null;
let earthAnimId         = null;
let _timesUpShown       = false;

// Spin counter
let _spinStartTime  = 0;
let spinsCompleted  = 0;
let _spinMesh       = null;
let _spinRenderer   = null;
let _spinScene      = null;
let _spinCamera     = null;
let _spinAnimId     = null;

// Backdrop
let _backdropAnimId = null;

// Preload cache
const loader = new GLTFLoader();
const _preloadedModels = {};

/* ═══════════════════════════════════════════
   PRELOAD
═══════════════════════════════════════════ */
function preloadEarthModels() {
  EARTH_OBJECTS.forEach(obj => {
    if (!obj.file) return;
    loader.load(obj.file, (gltf) => {
      _preloadedModels[obj.file] = gltf;
    });
  });
}

/* ═══════════════════════════════════════════
   PERLIN NOISE
═══════════════════════════════════════════ */
function fade(t)     { return t*t*t*(t*(t*6-15)+10); }
function lerp(a,b,t) { return a+t*(b-a); }
function grad(h,x,y) {
  const v=(h&1)?((h&2)?-y:y):((h&2)?-x:x);
  return v+((h&1)?((h&2)?-x:x):((h&2)?-y:y));
}
const _perm = (() => {
  const p=Array.from({length:256},(_,i)=>i);
  for(let i=255;i>0;i--){const j=Math.floor(Math.random()*(i+1));[p[i],p[j]]=[p[j],p[i]];}
  return [...p,...p];
})();
function perlin2(x,y){
  const X=Math.floor(x)&255,Y=Math.floor(y)&255;
  x-=Math.floor(x);y-=Math.floor(y);
  const u=fade(x),v=fade(y);
  const a=_perm[X]+Y,b=_perm[X+1]+Y;
  return lerp(
    lerp(grad(_perm[a],x,y),grad(_perm[b],x-1,y),u),
    lerp(grad(_perm[a+1],x,y-1),grad(_perm[b+1],x-1,y-1),u),v);
}
function fbm(x,y,octaves=4){
  let v=0,amp=0.5,freq=1,max=0;
  for(let i=0;i<octaves;i++){v+=perlin2(x*freq,y*freq)*amp;max+=amp;amp*=0.5;freq*=2.1;}
  return v/max;
}

/* ═══════════════════════════════════════════
   PORTAL TRANSITION
═══════════════════════════════════════════ */
function runPortalTransition(direction, onComplete) {
  let canvas = document.getElementById('portal-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'portal-canvas';
    Object.assign(canvas.style, {
      position:'fixed', top:'0', left:'0',
      width:'100%', height:'100%',
      pointerEvents:'none', zIndex:'9998',
    });
    document.body.appendChild(canvas);
  }
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  const cx=W/2, cy=H/2;
  const DURATION = 800;
  let start = null;

  function draw(ts) {
    if (!start) start = ts;
    const t = Math.min((ts-start)/DURATION, 1.0);
    ctx.clearRect(0,0,W,H);
    const glowAlpha = Math.sin(t*Math.PI)*0.6;
    if (glowAlpha > 0.01) {
      const gr = Math.min(W,H)*0.3;
      const cg = ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(gr,1));
      cg.addColorStop(0,   `rgba(200,230,255,${glowAlpha})`);
      cg.addColorStop(0.4, `rgba(150,200,255,${glowAlpha*0.5})`);
      cg.addColorStop(1,   'rgba(100,160,255,0)');
      ctx.fillStyle=cg;
      ctx.beginPath(); ctx.arc(cx,cy,gr,0,Math.PI*2); ctx.fill();
    }
    if ((ts-start) < DURATION) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0,0,W,H);
      if (onComplete) onComplete();
    }
  }
  requestAnimationFrame(draw);
}

/* ═══════════════════════════════════════════
   PERLIN BACKDROP
═══════════════════════════════════════════ */
function startBackdrop() {
  let canvas = document.getElementById('earth-backdrop');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'earth-backdrop';
    Object.assign(canvas.style, {
      position:'fixed', top:'0', left:'0',
      width:'100%', height:'100%',
      pointerEvents:'none', zIndex:'1',
      opacity:'0', transition:'opacity 0.6s ease',
    });
    const overlay = document.getElementById('earth-overlay');
    document.body.insertBefore(canvas, overlay);
  }
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  let noiseT = 0;

  function drawBackdrop() {
    _backdropAnimId = requestAnimationFrame(drawBackdrop);
    noiseT += 0.004;
    ctx.clearRect(0,0,W,H);
    const imageData = ctx.createImageData(W,H);
    const data = imageData.data;
    const step = 4;
    for (let y=0;y<H;y+=step) {
      for (let x=0;x<W;x+=step) {
        const nx=x/W*3.5, ny=y/H*3.5;
        const n  = fbm(nx+noiseT*0.3, ny+noiseT*0.2, 4);
        const n2 = fbm(nx*2.1+noiseT*0.15+4.2, ny*2.1+7.3, 3);
        const r=Math.floor(20+n*60+n2*30);
        const g=Math.floor(12+n*35+n2*20);
        const b=Math.floor(28+n2*70+n*20);
        for (let dy=0;dy<step&&y+dy<H;dy++) {
          for (let dx=0;dx<step&&x+dx<W;dx++) {
            const idx=((y+dy)*W+(x+dx))*4;
            data[idx]=Math.min(r,255); data[idx+1]=Math.min(g,255);
            data[idx+2]=Math.min(b,255); data[idx+3]=255;
          }
        }
      }
    }
    ctx.putImageData(imageData,0,0);
    const vgrd = ctx.createRadialGradient(
      W/2,H/2,Math.max(H*0.2,1),
      W/2,H/2,Math.max(H*0.85,2)
    );
    vgrd.addColorStop(0,'rgba(0,0,0,0)');
    vgrd.addColorStop(1,'rgba(0,0,0,0.55)');
    ctx.fillStyle=vgrd;
    ctx.fillRect(0,0,W,H);
  }

  drawBackdrop();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { canvas.style.opacity = '1'; });
  });
}

function stopBackdrop() {
  cancelAnimationFrame(_backdropAnimId);
  _backdropAnimId = null;
  const canvas = document.getElementById('earth-backdrop');
  if (canvas) {
    canvas.style.transition = 'opacity 0.4s ease';
    canvas.style.opacity = '0';
  }
}

/* ═══════════════════════════════════════════
   SPIN COUNTER
═══════════════════════════════════════════ */
function initSpinCounter() {
  const container = document.getElementById('earth-spin-counter');
  if (!container) return;

  let spinCanvas = document.getElementById('earth-spin-sphere-canvas');
  if (!spinCanvas) {
    spinCanvas = document.createElement('canvas');
    spinCanvas.id = 'earth-spin-sphere-canvas';
    spinCanvas.width  = 48;
    spinCanvas.height = 48;
    container.insertBefore(spinCanvas, container.firstChild);
  }

  _spinScene  = new THREE.Scene();
  _spinCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  _spinCamera.position.set(0, 0, 3);
  _spinRenderer = new THREE.WebGLRenderer({ canvas: spinCanvas, antialias: true, alpha: true });
  _spinRenderer.setSize(48, 48);
  _spinRenderer.setClearColor(0x000000, 0);

  const geo = new THREE.SphereGeometry(0.9, 16, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xd4c4a8, emissive: 0x554433,
    emissiveIntensity: 0.3, roughness: 0.7, metalness: 0.4,
  });
  _spinMesh = new THREE.Mesh(geo, mat);
  _spinScene.add(_spinMesh);
  _spinScene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: 0xffeedd, wireframe: true, opacity: 0.25, transparent: true
  })));
  _spinScene.add(new THREE.AmbientLight(0xffeedd, 1.0));
  const pt = new THREE.PointLight(0xffffff, 4);
  pt.position.set(2, 2, 3);
  _spinScene.add(pt);

  spinsCompleted = 0;
  _spinStartTime = Date.now();
  updateSpinLabel();
  animateSpinCounter();
}

function animateSpinCounter() {
  if (state.phase !== 'earth') return;
  _spinAnimId = requestAnimationFrame(animateSpinCounter);
  const elapsed = (Date.now() - _spinStartTime) / 1000;
  const angle   = elapsed * Math.PI * 2;
  const newSpins = Math.floor(elapsed);
  if (newSpins !== spinsCompleted) {
    spinsCompleted = newSpins;
    updateSpinLabel();
  }
  if (_spinMesh)    _spinMesh.rotation.y = angle;
  if (_spinRenderer) _spinRenderer.render(_spinScene, _spinCamera);
}

function updateSpinLabel() {
  const label = document.getElementById('earth-spin-label');
  if (!label) return;
  label.textContent = spinsCompleted === 1
    ? '1 SPIN OF EARTH'
    : `${spinsCompleted} SPINS OF EARTH`;

  if (spinsCompleted > 0 && spinsCompleted % 7 === 0) {
    label.classList.remove('spin-milestone');
    void label.offsetWidth;
    label.classList.add('spin-milestone');
    setTimeout(() => label.classList.remove('spin-milestone'), 1000);
  }
}

function stopSpinCounter() {
  cancelAnimationFrame(_spinAnimId);
  _spinAnimId = null;
  if (_spinRenderer) { _spinRenderer.dispose(); _spinRenderer = null; }
}

/* ═══════════════════════════════════════════
   TIMES UP SEQUENCE
═══════════════════════════════════════════ */
function showTimesUp() {
  if (_timesUpShown) return;
  _timesUpShown = true;

  clearInterval(earthCountdownTimer);
  stopSpinCounter();

  const l1 = document.getElementById('earth-timesup-line1');
  const l2 = document.getElementById('earth-timesup-line2');
  if (!l1 || !l2) return;

  l1.textContent = 'YOUR TIME HAS COME.';
  l1.classList.add('visible');

  setTimeout(() => {
    l2.textContent = 'PRESS "C" TO DECIDE';
    l2.classList.add('visible');
    window.addEventListener('keydown', _onChooseKey);
  }, 400);
}

function _onChooseKey(e) {
  if (e.key.toLowerCase() !== 'c') return;
  window.removeEventListener('keydown', _onChooseKey);
  endEarthSection();
}

/* ═══════════════════════════════════════════
   SCENE INIT
═══════════════════════════════════════════ */
function initEarthScene() {
  const canvas  = document.getElementById('earth-canvas');
  earthScene    = new THREE.Scene();
  earthCamera   = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
  earthCamera.position.set(0, 0, 8);
  earthRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  earthRenderer.setSize(window.innerWidth, window.innerHeight);
  earthRenderer.setClearColor(0x000000, 0);

  earthScene.add(new THREE.AmbientLight(0xffffff, 4.5));
  const pt = new THREE.PointLight(0xffffff, 99);
  pt.position.set(0, 3, 6);
  earthScene.add(pt);
  const fill = new THREE.PointLight(0xaaaaff, 69);
  fill.position.set(-5, -3, 4);
  earthScene.add(fill);

  // Atmosphere dust
  const atmoCount = 300;
  const atmoGeo   = new THREE.BufferGeometry();
  const atmoPos   = new Float32Array(atmoCount*3);
  for (let i=0; i<atmoCount; i++) {
    atmoPos[i*3]  =(Math.random()-0.5)*20;
    atmoPos[i*3+1]=(Math.random()-0.5)*12;
    atmoPos[i*3+2]=(Math.random()-0.5)*10-2;
  }
  atmoGeo.setAttribute('position', new THREE.BufferAttribute(atmoPos, 3));
  earthScene.add(new THREE.Points(atmoGeo, new THREE.PointsMaterial({
    color:0xffeecc, size:0.06, transparent:true, opacity:0.3, sizeAttenuation:true
  })));

  // Load objects from preload cache
  const arcRadius  = 4.2;
  const startAngle = -Math.PI * 0.45;
  const endAngle   =  Math.PI * 0.45;

  EARTH_OBJECTS.forEach((obj, i) => {
    const t     = i / 4;
    const angle = startAngle + t * (endAngle - startAngle);
    const x     = Math.sin(angle) * arcRadius;
    const y     = -1.2 + Math.sin(t * Math.PI) * 1.0;

    const gltf = _preloadedModels[obj.file];
    if (!gltf) return;

    const model = gltf.scene.clone();
    model.scale.setScalar(obj.scale || 1.0);
    model.position.set(x + (obj.offsetX || 0), y + (obj.offsetY || 0), 0);
    model.rotation.y = obj.rotationY || 0;

    model.traverse(child => {
      if (child.isMesh) {
        child.userData.baseEmissive      = child.material.emissiveIntensity || 0;
        child.userData.baseEmissiveColor = child.material.emissive.clone();
        child.userData.baseOpacity       = child.material.opacity;
        child.material.transparent       = true;
      }
    });

    model.userData.objIndex     = i;
    model.userData.baseEmissive = 0.0;
    model.userData.baseOpacity  = 0.9;

    earthScene.add(model);
    earthObjects.push(model);
  });

  earthRaycaster = new THREE.Raycaster();
  earthMouse     = new THREE.Vector2();

  const ec = document.getElementById('earth-canvas');
  ec.addEventListener('mousemove',  onEarthHover);
  ec.addEventListener('mouseleave', onEarthLeave);
}

/* ═══════════════════════════════════════════
   HOVER
═══════════════════════════════════════════ */
function onEarthHover(e) {
  earthMouse.x =  (e.clientX/window.innerWidth)*2-1;
  earthMouse.y = -(e.clientY/window.innerHeight)*2+1;
  earthRaycaster.setFromCamera(earthMouse, earthCamera);
  const hits = earthRaycaster.intersectObjects(earthObjects, true);
  document.getElementById('earth-canvas').style.cursor = hits.length>0 ? 'pointer' : 'default';

  if (hits.length > 0) {
    let hit = hits[0].object;
    while (hit.parent && hit.userData.objIndex === undefined) hit = hit.parent;
    if (hit.userData.objIndex === undefined) return;
    const idx = hit.userData.objIndex;

    if (hoveredEarthObj !== idx) {
      hoveredEarthObj = idx;
      playHover();
      document.getElementById('earth-hint').style.opacity       = '0';
      document.getElementById('earth-info-title').textContent   = EARTH_OBJECTS[idx].name;
      document.getElementById('earth-info-body').textContent    = EARTH_OBJECTS[idx].description;
      document.getElementById('earth-info-title').style.opacity = '1';
      document.getElementById('earth-info-body').style.opacity  = '1';

      earthObjects.forEach((o, i) => {
        o.traverse(child => {
          if (child.isMesh) {
            child.material.emissiveIntensity = i === idx ? 0.4 : child.userData.baseEmissive;
          }
        });
      });
    }
  } else {
    onEarthLeave();
  }
}

function onEarthLeave() {
  if (hoveredEarthObj === null) return;
  hoveredEarthObj = null;
  document.getElementById('earth-info-title').style.opacity = '0';
  document.getElementById('earth-info-body').style.opacity  = '0';
  document.getElementById('earth-hint').style.opacity       = '1';
  earthObjects.forEach(o => {
    o.traverse(child => {
      if (child.isMesh) {
        child.material.emissiveIntensity = child.userData.baseEmissive;
        child.material.emissive.copy(child.userData.baseEmissiveColor);
      }
    });
  });
}

/* ═══════════════════════════════════════════
   START
═══════════════════════════════════════════ */
function startEarthSection() {
  state.phase = 'earth';
  state.scrollLocked = true;
  document.getElementById('scroll-driver').classList.remove('active');
  document.getElementById('text-block').innerHTML = '';
  hideSeraphs();
  hideStarCanvas();

  if (!earthScene) initEarthScene();

  startBackdrop();

  if (glitchPass) {
    glitchPass.enabled = true;
    setTimeout(() => { glitchPass.enabled = false; }, 200);
  }

  runPortalTransition('in', () => {
    const overlay = document.getElementById('earth-overlay');
    overlay.style.opacity    = '0';
    overlay.style.transition = 'none';
    overlay.classList.add('active');
    requestAnimationFrame(() => {
      overlay.style.transition = 'opacity 1.2s ease';
      overlay.style.opacity    = '1';
    });

    initSpinCounter();

    earthSecondsLeft = 42;
    _timesUpShown    = false;
    const secEl = document.getElementById('earth-seconds');
    if (secEl) secEl.textContent = '42';

    earthCountdownTimer = setInterval(() => {
      earthSecondsLeft--;
      if (secEl) secEl.textContent = String(earthSecondsLeft).padStart(2, '0');
      if (earthSecondsLeft <= 0) {
        clearInterval(earthCountdownTimer);
        showTimesUp();
      }
    }, 1000);

    animateEarth();
  });
}

/* ═══════════════════════════════════════════
   END
═══════════════════════════════════════════ */
function endEarthSection() {
  cancelAnimationFrame(earthAnimId);
  clearInterval(earthCountdownTimer);
  stopSpinCounter();
  window.removeEventListener('keydown', _onChooseKey);

  const overlay = document.getElementById('earth-overlay');
  overlay.style.transition = 'opacity 1s';
  overlay.style.opacity    = '0';

  setTimeout(() => {
    overlay.classList.remove('active');
    overlay.style.opacity    = '';
    overlay.style.transition = '';

    // Reset timesup UI
    const l1 = document.getElementById('earth-timesup-line1');
    const l2 = document.getElementById('earth-timesup-line2');
    if (l1) { l1.textContent = ''; l1.classList.remove('visible'); }
    if (l2) { l2.textContent = ''; l2.classList.remove('visible'); }
    _timesUpShown = false;

    stopBackdrop();

    if (glitchPass) {
      glitchPass.enabled = true;
      setTimeout(() => { glitchPass.enabled = false; }, 200);
    }

    setTimeout(() => {
      showStarCanvas();
      runPortalTransition('out', () => {
        state.phase          = 'narrative';
        state.scrollLocked   = false;
        state.currentSection = 7;
        state.currentLine    = 0;
        renderNarrativeSection(7);
        showSeraphs();
        revealLines(0);
        document.getElementById('scroll-driver').classList.add('active');
      });
    }, 180);
  }, 1000);
}

/* ═══════════════════════════════════════════
   ANIMATE
═══════════════════════════════════════════ */
function animateEarth() {
  if (state.phase !== 'earth') return;
  earthAnimId = requestAnimationFrame(animateEarth);
  const t = Date.now() * 0.001;
  earthObjects.forEach((obj, i) => {
    obj.rotation.x = t * (0.2 + i * 0.05);
    obj.rotation.y = t * (0.3 + i * 0.04);
    obj.position.y += Math.sin(t * 0.8 + i * 1.2) * 0.001;
  });
  earthRenderer.render(earthScene, earthCamera);
}

export { startEarthSection, endEarthSection, animateEarth, preloadEarthModels };