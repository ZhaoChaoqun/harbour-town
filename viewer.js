import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Water } from 'three/addons/objects/Water.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createFerrisWheel, connectPleasurePier, FERRIS_WHEEL } from './ferris-wheel.js';
import { createHarbourExpansion, connectHarbourExpansion } from './harbour-expansion.js';
import { createHarbourLighting } from './harbour-lighting.js';
import { architecturePoints, GULL_LAYERS, GULL_OBSTACLES } from './harbour-layout.js';

const status = document.querySelector('#status');
const statusText = document.querySelector('#status-text');
let dusk = true;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.info.autoReset = false;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#758791');
scene.fog = new THREE.FogExp2('#758791', 0.005);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 600);
const aim = new THREE.Vector3();
const framingPoints = architecturePoints().map(point => new THREE.Vector3().fromArray(point));
function fitCamera() {
  const portrait = camera.aspect < 1;
  aim.set(portrait ? -0.45 : -1.3, portrait ? 2.4 : 3.5, portrait ? -3.3 : -4);
  camera.fov = portrait ? 74 : 42;
  const azimuth = THREE.MathUtils.degToRad(portrait ? -40 : 30);
  const elevation = THREE.MathUtils.degToRad(portrait ? 30 : 16);
  const direction = new THREE.Vector3(
    Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation)
  );
  camera.clearViewOffset();
  const shift = portrait ? innerHeight * 0.11 : 0;
  if (portrait) camera.setViewOffset(innerWidth, innerHeight, 0, shift, innerWidth, innerHeight);
  camera.updateProjectionMatrix();
  const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
  const up = new THREE.Vector3().crossVectors(direction, right);
  const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const horizontal = tangent * camera.aspect * (portrait ? 0.97 : 0.92);
  const top = tangent * Math.max(0.28, 1 - 2 * ((innerWidth <= 600 ? 90 : 112) + shift) / innerHeight);
  const bottom = tangent * Math.max(0.35, 1 - 2 * (112 - shift) / innerHeight);
  let distance = portrait ? 24 : 30;
  for (const point of framingPoints) {
    const offset = point.clone().sub(aim);
    const vertical = offset.dot(up);
    distance = Math.max(distance, offset.dot(direction) + Math.max(
      Math.abs(offset.dot(right)) / horizontal, vertical >= 0 ? vertical / top : -vertical / bottom
    ));
  }
  camera.position.copy(aim).addScaledVector(direction, distance);
}
fitCamera();
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(aim);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 18;
controls.maxDistance = 150;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minPolarAngle = Math.PI * 0.13;
controls.update();
let cameraAdjusted = false;
controls.addEventListener('start', () => { cameraAdjusted = true; });
function resetHomeView() {
  const damping = controls.enableDamping;
  controls.enableDamping = false;
  controls.update();
  fitCamera();
  controls.target.copy(aim);
  controls.update();
  controls.enableDamping = damping;
}
function frameArchitecture(root) {
  framingPoints.length = 0;
  framingPoints.push(...architecturePoints(false).map(point => new THREE.Vector3().fromArray(point)));
  root.updateMatrixWorld(true);
  root.traverse(obj => {
    if (!obj.isMesh) return;
    for (let ancestor = obj; ancestor && ancestor !== root; ancestor = ancestor.parent) {
      if (ancestor.name.includes('animated_flight')) return;
    }
    if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
    const bounds = obj.geometry.boundingBox;
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          framingPoints.push(new THREE.Vector3(x, y, z).applyMatrix4(obj.matrixWorld));
        }
      }
    }
  });
  if (!cameraAdjusted) resetHomeView();
}

