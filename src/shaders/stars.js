// ── Star shaders, layer builder, and color palettes ──
// Edit STAR_FRAG_FIELD / STAR_FRAG_BRIGHT / STAR_FRAG_MW to change star appearance.
// Edit buildStarLayer() calls at the bottom for count, radius, size, brightness.
// Edit coolBlueWhite / midPalette / brightPalette for star color distribution.

import * as THREE from 'three';

// ── STARFIELD: multi-pass emission shader ──
// Vertex shared across all layers
const STAR_VERT = `
  attribute float aSize;
  attribute float aBrightness;
  attribute vec3 aColor;
  attribute float aPhase;
  varying vec3 vColor;
  varying float vBrightness;
  varying float vPhase;
  uniform float uTime;
  uniform float uPixelRatio;
  void main() {
    vColor = aColor;
    vBrightness = aBrightness;
    vPhase = aPhase;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float twinkle = 1.0 + 0.22 * sin(uTime * 1.7 + aPhase * 6.28)
                        + 0.08 * sin(uTime * 3.9 + aPhase * 12.1);
    gl_PointSize = aSize * uPixelRatio * twinkle * (320.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment for background + mid field — soft photographic pinpoints
const STAR_FRAG_FIELD = `
  varying vec3 vColor;
  varying float vBrightness;
  varying float vPhase;
  uniform float uTime;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    // Tight hot core
    float core = exp(-d * 18.0) * 1.4;
    // Medium emission corona
    float corona = exp(-d * 7.0) * 0.55;
    // Wide diffuse halo — gives the gaseous quality
    float halo = exp(-d * 2.8) * 0.22;

    // Iridescent corona ring — color shifts with angle
    float angle = atan(uv.y, uv.x);
    float ring = smoothstep(0.28, 0.22, d) * smoothstep(0.12, 0.22, d);
    // Chromatic shift: red ahead, blue behind in the ring
    vec3 iridescent = vec3(
      0.5 + 0.5 * sin(angle * 2.0 + uTime * 0.4 + vPhase * 3.1),
      0.5 + 0.5 * sin(angle * 2.0 + uTime * 0.4 + vPhase * 3.1 + 2.09),
      0.5 + 0.5 * sin(angle * 2.0 + uTime * 0.4 + vPhase * 3.1 + 4.18)
    ) * 0.35;

    vec3 col = vColor * (core + corona) + vColor * halo + iridescent * ring * vBrightness;
    float alpha = (core + corona * 0.8 + halo * 0.4 + ring * 0.3) * vBrightness;
    gl_FragColor = vec4(col, alpha);
  }
