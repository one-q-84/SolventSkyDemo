// ── Nebula background shader ──
// Edit fragment shader colors and mask parameters to change nebula appearance.
// Key values:
//   maskDist stretch factors (1.6, 2.2) — shape of the oval
//   smoothstep(0.38 ..., 0.12 ...) — how far it extends from center
//   bgCol — the pure background color outside the nebula
//   Color layer vec3 values — each layer's hue contribution

import * as THREE from 'three';

// ── NEBULA BACKGROUND — lives in main scene at renderOrder -999 ──
// The clip-space trick (gl_Position.w=1.0) bypasses MVP transforms entirely.
// Must be in the *main* scene so EffectComposer captures it.

const nebulaMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) } },
  vertexShader: `
    void main() { gl_Position = vec4(position.xy, 1.0, 1.0); }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec2  uRes;

    // -- Noise primitives --
    vec3 hash3(vec2 p) {
      vec3 q = vec3(dot(p,vec2(127.1,311.7)),
                    dot(p,vec2(269.5,183.3)),
                    dot(p,vec2(419.2,371.9)));
      return fract(sin(q)*43758.5453);
    }
    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f*f*(3.0-2.0*f);
      float a = dot(hash3(i         ).xy, vec2(1.0));
      float b = dot(hash3(i+vec2(1,0)).xy, vec2(1.0));
      float c = dot(hash3(i+vec2(0,1)).xy, vec2(1.0));
      float d = dot(hash3(i+vec2(1,1)).xy, vec2(1.0));
      return mix(mix(a,b,u.x), mix(c,d,u.x), u.y) * 0.5 + 0.5;
    }

    // Smooth FBM — 5 octaves
    float fbm(vec2 p) {
      float v=0.0, a=0.52;
      mat2 rot = mat2(0.8, 0.6, -0.6, 0.8); // rotate each octave to avoid axis bias
      for(int i=0;i<5;i++){
        v += a * vnoise(p);
        p  = rot * p * 2.03;
        a *= 0.48;
      }
      return v;
    }

    // Domain-warped FBM — one warp pass is enough, avoids grid artifacts
    float nebula(vec2 p) {
      vec2 q = vec2(fbm(p + vec2(0.0,  0.0)),
                    fbm(p + vec2(5.2,  1.3)));
      return fbm(p + 2.8 * q + vec2(uTime * 0.006, uTime * 0.004));
    }

    // Bright star cluster: radial glow
    float starCluster(vec2 uv, vec2 center, float radius) {
      float d = length(uv - center);
      return exp(-d * d / (radius * radius));
    }

    void main() {
      // NDC → UV [0,1]
      vec2 uv = gl_FragCoord.xy / uRes.xy;
      float aspect = uRes.x / uRes.y;
      // Centered coordinates [-1,1] with aspect correction
      vec2 centered = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

      // ── Radial mask — oblong, irregular, center 30% only ──
      // Stretch x more than y for an irregular horizontal oval
      float maskDist = length(vec2(centered.x * 1.6, centered.y * 2.0));
      // Add FBM-driven edge irregularity so it's not a perfect ellipse
      float edgeNoise = fbm(centered * 3.8 + vec2(1.1, 2.7)) * 0.12;
      float mask = smoothstep(0.38 + edgeNoise, 0.12, maskDist);
      // Additional soft inner falloff — denser at true center
      float coreMask = smoothstep(0.22, 0.0, maskDist) * 0.6;

      // Background is near-black with the faintest teal hint
      vec3 bgCol = vec3(0.004, 0.006, 0.014);

      if (mask < 0.001) {
        gl_FragColor = vec4(bgCol, 1.0);
        return;
      }

      // Sample nebula only inside the mask region
      vec2 p  = vec2(uv.x * aspect, uv.y) * 1.8;
      float f  = nebula(p);
      float f2 = nebula(p * 1.7 + vec2(3.1, 7.4));
      float f3 = nebula(p * 0.6 + vec2(1.2, 2.8));

      vec3 col = vec3(0.0);

      // Deeply crushed colors — max brightness ~0.08 before masking
      col += vec3(0.005, 0.008, 0.030) * f3;
      col += vec3(0.008, 0.018, 0.065) * smoothstep(0.42, 0.72, f3);
      col += vec3(0.040, 0.008, 0.070) * smoothstep(0.52, 0.82, f);
      col += vec3(0.000, 0.055, 0.075) * smoothstep(0.58, 0.86, f2);
      col += vec3(0.065, 0.018, 0.028) * smoothstep(0.62, 0.90, f) * f2;
      col += vec3(0.055, 0.008, 0.045) * smoothstep(0.68, 0.94, f2);
      col += vec3(0.012, 0.055, 0.130) * smoothstep(0.78, 0.97, f * f2);

      // Subtle bright core — just a hint, not a white blotch
      float clust = starCluster(uv, vec2(0.50, 0.50), 0.06);
      col += vec3(0.06, 0.08, 0.14) * clust;

      // Apply mask — nebula fades to near-black at edges
      col = mix(bgCol, col, mask);
      col += bgCol * (1.0 - mask); // ensure edges are true bg color
      col += vec3(0.006, 0.010, 0.022) * coreMask; // faint core brightening

      gl_FragColor = vec4(col, 1.0);
    }
  `,
  depthTest:  false,
  depthWrite: false,
});

// Fullscreen clip-space triangle (covers entire NDC without seams)
const nebulaGeo = new THREE.BufferGeometry();
nebulaGeo.setAttribute('position', new THREE.BufferAttribute(
  new Float32Array([-1,-1,0, 3,-1,0, -1,3,0]), 3
));
const nebulaQuad = new THREE.Mesh(nebulaGeo, nebulaMat);
nebulaQuad.frustumCulled    = false;
nebulaQuad.renderOrder      = -999;
nebulaQuad.matrixAutoUpdate = false;

window.addEventListener('resize', () => {
  nebulaMat.uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
});

export { nebulaMat, nebulaQuad };