const ambient = new THREE.HemisphereLight('#a6bbd0', '#6a5c4c', 0.48);
scene.add(ambient);
const sun = new THREE.DirectionalLight('#ffcf9b', 1.45);
sun.position.set(-19, 15, 13);
sun.target.position.set(-1.5, 2, -6);
scene.add(sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -32;
sun.shadow.camera.right = sun.shadow.camera.top = 32;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 95;
sun.shadow.bias = -0.00012;
sun.shadow.normalBias = 0.02;
scene.add(sun);
const rim = new THREE.DirectionalLight('#91aecb', 0.5);
rim.position.set(10, 18, -22);
scene.add(rim);

// Small, deterministic normal texture; no external images or CDN requests.
function waterNormals() {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const heights = new Float32Array(size * size);
  const wrap = (value, limit) => (value % limit + limit) % limit;
  const hash = (x, y, grid) => {
    let n = Math.imul(wrap(x, grid) + 17, 374761393)
      ^ Math.imul(wrap(y, grid) + 43, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const noise = (u, v, grid) => {
    const px = u * grid, py = v * grid;
    const x = Math.floor(px), y = Math.floor(py);
    const tx = px - x, ty = py - y;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = hash(x, y, grid), b = hash(x + 1, y, grid);
    const c = hash(x, y + 1, grid), d = hash(x + 1, y + 1, grid);
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let height = 0;
      for (let octave = 0; octave < 5; octave++) {
        height += noise(x / size, y / size, 4 * 2 ** octave) * 0.42 ** (octave + 1);
      }
      heights[y * size + x] = height;
    }
  }
  const heightAt = (x, y) => heights[wrap(y, size) * size + wrap(x, size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (heightAt(x + 1, y) - heightAt(x - 1, y)) * 9;
      const dy = (heightAt(x, y + 1) - heightAt(x, y - 1)) * 9;
      const length = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      data[i] = Math.round((dx / length + 1) * 127.5);
      data[i + 1] = Math.round((dy / length + 1) * 127.5);
      data[i + 2] = Math.round((1 / length + 1) * 127.5);
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
const water = new Water(new THREE.PlaneGeometry(1000, 1000), {
  textureWidth: 1024, textureHeight: 1024,
  waterNormals: waterNormals(), sunDirection: sun.position.clone().normalize(),
  sunColor: '#d9ba90', waterColor: '#123f50', distortionScale: 0.65, fog: true,
});
water.rotation.x = -Math.PI / 2;
water.position.y = -0.1;
water.material.uniforms.size.value = 5.5;
const noiseSample = 'vec4 noise = getNoise( worldPosition.xz * size );';
if (!water.material.fragmentShader.includes(noiseSample)) {
  throw new Error('Three.js water shader no longer exposes the expected normal sampling hook');
}
water.material.fragmentShader = water.material.fragmentShader.replace(
  'void main() {',
  `vec2 harbourRipple(vec2 p, vec2 center, float phase) {
    vec2 delta = p - center;
    float distance = length(delta);
    float envelope = smoothstep(0.12, 0.35, distance) * exp(-distance * 1.1);
    float pulse = cos(distance * 13.0 - time * 8.0 + phase) * envelope * 0.020;
    return delta / max(distance, 0.01) * pulse;
  }
  void main() {`
).replace(noiseSample, `
  vec2 samplePosition = worldPosition.xz * size;
  // Distinct rotated scales drift coherently instead of changing at random per frame.
  mat2 rotation = mat2(0.8, -0.6, 0.6, 0.8);
  vec4 noise = getNoise(samplePosition) * 0.68
    + getNoise(rotation * samplePosition * 1.71 + vec2(27.0, -19.0)) * 0.32;
  float shoreBand = 1.0 - smoothstep(14.0, 20.0, abs(worldPosition.x));
  float shoreCalm = mix(1.0, 0.40 + 0.60 * smoothstep(0.3, 6.0,
    abs(worldPosition.z - 1.55)), shoreBand);
  float distantCalm = mix(0.90, 0.36, smoothstep(25.0, 100.0, length(worldPosition.xz)));
  noise.xy *= shoreCalm * distantCalm;
  noise.xy += harbourRipple(worldPosition.xz, vec2(-7.3, 12.6), 0.0)
    + harbourRipple(worldPosition.xz, vec2(8.0, 7.0), 1.8)
    + harbourRipple(worldPosition.xz, vec2(-12.2, 5.2), 3.1)
    + harbourRipple(worldPosition.xz, vec2(-11.3, 4.4), 0.7);
`);
scene.add(water);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.26, 0.5, 1.15);
composer.addPass(bloom);
composer.addPass(new SMAAPass());
composer.addPass(new OutputPass());
const lighting = createHarbourLighting({ renderer, scene, ambient, sun, rim, bloom, water });
const gulls = [];
const boats = [];
const pennants = [];
const linens = [];
const smokeSprites = [];
let playing = true;
let elapsed = 0;
let ferrisWheel;
let harbourExpansion;
const clock = new THREE.Clock();
const flightForward = new THREE.Vector3(0, 0, 1);
const flightEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const flightHeading = new THREE.Vector3();
const steeringTarget = new THREE.Vector3();

function flightNoise(time, seed) {
  const cell = Math.floor(time), t = time - cell;
  const random = index => {
    let n = Math.imul(index + 8192, 374761393) ^ Math.imul(seed + 23, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295 * 2 - 1;
  };
  const a = random(cell), difference = random(cell + 1) - a;
  return {
    value: a + difference * t * t * (3 - 2 * t),
    slope: difference * 6 * t * (1 - t),
  };
}

function chooseFlightTarget(entry, time) {
  const waypoint = ++entry.waypoint;
  const random = channel => (flightNoise(waypoint * 11 + channel, entry.seed * 97).value + 1) / 2;
  const bounds = entry.bounds;
  entry.target.set(
    -12 + random(0) * 24,
    bounds.minY + 0.5 + random(1) * (bounds.maxY - bounds.minY - 1),
    bounds.minZ + 0.6 + random(2) * (bounds.maxZ - bounds.minZ - 1.2)
  );
  if (entry.target.distanceTo(entry.obj.position) < 5) {
    entry.target.x = (entry.obj.position.x > 0 ? -1 : 1) * (6 + random(3) * 5);
  }
  entry.nextTargetTime = time + 9 + random(4) * 7;
}

function flyGull(entry, time, delta) {
  if (delta <= 0) return;
  if (time >= entry.nextTargetTime || entry.obj.position.distanceTo(entry.target) < 1.4) {
    chooseFlightTarget(entry, time);
  }
  steeringTarget.copy(entry.target);
  const position = entry.obj.position;
  if (Math.abs(position.x) > 14) steeringTarget.x = Math.sign(position.x) * 6;
  if (position.z < entry.bounds.minZ + 0.4 || position.z > entry.bounds.maxZ - 0.4) {
    steeringTarget.z = (entry.bounds.minZ + entry.bounds.maxZ) / 2;
  }
  flightHeading.subVectors(steeringTarget, position);
  for (const obstacle of GULL_OBSTACLES) {
    const dx = position.x - obstacle.x, dz = position.z - obstacle.z;
    const distance = Math.hypot(dx, dz);
    if (position.y < obstacle.height && distance < obstacle.warning) {
      const strength = (1 - distance / obstacle.warning) * 80;
      flightHeading.x += dx / Math.max(distance, 0.05) * strength;
      flightHeading.z += dz / Math.max(distance, 0.05) * strength;
    }
  }
  const desiredYaw = Math.atan2(flightHeading.x, flightHeading.z);
  const difference = Math.atan2(Math.sin(desiredYaw - entry.yaw), Math.cos(desiredYaw - entry.yaw));
  const desiredTurn = THREE.MathUtils.clamp(difference * 0.7, -0.6, 0.6);
  entry.turn += THREE.MathUtils.clamp(desiredTurn - entry.turn, -0.8 * delta, 0.8 * delta);
  entry.yaw += entry.turn * delta;
  let desiredPitch = THREE.MathUtils.clamp(
    Math.atan2(flightHeading.y, Math.hypot(flightHeading.x, flightHeading.z)), -0.16, 0.16
  );
  if (position.y < entry.bounds.minY + 0.2) desiredPitch = 0.16;
  if (position.y > entry.bounds.maxY - 0.2) desiredPitch = -0.16;
  entry.pitch += THREE.MathUtils.clamp(desiredPitch - entry.pitch, -0.07 * delta, 0.07 * delta);
  const desiredSpeed = 1.2 + flightNoise(time * 0.07 + entry.seed * 0.73, entry.seed * 13).value * 0.25;
  entry.speed += THREE.MathUtils.clamp(desiredSpeed - entry.speed, -0.15 * delta, 0.15 * delta);
  entry.bank = THREE.MathUtils.lerp(entry.bank, -entry.turn * 0.46, 1 - Math.exp(-delta * 3));
  entry.direction.set(
    Math.sin(entry.yaw) * Math.cos(entry.pitch), Math.sin(entry.pitch),
    Math.cos(entry.yaw) * Math.cos(entry.pitch)
  );
  position.addScaledVector(entry.direction, entry.speed * delta);
  flightEuler.set(-entry.pitch, entry.yaw, entry.bank, 'YXZ');
  entry.obj.quaternion.setFromEuler(flightEuler).multiply(entry.headingCorrection);
}

const smokeCanvas = document.createElement('canvas');
smokeCanvas.width = smokeCanvas.height = 64;
const smokeContext = smokeCanvas.getContext('2d');
const gradient = smokeContext.createRadialGradient(32, 32, 0, 32, 32, 32);
gradient.addColorStop(0, '#d8e2d5aa');
gradient.addColorStop(0.45, '#d8e2d540');
gradient.addColorStop(1, '#d8e2d500');
smokeContext.fillStyle = gradient;
smokeContext.fillRect(0, 0, 64, 64);
const smokeTexture = new THREE.CanvasTexture(smokeCanvas);
for (let i = 0; i < 16; i++) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: smokeTexture, transparent: true, opacity: 0.2,
    depthWrite: false, color: '#d1e0d8',
  }));
  smokeSprites.push(sprite);
  scene.add(sprite);
}

function addLocalLights(root) {
  root.updateMatrixWorld(true);
  const positions = [];
  root.traverse(obj => {
    if (obj.isMesh && /^Glowing_lantern/.test(obj.name)) {
      positions.push(obj.getWorldPosition(new THREE.Vector3()));
    }
  });
  for (const position of positions.slice(0, 11)) {
    const intensity = position.x < 5 ? 4.8 : 2.4;
    const lamp = new THREE.PointLight('#ffc17b', intensity, 4.2, 2);
    lamp.position.copy(position);
    lamp.position.y -= 0.12;
    scene.add(lamp);
    lighting.registerLamp(lamp, intensity);
  }
}

// Keep moving groups intact, but batch the thousands of tiny static model parts.
function batchStatic(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const removed = [];
  root.traverse(obj => {
    if (!obj.isMesh || obj.isInstancedMesh || obj.morphTargetInfluences || Array.isArray(obj.material)) return;
    let ancestor = obj;
    while (ancestor && ancestor !== root) {
      if (/animated_|Bunting_pennant|Wind_moving_laundry/.test(ancestor.name)) return;
      ancestor = ancestor.parent;
    }
    const geometry = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
    geometry.applyMatrix4(obj.matrixWorld);
    for (const name of Object.keys(geometry.attributes)) {
      if (name !== 'position' && name !== 'normal') geometry.deleteAttribute(name);
    }
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const underside = 0.84 + 0.16 * THREE.MathUtils.smoothstep(normals.getY(i), -0.55, -0.05);
      const shade = underside * (0.985 + 0.015 * Math.sin(x * 0.7 + z * 0.4 + y * 0.2));
      colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = shade;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.morphAttributes = {};
    if (!buckets.has(obj.material)) buckets.set(obj.material, []);
    buckets.get(obj.material).push(geometry);
    removed.push(obj);
  });
  for (const [material, geometries] of buckets) {
    const batchMaterial = material.clone();
    batchMaterial.vertexColors = true;
    lighting.registerClone(material, batchMaterial);
    const merged = mergeGeometries(geometries, false);
    if (!merged) throw new Error(`无法合并静态几何体：${material.name}`);
    const mesh = new THREE.Mesh(merged, batchMaterial);
    mesh.name = `Batched ${material.name}`;
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    geometries.forEach(geometry => geometry.dispose());
  }
  removed.forEach(obj => obj.removeFromParent());
}

function animateScene(time, delta) {
  water.material.uniforms.time.value = time * 0.14;
  ferrisWheel?.update(time);
  harbourExpansion?.update(time);
  gulls.forEach((entry, i) => {
    const seed = entry.seed;
    const phase = seed * 0.731;
    flyGull(entry, time, delta);
    const glide = flightNoise(time * 0.19 + phase + 1.2, seed * 7 + 4).value;
    const wingBeat = Math.sin(time * (3.0 + (seed % 5) * 0.32) + phase)
      * (0.18 + (glide + 1) * 0.23);
    entry.obj.traverse(child => {
      if (child.morphTargetInfluences?.length) {
        child.morphTargetInfluences[0] = wingBeat;
      }
    });
  });
  boats.forEach((entry, i) => {
    entry.obj.position.y = entry.base.y + Math.sin(time * 1.15 + i) * 0.035;
    entry.obj.rotation.z = Math.sin(time * 1.15 + i + 0.8) * 0.021;
    entry.obj.rotation.x = Math.sin(time * 0.8 + i) * 0.016;
  });
  pennants.forEach((entry, i) => {
    entry.obj.rotation.x = entry.base.x + Math.sin(time * 1.8 + i * 0.37) * 0.20;
  });
  linens.forEach((obj, i) => {
    obj.morphTargetInfluences[0] = Math.sin(time * 1.5 + i) * 0.7;
  });
  smokeSprites.forEach((sprite, i) => {
    const phase = (time * 0.08 + i / smokeSprites.length) % 1;
    sprite.position.set(-10.1 + phase * 0.65, 8.0 + phase * 2.5, -2.4 - phase * 0.18);
    sprite.scale.setScalar(0.20 + phase * 0.60);
    sprite.material.opacity = Math.sin(phase * Math.PI) * 0.19;
    sprite.material.rotation = phase * 0.8 + i;
  });
}

function showError(error) {
  console.error(error);
  status.classList.remove('hidden');
  statusText.textContent = `港湾未能载入：${error.message}。请检查网络连接后刷新。`;
  window.harbourState = { ready: false, error: error.message };
}

function setLighting() {
  lighting.apply(dusk);
  ferrisWheel?.setDusk(dusk);
  harbourExpansion?.setDusk(dusk);
  const button = document.querySelector('#time');
  button.textContent = dusk ? '日间' : '暮色';
  button.setAttribute('aria-pressed', String(dusk));
  button.classList.toggle('active', dusk);
}
setLighting();

new GLTFLoader().load('./assets/harbour_town.glb', gltf => {
  try {
    const root = gltf.scene;
    scene.add(root);
    root.updateMatrixWorld(true);
    const adjustedMaterials = new Set();
    root.traverse(obj => {
      if (obj.name.includes('animated_flight')) {
        const index = Number(obj.name.match(/Gull_(\d+)/)?.[1]) - 1;
        if (!Number.isInteger(index) || index < 0 || index >= 26) {
          throw new Error(`海鸟编号不正确：${obj.name}`);
        }
        const layer = index < 10 ? 'rear' : index < 18 ? 'middle' : 'front';
        if (layer === 'rear') {
          obj.position.y = 12.6 + (index % 4) * 0.4;
          obj.position.z = -18 + (index % 5) * 1.2;
        } else if (layer === 'middle') {
          obj.position.z = 1.7 + (index % 4) * 1.2;
          obj.position.y = 6.3 + (index % 5) * 0.42;
        } else if (layer === 'front') {
          obj.position.x = -12 + (index - 18) * 3.4;
          obj.position.z = 7.0 + (index % 4) * 1.8;
          obj.position.y = 4.6 + (index % 6) * 0.45;
          obj.scale.multiplyScalar(1.3);
        }
        const modelForward = flightForward.clone();
        obj.traverse(child => {
          if (child.name.startsWith('Gull_small_beak')) {
            modelForward.copy(child.position).normalize();
          }
        });
        const headingCorrection = new THREE.Quaternion().setFromUnitVectors(modelForward, flightForward);
        const bounds = GULL_LAYERS[layer];
        const entry = {
          obj, base: obj.position.clone(), layer, seed: index + 1,
          headingCorrection, modelForward, bounds,
          direction: modelForward.clone(), target: new THREE.Vector3(),
          yaw: Math.atan2(modelForward.x, modelForward.z), pitch: 0, bank: 0, turn: 0,
          speed: 1.0 + (index % 7) * 0.055, waypoint: 0, nextTargetTime: 0,
        };
        chooseFlightTarget(entry, 0);
        gulls.push(entry);
      } else if (obj.name.includes('animated_gentle_bobbing')) {
        boats.push({ obj, base: obj.position.clone() });
      } else if (obj.name.startsWith('Bunting_pennant')) {
        pennants.push({ obj, base: obj.rotation.clone() });
      } else if (obj.name.startsWith('Wind_moving_laundry') && obj.morphTargetInfluences) {
        linens.push(obj);
      }
      if (obj.isMesh) {
        obj.castShadow = obj.receiveShadow = true;
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of materials) {
          if (adjustedMaterials.has(mat)) continue;
          adjustedMaterials.add(mat);
          lighting.styleMaterial(mat);
        }
        const position = new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld);
        if (position.x > 7.2 && position.y > 2.7 && position.z < 1) {
          obj.material = Array.isArray(obj.material)
            ? obj.material.map(lighting.warehouseMaterial) : lighting.warehouseMaterial(obj.material);
        }
      }
    });
    if (gulls.length !== 26 || boats.length !== 2) {
      throw new Error(`动画分组不完整：${gulls.length} 只海鸥，${boats.length} 艘船`);
    }
    connectPleasurePier(root);
    connectHarbourExpansion(root);
    frameArchitecture(root);
    addLocalLights(root);
    batchStatic(root);
    ferrisWheel = createFerrisWheel();
    scene.add(ferrisWheel.group);
    harbourExpansion = createHarbourExpansion();
    scene.add(harbourExpansion.group);
    setLighting();
    status.classList.add('hidden');
    window.harbourState = {
      ready: true, gulls: gulls.length, boats: boats.length,
      pennants: pennants.length, linens: linens.length, time: 0,
      ferrisWheel: { gondolas: FERRIS_WHEEL.gondolas, revolutionSeconds: FERRIS_WHEEL.revolutionSeconds, angle: 0 },
      city: {
        buildings: harbourExpansion.buildings.length, districts: 2, stalls: 3,
        people: harbourExpansion.people.length + harbourExpansion.walkers.length,
        walkers: harbourExpansion.walkers.length, mooredBoats: harbourExpansion.boats.length,
      },
      birdLayers: {
        rear: gulls.filter(entry => entry.layer === 'rear').length,
        middle: gulls.filter(entry => entry.layer === 'middle').length,
        front: gulls.filter(entry => entry.layer === 'front').length,
      },
    };
  } catch (error) {
    showError(error);
  }
}, progress => {
  if (progress.total) statusText.textContent = `正在载入小镇… ${Math.round(progress.loaded / progress.total * 100)}%`;
}, showError);