`;

// Fragment for bright foreground stars — full emission with Fresnel spikes + chromatic aberration
const STAR_FRAG_BRIGHT = `
  varying vec3 vColor;
  varying float vBrightness;
  varying float vPhase;
  uniform float uTime;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    // Hot core
    float core  = exp(-d * 14.0) * 1.1;
    // Emission corona — wide and bright
    float corona = exp(-d * 10.0) * 0.9;
    // Outer gaseous nebular shell
    float nebula = exp(-d * 2.1) * 0.35;

    // Chromatic aberration: RGB channels at slightly different radii
    float dr = length(uv * 1.02);
    float dg = d;
    float db = length(uv * 0.98);
    float coreR = exp(-dr * 14.0) * 1.8;
    float coreG = exp(-dg * 14.0) * 1.8;
    float coreB = exp(-db * 14.0) * 1.8;
    vec3 chromatic = vec3(coreR, coreG, coreB) * vColor;

    // Iridescent corona with animated hue rotation
    float angle = atan(uv.y, uv.x);
    float ring = smoothstep(0.32, 0.24, d) * smoothstep(0.14, 0.24, d);
    float hueShift = uTime * 0.3 + vPhase * 6.28;
    vec3 iridescent = vec3(
      0.5 + 0.5 * sin(angle * 3.0 + hueShift),
      0.5 + 0.5 * sin(angle * 3.0 + hueShift + 2.09),
      0.5 + 0.5 * sin(angle * 3.0 + hueShift + 4.18)
    ) * 0.6 * ring;

    // Diffraction spike cross — four-pointed, with subtle color fringing
    float ax = abs(uv.x), ay = abs(uv.y);
    float spike4 = max(
      smoothstep(0.48, 0.0, ax) * smoothstep(0.22, 0.0, ay),
      smoothstep(0.48, 0.0, ay) * smoothstep(0.22, 0.0, ax)
    );
    // Diagonal secondary spikes (45 deg) — fainter
    vec2 uvRot = vec2(uv.x + uv.y, uv.x - uv.y) * 0.707;
    float spike4b = max(
      smoothstep(0.38, 0.0, abs(uvRot.x)) * smoothstep(0.18, 0.0, abs(uvRot.y)),
      smoothstep(0.38, 0.0, abs(uvRot.y)) * smoothstep(0.18, 0.0, abs(uvRot.x))
    ) * 0.45;
    float spikes = (spike4 + spike4b) * vBrightness;

    // Spike color: slight warm-cool split
    vec3 spikeCol = mix(vec3(1.0, 0.92, 0.75), vec3(0.75, 0.88, 1.0),
                        clamp(uv.x * 2.0 + 0.5, 0.0, 1.0));

    vec3 col = chromatic * (core + corona * 0.8)
             + vColor * nebula
             + iridescent
             + spikeCol * spikes * 1.2;
    float alpha = (core * 0.9 + corona * 0.7 + nebula * 0.3 + ring * 0.4 + spikes * 0.6) * vBrightness;
    gl_FragColor = vec4(col, alpha);
  }
`;

// Fragment for Milky Way — ultra-soft gaseous emission only
const STAR_FRAG_MW = `
  varying vec3 vColor;
  varying float vBrightness;
  varying float vPhase;
  uniform float uTime;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    // Pure volumetric gas: only soft gaussian, no hard core
    float gas = exp(-d * 4.5) * 0.9;
    float outer = exp(-d * 1.6) * 0.3;
    // Faint emission color variation — nebular green-teal wisps in band
    float angle = atan(uv.y, uv.x);
    float emission = 0.06 * sin(angle * 4.0 + uTime * 0.15 + vPhase * 6.28);
    vec3 emitCol = vColor + vec3(-emission, emission * 0.5, emission * 0.8);
    float alpha = (gas + outer) * vBrightness;
    gl_FragColor = vec4(emitCol * (gas + outer), alpha);
  }
