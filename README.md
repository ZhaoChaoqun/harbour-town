# Harbour Town

An animated miniature harbour built with Blender and Three.js.

**Visit the harbour: https://zhaochaoqun.github.io/harbour-town/**

The scene features 26 flying gulls, two bobbing boats, 38 fluttering pennants,
four moving linens, reflective water, and chimney smoke. Orbit, zoom, and pan
around the town; pause its motion, switch between daylight and dusk, reset the
camera, save a PNG, or enter fullscreen.
The gulls occupy three depths: 10 rear, 8 middle, and 8 larger foreground birds
flying lower over the water. Seeded random waypoints guide forward flight, with
limited turns and climbs, coordinated banking, and tower/crane avoidance.
Seeded multiscale water normals create natural motion, with calmer water beside
the quay and subtle ripples around the buoys and fishing boat.

The default view is a handmade miniature harbour at early dusk: a warm, low
side light and restrained sky fill draw attention to the cafe and main hotel.
Cream plaster, oxidized-teal roofs, subdued warehouse surfaces, and amber lights
contrast with the blue-grey sky and darker blue-teal water. Soft cast shadows and
quiet, irregular reflections keep the scene sharp and readable even when paused.
The closer, lower camera fits the architecture and building reflections at both
wide and narrow aspect ratios. No new models or depth-of-field blur are added.

## Controls

Drag to orbit, scroll to zoom, and right-drag to pan. On touchscreens, drag to
orbit and use two fingers to zoom or pan. The toolbar controls animation,
lighting, camera reset, image capture, and fullscreen.
The lighting button offers **daylight** initially because dusk is already active;
switching modes adjusts the sky, fill/key lights, window emission, and reflections
together. The gesture hint fades after interaction.

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

The deterministic build copies `index.html`, `viewer.js`, and the exported
`assets/harbour_town.glb` into `dist/`. It also bundles the pinned Three.js
**0.180.0** core modules, addons, and MIT license under `dist/vendor/`. There
are no runtime CDN requests, external model downloads, or paid services.
Do not open the HTML as a `file://` URL: the browser needs HTTP to load modules
and the model.

Run `npm run check:flight` to simulate each of the 26 birds for 180 seconds and
check head-to-motion alignment, positive speed, turn/bank/climb limits, and tower
clearance. The Pages workflow runs this check before building.

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

[Three.js](https://threejs.org/) is distributed under the MIT license. Its
copyright notice and full license are included in every build at
[`vendor/LICENSE`](https://zhaochaoqun.github.io/harbour-town/vendor/LICENSE).
