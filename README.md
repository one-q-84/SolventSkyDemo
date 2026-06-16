# Beneath The Solvent Sky — Demo

Scroll-based narrative Three.js demo. Prologue to the game.

---

## Setup

```bash
# 1. Install dependencies (requires Node.js 18+)
npm install

# 2. Start dev server with hot reload
npm run dev
# → opens at http://localhost:5173

# 3. Build for production
npm run build
# → output in /dist
```

---

## File Map

```
src/
├── main.js                 ← Entry point. Scene, renderer, post-processing,
│                             animate loop, resize, init.
├── state.js                ← Shared mutable state (phase, section, scroll).
│                             All modules import from here.
├── style.css               ← All CSS. Typography, overlays, animations.
│
├── data/
│   └── story.js            ← STORY_SECTIONS (all narrative lines + triggers)
│                             EARTH_OBJECTS (5 placeholder descriptions + colors)
│
├── shaders/
│   ├── stars.js            ← Star system: 4 layers, 3 GLSL shaders,
│   │                         buildStarLayer factory, color palettes.
│   ├── nebula.js           ← Nebula background quad. Domain-warped FBM shader.
│   └── seraphs.js          ← createSeraph(). MeshPhysicalMaterial glass core
│                             + glow shells + curl-noise fluid trail particles.
│
└── scenes/
    ├── narrative.js        ← renderNarrativeSection(), revealLines()
    ├── scroll.js           ← onScroll(), advanceLine(), checkSectionTrigger()
    ├── spring.js           ← startSpringDemo(), endSpringDemo()
    ├── earth.js            ← initEarthScene(), startEarthSection(), endEarthSection()
    ├── ending.js           ← showChoice(), triggerNoEnding(), triggerYesEnding()
    ├── seraphs-state.js    ← updateSeraphs(), hideSeraphs(), showSeraphs()
    └── utils.js            ← hideStarCanvas(), showStarCanvas(),
                              hideScrollIndicator(), clearNarrativeText()
```

---

## Common Customisations

| What you want to change | File | What to edit |
|---|---|---|
| Story text | `src/data/story.js` | `STORY_SECTIONS[n].lines` |
| Earth object names/descriptions | `src/data/story.js` | `EARTH_OBJECTS` array |
| Star density / size / color | `src/shaders/stars.js` | `buildStarLayer()` call args + palette functions |
| Star twinkle speed | `src/shaders/stars.js` | `STAR_VERT` — the `sin()` twinkle expression |
| Nebula shape / color / darkness | `src/shaders/nebula.js` | Mask `smoothstep` values + color `vec3` layers |
| Seraph glass appearance | `src/shaders/seraphs.js` | `MeshPhysicalMaterial` block in `createSeraph()` |
| Seraph trail density / size | `src/shaders/seraphs.js` | `trailCount`, `aSz` range, `FLUID_VERT` seed/drift |
| Spring demo duration | `src/scenes/spring.js` | `springSecondsLeft = 30` |
| Earth section duration | `src/scenes/earth.js` | `earthSecondsLeft = 60` |
| Scroll sensitivity | `src/scenes/scroll.js` | `SCROLL_PER_LINE = 90` |
| Yes ending timing / intensity | `src/scenes/ending.js` | Timeline in `triggerYesEnding()` |
| Chromatic aberration strength | `src/scenes/ending.js` | `shift` variable (default max 28px) |
| No ending fade duration | `src/scenes/ending.js` | `setInterval` × `0.01` opacity = 100s |
| Post-processing passes | `src/main.js` | `pixelatedPass`, `afterPass`, `bloomPass` |
| Camera drift | `src/main.js` | `animate()` — camera position sin/cos values |
| Seraph positions in space | `src/shaders/seraphs.js` | `seraphRed.position`, `seraphBlue.position` |

// ── main.js — scene setup, renderer, post-processing, animate loop ──
// This is the entry point. Vite loads this from index.html.
//
// What lives here:
//   - THREE.Scene, Camera, WebGLRenderer
//   - Post-processing composer chain
//   - Spring demo instanced ball mesh
//   - Main animate() loop
//   - Window resize handler
//   - Init call
//
// What lives in other files:
//   src/shaders/stars.js     — star layers and nebula
//   src/shaders/nebula.js    — nebula background quad
//   src/shaders/seraphs.js   — seraph creation and fluid trails
//   src/scenes/spring.js     — SpringIntoTheNight sequence
//   src/scenes/earth.js      — Earth objects interactive section
//   src/scenes/ending.js     — Choice, no ending, yes ending
//   src/scenes/narrative.js  — Text reveal system
//   src/scenes/scroll.js     — Scroll handling and section progression
//   src/scenes/utils.js      — hideStarCanvas, clearNarrativeText, etc.
//   src/scenes/seraphs-state.js — Seraph fade/visibility management
//   src/data/story.js        — STORY_SECTIONS and EARTH_OBJECTS