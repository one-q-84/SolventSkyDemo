import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';

// ─── constants ────────────────────────────────────────────────────────────────
const PARTICLE_RES    = 384;    // 384×384 = 147k particles — dense enough for volume

// Simulation
const SPEED           = 0.06;   // slow, languid internal motion
const DIE_SPEED       = 0.003;  // very long life → always full population
const CURL_SIZE       = 0.8;    // medium scale swirl — coherent, not chaotic
const ATTRACTION      = 18.0;   // very strong snap-back → particles hug the surface
const SHADOW_OPACITY  = 1.8;    // boosted — each particle punches harder

// Render
const POINT_SIZE      = 0.9;    // larger individual points

// Orbit — shell-like, not solid sphere
// Particles spawn on the SURFACE of the sphere, not inside it
// This creates the "overflowing from within" shell appearance
const ORBIT_R   = 0.01;   // shell radius — single value, perfectly spherical
const ORBIT_CX  = 0.39;   // separation between the two seraphs

const COLOR_BASE  = new THREE.Color(0xffffff);
const COLOR_FADE  = new THREE.Color(0xaabbff);

// ─── noise + curl ─────────────────────────────────────────────────────────────
const GLSL_NOISE = /* glsl */`
vec3 _mod289v3(vec3 x){ return x - floor(x*(1./289.))*289.; }
vec4 _mod289v4(vec4 x){ return x - floor(x*(1./289.))*289.; }
vec4 _permute(vec4 x)  { return _mod289v4(((x*34.)+1.)*x); }
vec4 _taylorInvSqrt(vec4 r){ return 1.79284291400159-0.85373472095314*r; }

float snoise(vec3 v){
  const vec2 C = vec2(1./6., 1./3.);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1.0 - g;
  vec3 i1 = min(g, l.zxy);
  vec3 i2 = max(g, l.zxy);
  vec3 x1 = x0 - i1 + C.x;
  vec3 x2 = x0 - i2 + C.y;
  vec3 x3 = x0 - 0.5;
  i = _mod289v3(i);
  vec4 p = _permute(_permute(_permute(
      i.z + vec4(0.,i1.z,i2.z,1.))
    + i.y + vec4(0.,i1.y,i2.y,1.))
    + i.x + vec4(0.,i1.x,i2.x,1.));
  vec3 ns = vec3(0.142857142857)*vec3(0.,1.,-1.) + vec3(0.5/7.,0.,-0.5/7.);
  vec4 j  = p - 49.0*floor(p*(1./49.));
  vec4 x_ = floor(j*(1./7.));
  vec4 y_ = floor(j - 7.*x_);
  vec4 xx = x_*(2./7.) + ns.y;
  vec4 yy = y_*(2./7.) + ns.y;
  vec4 hh = 1.0 - abs(xx) - abs(yy);
  vec4 b0 = vec4(xx.xy, yy.xy);
  vec4 b1 = vec4(xx.zw, yy.zw);
  vec4 s0 = floor(b0)*2.0+1.0;
  vec4 s1 = floor(b1)*2.0+1.0;
  vec4 sh = -step(hh, vec4(0.));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,hh.x);
  vec3 p1 = vec3(a0.zw,hh.y);
  vec3 p2 = vec3(a1.xy,hh.z);
  vec3 p3 = vec3(a1.zw,hh.w);
  vec4 norm = _taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m = max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m = m*m;
  return 42.*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

vec3 curlNoise(vec3 p, float e){
  float e2 = 2.0*e;
  vec3 c;
  c.x = ( snoise(vec3(p.x,p.y+e,p.z)) - snoise(vec3(p.x,p.y-e,p.z))
         -snoise(vec3(p.x,p.y,p.z+e)) + snoise(vec3(p.x,p.y,p.z-e))) / e2;
  c.y = ( snoise(vec3(p.x,p.y,p.z+e)) - snoise(vec3(p.x,p.y,p.z-e))
         -snoise(vec3(p.x+e,p.y,p.z)) + snoise(vec3(p.x-e,p.y,p.z))) / e2;
  c.z = ( snoise(vec3(p.x+e,p.y,p.z)) - snoise(vec3(p.x-e,p.y,p.z))
         -snoise(vec3(p.x,p.y+e,p.z)) + snoise(vec3(p.x,p.y-e,p.z))) / e2;
  return c;
}
`;