document.querySelector('#motion').addEventListener('click', event => {
  playing = !playing;
  event.currentTarget.textContent = playing ? '暂停动画' : '播放动画';
  event.currentTarget.classList.toggle('active', playing);
  event.currentTarget.setAttribute('aria-pressed', String(playing));
});
document.querySelector('#time').addEventListener('click', () => {
  dusk = !dusk;
  setLighting();
});
document.querySelector('#reset').addEventListener('click', () => {
  cameraAdjusted = false;
  resetHomeView();
});
document.querySelector('#capture').addEventListener('click', () => {
  composer.render();
  const link = document.createElement('a');
  link.download = 'harbour-town-web.png';
  link.href = renderer.domElement.toDataURL('image/png');
  link.click();
});
document.querySelector('#fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch (error) {
    console.error('浏览器无法进入全屏：', error);
    statusText.textContent = `全屏操作失败：${error.message}`;
    status.classList.remove('hidden');
  }
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  if (cameraAdjusted) {
    camera.clearViewOffset();
    if (camera.aspect < 1) camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.11, innerWidth, innerHeight);
  }
  camera.updateProjectionMatrix();
  if (!cameraAdjusted) resetHomeView();
  renderer.setSize(innerWidth, innerHeight);
  renderer.getDrawingBufferSize(water.material.uniforms.harbourViewport.value);
  composer.setSize(innerWidth, innerHeight);
});
function frame() {
  requestAnimationFrame(frame);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (playing) elapsed += delta;
  animateScene(elapsed, playing ? delta : 0);
  controls.update();
  scene.fog.density = 0.005 * Math.min(1, 40 / camera.position.distanceTo(controls.target));
  renderer.info.reset();
  composer.render();
  if (window.harbourState?.ready) {
    window.harbourState.time = elapsed;
    window.harbourState.drawCalls = renderer.info.render.calls;
    window.harbourState.boatHeight = boats[0]?.obj.position.y;
    window.harbourState.waterTime = water.material.uniforms.time.value;
    window.harbourState.ferrisWheel.angle = ferrisWheel.rotor.rotation.z;
    window.harbourState.camera = camera.position.toArray();
    window.harbourState.lighting = dusk ? 'dusk' : 'day';
    window.harbourState.flightSnapshot = gulls.slice(0, 3).map(entry => ({
      position: entry.obj.position.toArray(), rotation: entry.obj.quaternion.toArray(),
    }));
    window.harbourState.flightChecks = {
      minimumForwardDot: Math.min(...gulls.map(entry =>
        flightHeading.copy(entry.modelForward).applyQuaternion(entry.obj.quaternion).dot(entry.direction))),
      maximumBank: Math.max(...gulls.map(entry => Math.abs(entry.bank))),
      maximumPitch: Math.max(...gulls.map(entry => Math.abs(entry.pitch))),
      maximumTurnRate: Math.max(...gulls.map(entry => Math.abs(entry.turn))),
      minimumSpeed: Math.min(...gulls.map(entry => entry.speed)),
    };
  }
}
frame();