`;

function makeStarMat(fragShader) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
    vertexShader: STAR_VERT,
    fragmentShader: fragShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function buildStarLayer(count, rMin, rMax, sizeMin, sizeMax, brightMin, brightMax, colorFn, fragShader) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const sz  = new Float32Array(count);
  const br  = new Float32Array(count);
  const col = new Float32Array(count * 3);
  const ph  = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = rMin + Math.random() * (rMax - rMin);
    pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i*3+2] = r * Math.cos(phi);
    sz[i]  = sizeMin + Math.random() * (sizeMax - sizeMin);
    br[i]  = brightMin + Math.random() * (brightMax - brightMin);
    ph[i]  = Math.random();
    const c = colorFn(Math.random());
    col[i*3] = c[0]; col[i*3+1] = c[1]; col[i*3+2] = c[2];
  }
  geo.setAttribute('position',   new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize',      new THREE.BufferAttribute(sz,  1));
  geo.setAttribute('aBrightness',new THREE.BufferAttribute(br,  1));
  geo.setAttribute('aColor',     new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aPhase',     new THREE.BufferAttribute(ph,  1));
  const mat = makeStarMat(fragShader);
  return { points: new THREE.Points(geo, mat), mat };
}

// Color palettes
const coolBlueWhite = t => {
  if (t < 0.50) return [0.78, 0.86, 1.00];
  if (t < 0.72) return [0.92, 0.94, 1.00];
  if (t < 0.86) return [1.00, 0.88, 0.68];
  return [0.70, 0.80, 1.00];
};
const midPalette = t => {
  if (t < 0.48) return [0.85, 0.91, 1.00];
  if (t < 0.70) return [1.00, 0.94, 0.82];
  if (t < 0.85) return [1.00, 0.80, 0.55];
  return [0.76, 0.86, 1.00];
};
const brightPalette = t => {
  if (t < 0.42) return [0.94, 0.97, 1.00];
  if (t < 0.65) return [1.00, 0.96, 0.86];
  if (t < 0.80) return [1.00, 0.76, 0.50];
  return [0.72, 0.84, 1.00];
};

// Build layers
const bgLayer   = buildStarLayer(9000, 160, 240, 0.4, 1.0, 0.12, 0.60, coolBlueWhite, STAR_FRAG_FIELD);
const midLayer  = buildStarLayer(2400, 100, 160, 0.7, 1.8, 0.42, 0.88, midPalette,    STAR_FRAG_FIELD);
const fgLayer   = buildStarLayer(95,   60, 110, 2.0, 5.5, 0.76, 1.00, brightPalette, STAR_FRAG_BRIGHT);

// Milky Way — hand-placed along galactic band
const mwCount = 16000;
const mwGeo  = new THREE.BufferGeometry();
const mwPos  = new Float32Array(mwCount * 3);
const mwSz   = new Float32Array(mwCount);
const mwBr   = new Float32Array(mwCount);
const mwCol  = new Float32Array(mwCount * 3);
const mwPh   = new Float32Array(mwCount);
for (let i = 0; i < mwCount; i++) {
  const lon   = (Math.random() - 0.5) * Math.PI * 2;
  const lat   = (Math.random() + Math.random() - 1.0) * 0.28; // gaussian-ish width
  const r     = 190 + Math.random() * 25;
  const cosL  = Math.cos(lat);
  mwPos[i*3]   = r * Math.cos(lon) * cosL;
  mwPos[i*3+1] = r * Math.sin(lat) * 1.7;
  mwPos[i*3+2] = r * Math.sin(lon) * cosL;
  mwSz[i]  = 0.18 + Math.random() * 0.38;
  const core = Math.max(0, 1.0 - Math.abs(lat) * 4.8);
  mwBr[i]  = 0.06 + core * 0.42 + Math.random() * 0.10;
  mwPh[i]  = Math.random();
  // Warm core fading to blue-white edges
  mwCol[i*3]   = 0.80 + core * 0.16;
  mwCol[i*3+1] = 0.84 + core * 0.08;
  mwCol[i*3+2] = 0.94 + core * 0.03;
}
mwGeo.setAttribute('position',   new THREE.BufferAttribute(mwPos, 3));
mwGeo.setAttribute('aSize',      new THREE.BufferAttribute(mwSz,  1));
mwGeo.setAttribute('aBrightness',new THREE.BufferAttribute(mwBr,  1));
mwGeo.setAttribute('aColor',     new THREE.BufferAttribute(mwCol, 3));
mwGeo.setAttribute('aPhase',     new THREE.BufferAttribute(mwPh,  1));
const mwMat    = makeStarMat(STAR_FRAG_MW);
const milkyWay = new THREE.Points(mwGeo, mwMat);

// Collect all layers for uniform update
const starLayers = [bgLayer.mat, midLayer.mat, fgLayer.mat, mwMat];

// Group everything for unified rotation
const starField = new THREE.Group();
starField.add(bgLayer.points, midLayer.points, fgLayer.points, milkyWay);

export { buildStarLayer, makeStarMat, bgLayer, midLayer, fgLayer, milkyWay, mwMat, starLayers, starField };
