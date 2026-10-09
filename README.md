# Harbour Town

An animated miniature harbour built with Blender and Three.js.

**Visit the harbour: https://zhaochaoqun.github.io/harbour-town/**

The scene features a connected left-hand pleasure pier with a ten-cabin Ferris
wheel, 26 flying gulls, two bobbing boats, 38 fluttering pennants, four moving
linens, reflective water, and chimney smoke. The wheel completes a turn in 120
simulated seconds; its cabins remain upright and pause with the harbour.
Orbit, zoom, and pan
around the town; pause its motion, switch between daylight and dusk, reset the
camera, save a PNG, or enter fullscreen.
The gulls occupy three depths: 10 rear, 8 middle, and 8 larger foreground birds
flying lower over the water. Seeded random waypoints guide forward flight, with
limited turns and climbs, coordinated banking, and tower/crane avoidance.
Seeded multiscale water normals create natural motion, with calmer water beside
the quay and subtle ripples around the buoys and fishing boat.

## Controls

Drag to orbit, scroll to zoom, and right-drag to pan. On touchscreens, drag to
orbit and use two fingers to zoom or pan. The toolbar controls animation,
lighting, camera reset, image capture, and fullscreen.

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

The deterministic build copies `index.html`, `viewer.js`, `ferris-wheel.js`, and the exported
`assets/harbour_town.glb` into `dist/`. It also bundles the pinned Three.js
**0.180.0** core modules, addons, and MIT license under `dist/vendor/`. There
are no runtime CDN requests, external model downloads, or paid services.
Do not open the HTML as a `file://` URL: the browser needs HTTP to load modules
and the model.

Run `npm run check:flight` to simulate each of the 26 birds for 180 seconds and
check head-to-motion alignment, positive speed, turn/bank/climb limits, and tower
clearance. The Pages workflow runs this check before building.

Run `npm run check:wheel` to check the complete rotation, upright instanced
cabins, platform/rim clearance, pause-time stability, lighting, and the open
quay-to-pier entrance.

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
The wheel and timber pier are modeled procedurally in `ferris-wheel.js`; they do
not require a Blender re-export or textures. Fixed parts are batched by material,
cabins and bulbs are instanced, and the animated wheel stays separate from GLB
static batching. Small emissive bulbs respond to dusk without adding point
lights or changing the existing quay lanterns.

[Three.js](https://threejs.org/) is distributed under the MIT license. Its
copyright notice and full license are included in every build at
[`vendor/LICENSE`](https://zhaochaoqun.github.io/harbour-town/vendor/LICENSE).