// ─── velocity sim ─────────────────────────────────────────────────────────────
// Key change: attraction now pulls toward the SHELL surface, not the center.
// This creates the "overflowing orb" look — particles swarm the surface.
const velSimFrag = /* glsl */`
precision highp float;
${GLSL_NOISE}

uniform sampler2D uOrigin;
uniform float uTime;
uniform float uSpeed;
uniform float uAttraction;
uniform float uCurlSize;

void main(){
  vec2 uv    = gl_FragCoord.xy / resolution.xy;
  vec4 pos4  = texture2D(uPosition, uv);
  vec4 vel4  = texture2D(uVelocity, uv);
  float life = pos4.w;

  if(life <= 0.0){
    gl_FragColor = vec4(vel4.xyz * 0.5, 1.0);
    return;
  }

  vec3 pos    = pos4.xyz;
  vec3 vel    = vel4.xyz;
  vec3 origin = texture2D(uOrigin, uv).xyz;

  // Vector from seraph center to this particle
  vec3 toCenter = origin - pos;
  float dist    = length(toCenter);

  // Shell attraction: pull toward the shell surface at ORBIT_R distance
  // If inside shell → push outward. If outside → pull inward.
  // This concentrates particles ON the surface like a soap bubble.
  float shellR    = 0.25;  // must match ORBIT_R
  float shellDiff = dist - shellR;  // negative = inside, positive = outside
  vec3  shellDir  = (dist > 0.0001) ? normalize(toCenter) : vec3(0.,1.,0.);
  // Pull toward shell surface — stronger when far from it
  vec3 shellForce = -shellDir * shellDiff * uAttraction * 0.8;

  // Curl noise drives tangential motion across the surface
  vec3 np      = pos * uCurlSize + uTime * 0.03;
  vec3 curlF   = curlNoise(np, 0.001) * uSpeed;

  // Remove radial component from curl so motion stays ON the shell
  // (project curl onto tangent plane of sphere)
  vec3 radial   = shellDir * dot(curlF, shellDir);
  vec3 tangentF = curlF - radial;

  // Subtle buzz — high frequency micro-jitter
  float jx = snoise(vec3(pos.x*12.0, pos.y*12.0, uTime*0.5))       * 0.0015;
  float jy = snoise(vec3(pos.y*12.0, pos.z*12.0, uTime*0.5 + 1.7)) * 0.0015;
  float jz = snoise(vec3(pos.z*12.0, pos.x*12.0, uTime*0.5 + 3.4)) * 0.0015;

  vel += (shellForce + tangentF + vec3(jx,jy,jz)) * 0.016;
  vel *= 0.30;  // aggressive damping — kills escape velocity

  gl_FragColor = vec4(vel, 1.0);
}
`;

// ─── position sim ─────────────────────────────────────────────────────────────
const posSimFrag = /* glsl */`
precision highp float;

uniform sampler2D uOrigin;
uniform float uDieSpeed;

void main(){
  vec2 uv    = gl_FragCoord.xy / resolution.xy;
  vec4 pos4  = texture2D(uPosition, uv);
  vec4 vel4  = texture2D(uVelocity, uv);
  float life = pos4.w;

  if(life <= 0.0){
    vec3 origin = texture2D(uOrigin, uv).xyz;
    // Respawn ON the shell surface with tiny random perturbation
    // Uses hash-based direction so each particle has a unique surface position
    float rx = fract(sin(dot(uv, vec2(127.1, 311.7)))*43758.5453)*2.0-1.0;
    float ry = fract(sin(dot(uv, vec2(269.5, 183.3)))*43758.5453)*2.0-1.0;
    float rz = fract(sin(dot(uv, vec2(419.2,  71.1)))*43758.5453)*2.0-1.0;
    vec3 dir  = normalize(vec3(rx,ry,rz));
    // Spawn on surface ± small random depth variation (creates shell thickness)
    float depth = 0.85 + fract(sin(dot(uv, vec2(78.3, 521.9)))*43758.5) * 0.3;
    vec3 spawnPos = origin + dir * 0.12 * depth;
    float randLife = 0.5 + fract(sin(dot(uv,vec2(127.1,311.7)))*43758.5) * 0.5;
    gl_FragColor = vec4(spawnPos, randLife);
    return;
  }

  vec3 newPos = pos4.xyz + vel4.xyz * 0.016;
  gl_FragColor = vec4(newPos, life - uDieSpeed);
}
`;

