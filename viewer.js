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
function makeSky(top, horizon, ground) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, top);
  gradient.addColorStop(0.48, horizon);
  gradient.addColorStop(0.53, horizon);
  gradient.addColorStop(1, ground);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const skyTextures = {
  dusk: makeSky('#344b65', '#778490', '#243d4b'),
  day: makeSky('#6e8a9e', '#bac8ce', '#446374'),
};
const environmentGenerator = new THREE.PMREMGenerator(renderer);
const skyEnvironments = {
  dusk: environmentGenerator.fromEquirectangular(skyTextures.dusk),
  day: environmentGenerator.fromEquirectangular(skyTextures.day),
};
environmentGenerator.dispose();
scene.fog = new THREE.FogExp2('#778490', 0.006);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 600);
const start = new THREE.Vector3(17, 10.3, 31);
const aim = new THREE.Vector3(-1.4, 2.8, -0.4);
const framingBounds = new THREE.Box3(
  new THREE.Vector3(-15.1, -0.7, -6.5), new THREE.Vector3(15.9, 11.7, 7.9)
);
const framingPoints = [];
for (const x of [framingBounds.min.x, framingBounds.max.x]) {
  for (const y of [framingBounds.min.y, framingBounds.max.y]) {
    for (const z of [framingBounds.min.z, framingBounds.max.z]) {
      framingPoints.push(new THREE.Vector3(x, y, z));
    }
  }
}
function fitCamera() {
  const direction = start.clone().sub(aim).normalize();
  const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
  const up = new THREE.Vector3().crossVectors(direction, right);
  const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.94;
  const horizontal = vertical * camera.aspect;
  let distance = start.distanceTo(aim);
  for (const point of framingPoints) {
    const offset = point.clone().sub(aim);
    distance = Math.max(distance, offset.dot(direction) + Math.max(
      Math.abs(offset.dot(right)) / horizontal, Math.abs(offset.dot(up)) / vertical
    ));
  }
  camera.position.copy(aim).addScaledVector(direction, distance);
}
fitCamera();
const controls = new OrbitControls(camera, renderer.domElement);
let cameraAdjusted = false;
controls.target.copy(aim);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 18;
controls.maxDistance = 150;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minPolarAngle = Math.PI * 0.13;
controls.update();
const dismissHint = () => document.querySelector('.hint').classList.add('dismissed');
controls.addEventListener('start', () => {
  cameraAdjusted = true;
  dismissHint();
});
document.querySelector('.toolbar').addEventListener('click', dismissHint, { once: true });

