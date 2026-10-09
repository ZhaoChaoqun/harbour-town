# Harbour Town

An animated miniature harbour built with Blender and Three.js.

**Visit the harbour: https://zhaochaoqun.github.io/harbour-town/**

The harbour has three layers: foreground pleasure and market piers, the original
cafe/hotel/warehouse quay, and two canal-side neighbourhoods with ten additional
buildings. Setback terraces, balconies, different storey heights, copper-green
roofs, a clock house, rooftop planting, a pergola, and working roof details give
each block its own silhouette. Thirty-two grouped townspeople and six slow
pedestrians animate the markets and streets, alongside two additional moored boats.

The original 26 flying gulls, two bobbing boats, 38 fluttering pennants, four
moving linens, reflective water, and chimney smoke remain. The ten-cabin Ferris
wheel turns once per 120 simulated seconds; its cabins stay upright. All old
and new motion uses the same pausable clock.
The gulls occupy three depths: 10 rear, 8 middle, and 8 larger foreground birds
flying lower over the water. Seeded random waypoints guide forward flight, with
limited turns and climbs, coordinated banking, and tower/crane/wheel avoidance.
Seeded multiscale water normals create natural motion, with calmer water beside
the quay and subtle ripples around the buoys and fishing boat. The market-side
buoy and its ripple sit outside the new timber pier.

Early dusk is the default: warm, varied interiors and wheel lights contrast
with a blue-grey sky and quieter, deeper water. Daylight keeps the shops, cafe,
and some homes visibly warm, rather than turning every window off. Unlit windows
and three interior brightness levels preserve contrast without excessive bloom.

## Controls

Drag to orbit, scroll to zoom, and right-drag to pan. On touchscreens, drag to
orbit and use two fingers to zoom or pan. The toolbar controls animation,
lighting, camera reset, image capture, and fullscreen.
The lighting button initially reads **日间** because dusk is active. Reset
selects a closer, lower desktop overview or a separate, larger portrait
composition. Resizing follows the home composition until you orbit, zoom, or pan;
manual views remain under your control until reset.

## Build and preview locally

Use Node.js 24 or later and npm:

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:4179/harbour-town/**. The preview server binds only to
loopback and serves the built `dist/` directory under the same project path as
GitHub Pages. Set `PORT` to choose a different local port. Rebuild after changing
the source files, then refresh the browser.

The deterministic build copies `index.html`, `viewer.js`, the procedural scene
modules, and the exported `assets/harbour_town.glb` into `dist/`. It also bundles
the pinned Three.js
**0.180.0** core modules, addons, and MIT license under `dist/vendor/`. There
are no runtime CDN requests, external model downloads, or paid services.
Do not open the HTML as a `file://` URL: the browser needs HTTP to load modules
and the model.

Run `npm run check:flight` to simulate each of the 26 birds for 180 seconds and
check head-to-motion alignment, positive speed, turn/bank/climb limits, and tower
and Ferris wheel clearance. The Pages workflow runs this check before building.

Run `npm run check:wheel` to check the complete rotation, upright instanced
cabins, platform/rim clearance, pause-time stability, lighting, and the open
quay-to-pier entrance.

Run `npm run check:harbour` to check building/platform spacing, all three quay
entrances against the actual GLB, walking-path/furniture/person clearance over
240 simulated seconds, pause-time stability, boat clearance, daytime lighting,
and geometry/batch budgets.

## Publishing

Pushes to `main` run the GitHub Actions Pages workflow. It installs dependencies
with `npm ci`, builds the static distribution, and deploys only `dist/` to
GitHub Pages. The source, approximately 9.2 MB GLB, and published site are public.
The workflow can also be started manually from the Actions tab.

## Rendering and attribution

A modern browser with WebGL support is required. Fullscreen availability depends
on the browser. Realtime lighting approximates the original Blender scene rather
than reproducing a Cycles render pixel for pixel. Exported procedural surfaces use
base PBR colors with subtle vertex-color variation added by the viewer.
The original GLB is unchanged. The wheel/pier (`ferris-wheel.js`) and new
neighbourhoods, furnishings, people, and boats (`harbour-expansion.js`) are native
Three.js models; no Blender re-export or external textures are needed.
`harbour-layout.js` holds the authored buildings, platforms, walking routes and
flight clearances. `harbour-modeling.js` shares geometry batching and quay
entrance helpers; `harbour-lighting.js` pairs sky, material, emission and water
profiles for day/dusk.

Fixed parts are batched by material, while cabins, bulbs and people are instanced.
Moving groups stay outside GLB static batching. Emissive fixtures provide the
small lights; only four area-of-interest point lights are added to the original
eleven quay lanterns. The renderer retains soft 2048px shadows, 1024px Water
reflections, SMAA and a maximum device pixel ratio of 1.5.

[Three.js](https://threejs.org/) is distributed under the MIT license. Its
copyright notice and full license are included in every build at
[`vendor/LICENSE`](https://zhaochaoqun.github.io/harbour-town/vendor/LICENSE).