// ─── render vertex ────────────────────────────────────────────────────────────
const renderVert = /* glsl */`
precision highp float;

uniform sampler2D uPosition;
uniform vec3      uColorBase;
uniform vec3      uColorFade;
uniform float     uPointSize;
uniform float     uShadow;

varying vec3  vColor;
varying float vLife;
varying float vDist;  // distance from seraph center — for core glow

void main(){
  vec4  pos4  = texture2D(uPosition, uv);
  float life  = clamp(pos4.w, 0.0, 1.0);
  vLife       = life;

  // Pass distance from origin for core brightening in fragment shader
  // Origin is approximated as (0,0,0) in local space before offset
  vDist = length(pos4.xyz);

  vColor = mix(uColorFade, uColorBase, life);

  vec4  mvPos  = modelViewMatrix * vec4(pos4.xyz, 1.0);
  gl_Position  = projectionMatrix * mvPos;
  gl_PointSize = uPointSize * (300.0 / max(-mvPos.z, 8.0));
}
`;

// ─── render fragment ──────────────────────────────────────────────────────────
// Key change: brighter core glow, sharper particle disc
// Additive blending means overlapping particles sum to white — creates luminous center
const renderFrag = /* glsl */`
precision highp float;

varying vec3  vColor;
varying float vLife;
varying float vDist;
uniform float uShadow;

void main(){
  vec2  cxy = 2.0*gl_PointCoord - 1.0;
  float r   = dot(cxy,cxy);
  if(r > 1.0) discard;

  // Sharp bright disc with soft edge — not gaussian, more solid-feeling
  float disc  = 1.0 - smoothstep(0.0, 1.0, r);

  // Core boost: particles near center of seraph glow extra bright
  // vDist near 0 = deep inside = extra luminous
  float coreBrightness = 1.0 + smoothstep(0.12, 0.0, vDist) * 2.5;

  float alpha = disc * vLife * uShadow * coreBrightness;
  gl_FragColor = vec4(vColor * coreBrightness, alpha);
}
`;

// ─────────────────────────────────────────────────────────────────────────────
class SeraphParticles {
  constructor(renderer, scene, xOffset, colorBase, colorFade) {
    this.renderer   = renderer;
    this.scene      = scene;
    this.xOffset    = xOffset;
    this.colorBase  = colorBase || COLOR_BASE;
    this.colorFade  = colorFade || COLOR_FADE;
    this.visible    = false;
    this._buildGPU();
    this._buildMesh();
    this.mesh.visible = false;
  }