const ambient = new THREE.HemisphereLight('#9baec4', '#62584c', 0.42);
scene.add(ambient);
const sun = new THREE.DirectionalLight('#ffd0a0', 1.85);
sun.position.set(-18, 12, 10);
sun.target.position.set(-2, 3, -2);
scene.add(sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -23;
sun.shadow.camera.right = sun.shadow.camera.top = 23;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 65;
sun.shadow.bias = -0.00015;
sun.shadow.normalBias = 0.014;
scene.add(sun);
const rim = new THREE.DirectionalLight('#8eabc8', 0.32);
rim.position.set(8, 12, -15);
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
const water = new Water(new THREE.PlaneGeometry(350, 350), {
  textureWidth: 1024, textureHeight: 1024,
  waterNormals: waterNormals(), sunDirection: sun.position.clone().normalize(),
  sunColor: '#dab68b', waterColor: '#173e4b', distortionScale: 0.85, fog: true,
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
  noise.xy += harbourRipple(worldPosition.xz, vec2(-6.0, 7.6), 0.0)
    + harbourRipple(worldPosition.xz, vec2(8.0, 7.0), 1.8)
    + harbourRipple(worldPosition.xz, vec2(-12.2, 5.2), 3.1)
    + harbourRipple(worldPosition.xz, vec2(-11.3, 4.4), 0.7);
`);
const reflectionHook = 'vec3( 0.1 ) + reflectionSample * 0.9';
if (!water.material.fragmentShader.includes(reflectionHook)) {
  throw new Error('Three.js water shader no longer exposes the expected reflection hook');
}
water.material.fragmentShader = water.material.fragmentShader.replace(
  reflectionHook, 'vec3(0.025) + reflectionSample * 0.85'
);
const distanceHook = 'vec3 outgoingLight = albedo;';
const skyHook = 'uniform vec3 waterColor;';
const fogHook = '#include <fog_fragment>';
if (![distanceHook, skyHook, fogHook].every(hook => water.material.fragmentShader.includes(hook))) {
  throw new Error('Three.js water shader no longer exposes the expected distance shading hook');
}
water.material.uniforms.harbourSky = { value: skyTextures.dusk };
water.material.uniforms.harbourViewport = { value: renderer.getDrawingBufferSize(new THREE.Vector2()) };
// Match the screen-space sky at the far edge instead of revealing a finite water plane.
water.material.fragmentShader = water.material.fragmentShader.replace(
  skyHook, `${skyHook}\n uniform sampler2D harbourSky;\n uniform vec2 harbourViewport;`
).replace(
  distanceHook,
  `vec3 distantSky = texture2D(harbourSky, vec2(0.5, gl_FragCoord.y / harbourViewport.y)).rgb;
  vec3 outgoingLight = mix(albedo, distantSky,
    smoothstep(45.0, 155.0, length(worldPosition.xz)));`
).replace(fogHook, '');
scene.add(water);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.16, 0.45, 1.1);
composer.addPass(bloom);
composer.addPass(new SMAAPass());
composer.addPass(new OutputPass());
const gulls = [];
const boats = [];
const pennants = [];
const linens = [];
const smokeSprites = [];
let playing = true;
let elapsed = 0;
const localLights = [];
const litMaterials = new Map();
const warehouseMaterials = new Map();
const materialStyles = {
  'Sage painted plaster': { color: '#c3c5b5', roughness: 0.91 },
  'Warm grey plaster': { color: '#c9bda5', roughness: 0.92 },
  'Pale stone trim': { color: '#d6ccb6', roughness: 0.86 },
  'Old faded blue mint boarding': { color: '#8d9c9b', roughness: 0.82 },
  'Weathered quay concrete': { color: '#879397', roughness: 0.94 },
  'Slate green roof': { color: '#3e6362', roughness: 0.62, metalness: 0.08 },
  'Muted clay red roof tiles': { color: '#596c65', roughness: 0.78 },
  'Old dock timber': { color: '#a18560', roughness: 0.78 },
  'Ochre crane steel': { color: '#927848', roughness: 0.42, metalness: 0.42 },
  'Charcoal teal iron': { color: '#344749', roughness: 0.34, metalness: 0.58 },
  'Faded blue shutters': { color: '#627f80', roughness: 0.79 },
  'Ivory cafe canvas': { color: '#dfd0b3', roughness: 0.95 },
  'Soft linen curtains': { color: '#b3a68e', roughness: 0.96 },
  'Unlit blue green glass': { color: '#456978', roughness: 0.13, metalness: 0.18 },
};
const emissionLevels = {
  'Dim golden residential windows': { dusk: 0.22, day: 0.025 },
  'Soft amber illuminated windows': { dusk: 0.66, day: 0.08 },
  'Warm illuminated windows': { dusk: 0.86, day: 0.10 },
  'Bright amber shop windows': { dusk: 1.18, day: 0.15 },
  'Green navigation light': { dusk: 1.3, day: 0.55 },
  'Red navigation light': { dusk: 1.3, day: 0.55 },
};
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
  for (const obstacle of [
    { x: 5.1, z: -1.8, height: 12.2, warning: 6.5 },
    { x: 13.8, z: -1.2, height: 6.9, warning: 7.5 },
  ]) {
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

function styleMaterial(material) {
  const profile = materialStyles[material.name];
  if (profile) {
    const { color, ...response } = profile;
    material.color.set(color);
    Object.assign(material, response);
  }
  const emission = emissionLevels[material.name];
  if (emission) {
    litMaterials.set(material, emission);
    if (/windows/.test(material.name)) {
      material.color.multiplyScalar(0.55);
      material.roughness = 0.27;
    }
  }
  if (/linen|canvas|wings|bunting/i.test(material.name)) material.side = THREE.DoubleSide;
}

function warehouseMaterial(material) {
  if (warehouseMaterials.has(material)) return warehouseMaterials.get(material);
  const restrained = material.clone();
  restrained.name = `${material.name} (warehouse)`;
  if (material.name === 'Sage painted plaster') restrained.color.set('#879395');
  else restrained.color.multiplyScalar(0.88);
  if (litMaterials.has(material)) {
    const emission = litMaterials.get(material);
    litMaterials.set(restrained, { dusk: emission.dusk * 0.48, day: emission.day * 0.48 });
  }
  warehouseMaterials.set(material, restrained);
  return restrained;
}

function setLighting() {
  const mode = dusk ? 'dusk' : 'day';
  scene.background = skyTextures[mode];
  scene.environment = skyEnvironments[mode].texture;
  scene.environmentIntensity = dusk ? 0.25 : 0.35;
  scene.fog.color.set(dusk ? '#778490' : '#bac8ce');
  ambient.intensity = dusk ? 0.42 : 0.72;
  sun.color.set(dusk ? '#ffd0a0' : '#ffe0ba');
  sun.intensity = dusk ? 1.85 : 2.65;
  sun.position.set(dusk ? -18 : -15, dusk ? 12 : 17, 10);
  rim.intensity = dusk ? 0.32 : 0.48;
  renderer.toneMappingExposure = dusk ? 1.04 : 1.0;
  bloom.strength = dusk ? 0.16 : 0.10;
  water.material.uniforms.sunDirection.value.copy(sun.position).sub(sun.target.position).normalize();
  water.material.uniforms.sunColor.value.copy(sun.color).multiplyScalar(dusk ? 0.62 : 0.85);
  water.material.uniforms.waterColor.value.set(dusk ? '#173e4b' : '#265969');
  water.material.uniforms.harbourSky.value = skyTextures[mode];
  for (const [material, emission] of litMaterials) material.emissiveIntensity = emission[mode];
  for (const { light, intensity } of localLights) light.intensity = intensity * (dusk ? 1 : 0.12);
  const button = document.querySelector('#time');
  button.textContent = dusk ? '日间' : '暮色';
  button.setAttribute('aria-pressed', String(dusk));
  button.classList.toggle('active', dusk);
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
    const intensity = position.x < 5 ? 4.8 : 1.6;
    const lamp = new THREE.PointLight('#ffc17b', intensity, 4.2, 2);
    lamp.position.copy(position);
    lamp.position.y -= 0.12;
    scene.add(lamp);
    localLights.push({ light: lamp, intensity });
  }
}

function frameArchitecture(root) {
  framingPoints.length = 0;
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
          const point = new THREE.Vector3(x, y, z).applyMatrix4(obj.matrixWorld);
          framingPoints.push(point);
          // Include building reflections without letting the tall mast shrink the whole town.
          if (point.y > 0 && point.y < 8.8) {
            const reflection = point.clone();
            reflection.y = -point.y - 0.2;
            framingPoints.push(reflection);
          }
        }
      }
    }
  });
  fitCamera();
  controls.target.copy(aim);
  controls.update();
}

// Keep moving groups intact, but batch the thousands of tiny static model parts.
function batchStatic(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const removed = [];
  root.traverse(obj => {
    if (!obj.isMesh || obj.morphTargetInfluences || Array.isArray(obj.material)) return;
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
    if (litMaterials.has(material)) litMaterials.set(batchMaterial, litMaterials.get(material));
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

setLighting();

new GLTFLoader().load('./assets/harbour_town.glb', gltf => {
  try {
    const root = gltf.scene;
    scene.add(root);
    root.updateMatrixWorld(true);
    frameArchitecture(root);
    const adjustedMaterials = new Set();
    root.traverse(obj => {
      if (obj.name.includes('animated_flight')) {
        const index = Number(obj.name.match(/Gull_(\d+)/)?.[1]) - 1;
        if (!Number.isInteger(index) || index < 0 || index >= 26) {
          throw new Error(`海鸟编号不正确：${obj.name}`);
        }
        const layer = index < 10 ? 'rear' : index < 18 ? 'middle' : 'front';
        if (layer === 'rear') {
          obj.position.y = Math.max(9.3, obj.position.y);
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
        const bounds = layer === 'rear' ? { minY: 9.1, maxY: 12.3, minZ: -11, maxZ: -3.1 }
          : layer === 'middle' ? { minY: 6.1, maxY: 9.1, minZ: 1.4, maxZ: 5.4 }
            : { minY: 4.1, maxY: 7.9, minZ: 6.0, maxZ: 14.0 };
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
          styleMaterial(mat);
        }
        const position = new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld);
        if (position.x > 7.2 && position.y > 2.7 && position.z < 1) {
          obj.material = Array.isArray(obj.material)
            ? obj.material.map(warehouseMaterial) : warehouseMaterial(obj.material);
        }
      }
    });
    if (gulls.length !== 26 || boats.length !== 2) {
      throw new Error(`动画分组不完整：${gulls.length} 只海鸥，${boats.length} 艘船`);
    }
    addLocalLights(root);
    batchStatic(root);
    setLighting();
    status.classList.add('hidden');
    window.harbourState = {
      ready: true, gulls: gulls.length, boats: boats.length,
      pennants: pennants.length, linens: linens.length, time: 0,
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
  fitCamera();
  controls.target.copy(aim);
  controls.update();
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
  camera.updateProjectionMatrix();
  if (!cameraAdjusted) {
    fitCamera();
    controls.target.copy(aim);
    controls.update();
  }
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
  scene.fog.density = 0.006 * Math.min(1, 40 / camera.position.distanceTo(controls.target));
  renderer.info.reset();
  composer.render();
  if (window.harbourState?.ready) {
    window.harbourState.time = elapsed;
    window.harbourState.drawCalls = renderer.info.render.calls;
    window.harbourState.boatHeight = boats[0]?.obj.position.y;
    window.harbourState.waterTime = water.material.uniforms.time.value;
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
