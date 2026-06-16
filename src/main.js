import * as THREE from 'three';
import { EffectComposer }      from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }          from 'three/addons/postprocessing/RenderPass.js';
import { GlitchPass }          from 'three/addons/postprocessing/GlitchPass.js';
import { UnrealBloomPass }     from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass }      from 'three/addons/postprocessing/AfterimagePass.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { OutputPass }          from 'three/addons/postprocessing/OutputPass.js';
import { DotScreenPass }        from 'three/addons/postprocessing/DotScreenPass.js';
import { ShaderPass }           from 'three/addons/postprocessing/ShaderPass.js';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';

import { starField, starLayers, midLayer, fgLayer, milkyWay } from './shaders/stars.js';
//import { nebulaMat, nebulaQuad }                               from './shaders/nebula.js';
import { initSeraphs, seraphRed, seraphBlue, updateSeraphs } from './shaders/seraphs.js'
import { renderNarrativeSection, revealLines }                 from './scenes/narrative.js';
import { onScroll }                                            from './scenes/scroll.js';
import { state }                                               from './state.js';
import { startSpringDemo, endSpringDemo, handleSpringKeydown } from './scenes/spring.js';
import { startEarthSection, endEarthSection, preloadEarthModels } from './scenes/earth.js';
import {
  preloadAudio, unlockAudio,
  playIFloat, crossfadeToRSong, fadeOutRSong,
  playTurbulence, stopAllMusic,
  playHover, playRiser,
} from './audio.js';

preloadEarthModels();
/* ═══════════════════════════════════════════
   SCENE SETUP
═══════════════════════════════════════════ */
export const scene    = new THREE.Scene();
export const camera   = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });

const beginScreen = document.getElementById('begin-screen');
const beginBtn    = document.getElementById('begin-btn');
 
beginBtn.addEventListener('click', async () => {
  await unlockAudio();  // ← handles everything internally
  preloadAudio();
  beginScreen.classList.add('fade-out');
  setTimeout(() => { beginScreen.style.display = 'none'; }, 1500);
  playIFloat();
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('canvas-container').appendChild(renderer.domElement);
renderer.domElement.style.opacity = '0';
renderer.domElement.style.transition = 'opacity 2s ease';
camera.position.set(0, 0, 0);
initSeraphs(renderer, scene);
console.log('Seraphs initialized:', seraphRed, seraphBlue);

// Lights
const pointLight = new THREE.PointLight(0xffffff, 100);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);
const ambientLight = new THREE.AmbientLight(0x111133, 2);
scene.add(ambientLight);

// Add all scene objects
scene.add(starField);
//scene.add(nebulaQuad);

/* ═══════════════════════════════════════════
   SPRING DEMO — INSTANCED BALLS
   (kept here so ballMesh can be exported to spring.js)
═══════════════════════════════════════════ */
export const numBalls = 2000;
const ballGeo  = new THREE.SphereGeometry(0.1, 16, 16);
const ballMat  = new THREE.MeshStandardMaterial({ roughness: 0.1, metalness: 1 });
export const ballMesh = new THREE.InstancedMesh(ballGeo, ballMat, numBalls);
const dummy  = new THREE.Object3D();
const matrix = new THREE.Matrix4();
const colorV = new THREE.Color();
for (let i = 0; i < numBalls; i++) {
  const angle  = Math.random() * Math.PI * 2;
  const radius = 3 + Math.random() * 4;
  const z      = Math.random() * 100 - 50;
  dummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, z);
  dummy.updateMatrix();
  ballMesh.setMatrixAt(i, dummy.matrix);
  colorV.setHSL(Math.random(), 0.7, 0.5);
  ballMesh.setColorAt(i, colorV);
}
ballMesh.visible = false;
scene.add(ballMesh);

/* ═══════════════════════════════════════════
   POST PROCESSING
   pixelatedPass + afterPass: spring-only (toggled in spring.js)
   bloomPass: spring-only by default, B key toggles
   glitchPass: spring-only, G key toggles
═══════════════════════════════════════════ */
export const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

export const pixelatedPass = new RenderPixelatedPass(2, scene, camera);
pixelatedPass.enabled = false;
composer.addPass(pixelatedPass);

export const afterPass = new AfterimagePass();
afterPass.uniforms['damp'].value = 0.95;
afterPass.enabled = false;
composer.addPass(afterPass);

export const glitchPass = new GlitchPass();
glitchPass.enabled = false;
composer.addPass(glitchPass);

export const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85
);
bloomPass.enabled   = false;
bloomPass.threshold = 0;
bloomPass.strength  = 1.5;
bloomPass.radius    = 0;
composer.addPass(bloomPass);

export const dotScreenPass = new DotScreenPass();
dotScreenPass.enabled = false;
composer.addPass(dotScreenPass);
 
export const afterimagePass = new AfterimagePass();
afterimagePass.uniforms['damp'].value = 0.92;
afterimagePass.enabled = false;
composer.addPass(afterimagePass);
 
export const hBlurPass = new ShaderPass(HorizontalBlurShader);
hBlurPass.uniforms['h'].value = 1 / window.innerWidth;
hBlurPass.enabled = false;
composer.addPass(hBlurPass);

composer.addPass(new OutputPass());

/* ═══════════════════════════════════════════
   KEY INTERACTIONS
═══════════════════════════════════════════ */
window.addEventListener('keydown', e => {
  handleSpringKeydown(e.key.toLowerCase());

    // DEV SHORTCUT
  if (e.key.toLowerCase() === 'p') {
    state.phase = 'narrative';  // satisfies any phase checks
    startEarthSection();
  }
});

/* ═══════════════════════════════════════════
   MAIN ANIMATE LOOP
═══════════════════════════════════════════ */
let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 0.01;

  // Slowly rotate starfield
  starField.rotation.y = time * 0.008;
  starField.rotation.x = Math.sin(time * 0.003) * 0.02;

  // Drive nebula + star shader uniforms
  //nebulaMat.uniforms.uTime.value = time;
  starLayers.forEach(m => { m.uniforms.uTime.value = time; });

  // Camera subtle drift during narrative/choice
  if (state.phase === 'narrative' || state.phase === 'choice') {
    camera.position.x = Math.sin(time * 0.12) * 0.06;
    camera.position.y = Math.cos(time * 0.09) * 0.04;
  }

  // Spring ball tunnel animation
  if (state.phase === 'spring') {
    for (let i = 0; i < numBalls; i++) {
      ballMesh.getMatrixAt(i, matrix);
      dummy.matrix.copy(matrix);
      dummy.position.setFromMatrixPosition(dummy.matrix);
      dummy.position.z += 0.1;
      if (dummy.position.z > 50) dummy.position.z = -50;
      dummy.updateMatrix();
      ballMesh.setMatrixAt(i, dummy.matrix);
    }
    ballMesh.instanceMatrix.needsUpdate = true;
  }

  // Seraph float + trail animation
   updateSeraphs(time);

  composer.render();
  console.log('Seraph visible:', seraphRed.visible, seraphBlue.visible);
}

/* ═══════════════════════════════════════════
   RESIZE
═══════════════════════════════════════════ */
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  composer.setSize(window.innerWidth, window.innerHeight);
  //nebulaMat.uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
});

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
const scrollDriver = document.getElementById('scroll-driver');
scrollDriver.classList.add('active');
scrollDriver.addEventListener('scroll', onScroll);
setTimeout(() => {
  scrollDriver.scrollTop = 0;
  state.lastScrollY = 0;
}, 100);

renderNarrativeSection(0);
revealLines(0);
animate();