  _buildGPU() {
    const N = PARTICLE_RES;
    this._gpu = new GPUComputationRenderer(N, N, this.renderer);

    const dtPos    = this._gpu.createTexture();
    const dtVel    = this._gpu.createTexture();
    const origData = new Float32Array(N * N * 4);
    const posArr   = dtPos.image.data;
    const velArr   = dtVel.image.data;
    const ORBIT_Z = -0.51;

    for (let i = 0; i < N * N; i++) {
      // Spawn ON the shell surface (not inside) — spherical coordinates
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      // Small random depth variation creates shell thickness
      const r     = ORBIT_R * (0.85 + Math.random() * 0.3);
      const px    = r * Math.sin(phi) * Math.cos(theta);
      const py    = r * Math.sin(phi) * Math.sin(theta);
      const pz    = r * Math.cos(phi);

      const life = Math.random();
      const wx   = px + this.xOffset;

      posArr[i*4+0] = wx;  
      posArr[i*4+1] = py;
      posArr[i*4+2] = pz + ORBIT_Z;   
      posArr[i*4+3] = life;

      // Initial velocity: small tangential nudge so simulation starts moving
      velArr[i*4+0] = (Math.random()-0.5)*0.003;
      velArr[i*4+1] = (Math.random()-0.5)*0.003;
      velArr[i*4+2] = (Math.random()-0.5)*0.003;
      velArr[i*4+3] = 1;

      // Origin = seraph center (not the particle's surface position)
      // The velocity shader uses this as the shell center reference
      origData[i*4+0] = this.xOffset;
      origData[i*4+1] = 0;
      origData[i*4+2] = ORBIT_Z;
      origData[i*4+3] = 1;
    }

    this._originTex = new THREE.DataTexture(
      origData, N, N, THREE.RGBAFormat, THREE.FloatType
    );
    this._originTex.needsUpdate = true;

    this._posVar = this._gpu.addVariable('uPosition', posSimFrag, dtPos);
    this._velVar = this._gpu.addVariable('uVelocity', velSimFrag, dtVel);

    this._gpu.setVariableDependencies(this._posVar, [this._posVar, this._velVar]);
    this._gpu.setVariableDependencies(this._velVar, [this._posVar, this._velVar]);

    Object.assign(this._posVar.material.uniforms, {
      uOrigin:   { value: this._originTex },
      uDieSpeed: { value: DIE_SPEED },
    });

    Object.assign(this._velVar.material.uniforms, {
      uOrigin:     { value: this._originTex },
      uTime:       { value: 0 },
      uSpeed:      { value: SPEED },
      uAttraction: { value: ATTRACTION },
      uCurlSize:   { value: CURL_SIZE },
    });

    const err = this._gpu.init();
    if (err) console.error('[SeraphParticles] GPU init error:', err);

    // Pre-warm so bundles are fully populated on first show
    for (let i = 0; i < 300; i++) {
      this._gpu.compute();
    }
  }

  _buildMesh() {
    const N   = PARTICLE_RES;
    const cnt = N * N;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cnt*3), 3));
    const uvs = new Float32Array(cnt*2);
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const i = r*N+c;
        uvs[i*2+0] = c/(N-1);
        uvs[i*2+1] = r/(N-1);
      }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    this._mat = new THREE.ShaderMaterial({
      vertexShader:   renderVert,
      fragmentShader: renderFrag,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
      uniforms: {
        uPosition:  { value: null },
        uColorBase: { value: this.colorBase },
        uColorFade: { value: this.colorFade },
        uPointSize: { value: POINT_SIZE * (ORBIT_R / 0.12) },
        uShadow:    { value: SHADOW_OPACITY },
      },
    });

    this.mesh = new THREE.Points(geo, this._mat);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  update(time) {
    if (!this.visible) return;
    this._velVar.material.uniforms.uTime.value = time;
    this._gpu.compute();
    this._mat.uniforms.uPosition.value =
      this._gpu.getCurrentRenderTarget(this._posVar).texture;
  }

  show() { this.visible = this.mesh.visible = true;  }
  hide() { this.visible = this.mesh.visible = false; }

  dispose() {
    this.hide();
    this.mesh.geometry.dispose();
    this._mat.dispose();
    this._originTex.dispose();
    this.scene.remove(this.mesh);
  }
}

// ─── module-level instances ───────────────────────────────────────────────────
let _left  = null;
let _right = null;

function initSeraphs(renderer, scene) {
  _left  = new SeraphParticles(
    renderer, scene, -ORBIT_CX,
    new THREE.Color(0xff2200),  // intense red base
    new THREE.Color(0xFF3131)   // deep red fade
  );
  _right = new SeraphParticles(
    renderer, scene,  ORBIT_CX,
    new THREE.Color(0x0044ff),  // electric blue base
    new THREE.Color(0x55ccff)   // deep blue fade
  );
}

const seraphRed = {
  get visible() { return _left  ? _left.visible  : false; },
  show()        { _left?.show();  },
  hide()        { _left?.hide();  },
};

const seraphBlue = {
  get visible() { return _right ? _right.visible : false; },
  show()        { _right?.show(); },
  hide()        { _right?.hide(); },
};

function updateSeraphs(time) {
  _left?.update(time);
  _right?.update(time);
}

function showSeraphs() {
  _left?.show();
  _right?.show();
}

function hideSeraphs() {
  _left?.hide();
  _right?.hide();
}

export { initSeraphs, seraphRed, seraphBlue, updateSeraphs, showSeraphs, hideSeraphs };
