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
scene.background = new THREE.Color('#7d9a94');
scene.fog = new THREE.FogExp2('#7d9a94', 0.012);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 600);
const start = new THREE.Vector3(19, 13, 35);
const aim = new THREE.Vector3(0, 3.0, 0);
function fitCamera() {
  const scale = Math.max(1, Math.min(3.0, 1.35 / camera.aspect));
  camera.position.copy(start).sub(aim).multiplyScalar(scale).add(aim);
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

const ambient = new THREE.HemisphereLight('#bed6dc', '#314a40', 1.65);
scene.add(ambient);
const sun = new THREE.DirectionalLight('#c9d9d2', 2.2);
sun.position.set(-12, 22, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -23;
sun.shadow.camera.right = sun.shadow.camera.top = 23;
sun.shadow.camera.far = 80;
sun.shadow.normalBias = 0.045;
scene.add(sun);
const rim = new THREE.DirectionalLight('#9bc8d4', 1.25);
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
        height += noise(x / size, y / size, 6 * 2 ** octave) * 0.5 ** (octave + 1);
      }
      heights[y * size + x] = height;
    }
  }
  const heightAt = (x, y) => heights[wrap(y, size) * size + wrap(x, size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (heightAt(x + 1, y) - heightAt(x - 1, y)) * 6;
      const dy = (heightAt(x, y + 1) - heightAt(x, y - 1)) * 6;
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
  sunColor: '#b7d4c5', waterColor: '#246d61', distortionScale: 1.1, fog: true,
});
water.rotation.x = -Math.PI / 2;
water.position.y = -0.1;
water.material.uniforms.size.value = 8.0;
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
    float pulse = cos(distance * 13.0 - time * 8.0 + phase) * envelope * 0.035;
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
  noise.xy *= shoreCalm;
  noise.xy += harbourRipple(worldPosition.xz, vec2(-6.0, 7.6), 0.0)
    + harbourRipple(worldPosition.xz, vec2(8.0, 7.0), 1.8)
    + harbourRipple(worldPosition.xz, vec2(-12.2, 5.2), 3.1)
    + harbourRipple(worldPosition.xz, vec2(-11.3, 4.4), 0.7);
`);
scene.add(water);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.65, 1.0);
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
let dusk = false;
const clock = new THREE.Clock();

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
    const lamp = new THREE.PointLight('#ffc481', 7, 3.4, 2);
    lamp.position.copy(position);
    lamp.position.y -= 0.12;
    scene.add(lamp);
  }
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
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const shade = 0.94 + 0.06 * Math.sin(x * 7.2 + Math.sin(z * 5.4) + y * 8.6);
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

function animateScene(time) {
  water.material.uniforms.time.value = time * 0.22;
  gulls.forEach((entry, i) => {
    const phase = i * 0.73;
    entry.obj.position.x = entry.base.x + Math.sin(time * 0.35 + phase) * 1.2;
    entry.obj.position.z = entry.base.z + Math.cos(time * 0.35 + phase) * 0.45;
    entry.obj.position.y = entry.base.y + Math.sin(time * 0.7 + phase) * 0.13;
    entry.obj.rotation.z = Math.sin(time * 0.35 + phase) * 0.09;
    entry.obj.traverse(child => {
      if (child.morphTargetInfluences?.length) {
        child.morphTargetInfluences[0] = Math.sin(time * 4.0 + phase) * 0.6;
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

new GLTFLoader().load('./assets/harbour_town.glb', gltf => {
  try {
    const root = gltf.scene;
    scene.add(root);
    const adjustedMaterials = new Set();
    root.traverse(obj => {
      if (obj.name.includes('animated_flight')) {
        gulls.push({ obj, base: obj.position.clone() });
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
          if (mat.emissiveIntensity > 1) mat.emissiveIntensity *= 0.72;
          if (/linen|canvas|wings|bunting/i.test(mat.name)) mat.side = THREE.DoubleSide;
        }
      }
    });
    if (gulls.length !== 26 || boats.length !== 2) {
      throw new Error(`动画分组不完整：${gulls.length} 只海鸥，${boats.length} 艘船`);
    }
    addLocalLights(root);
    batchStatic(root);
    status.classList.add('hidden');
    window.harbourState = {
      ready: true, gulls: gulls.length, boats: boats.length,
      pennants: pennants.length, linens: linens.length, time: 0,
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
document.querySelector('#time').addEventListener('click', event => {
  dusk = !dusk;
  event.currentTarget.textContent = dusk ? '日间' : '暮色';
  event.currentTarget.setAttribute('aria-pressed', String(dusk));
  scene.background.set(dusk ? '#405b5c' : '#7d9a94');
  scene.fog.color.copy(scene.background);
  ambient.intensity = dusk ? 0.95 : 1.65;
  sun.intensity = dusk ? 0.9 : 2.2;
  rim.intensity = dusk ? 0.7 : 1.25;
  bloom.strength = dusk ? 0.42 : 0.32;
});
document.querySelector('#reset').addEventListener('click', () => {
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
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
function frame() {
  requestAnimationFrame(frame);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (playing) elapsed += delta;
  animateScene(elapsed);
  controls.update();
  scene.fog.density = 0.010 * Math.min(1, 40 / camera.position.distanceTo(controls.target));
  renderer.info.reset();
  composer.render();
  if (window.harbourState?.ready) {
    window.harbourState.time = elapsed;
    window.harbourState.drawCalls = renderer.info.render.calls;
    window.harbourState.boatHeight = boats[0]?.obj.position.y;
    window.harbourState.waterTime = water.material.uniforms.time.value;
    window.harbourState.camera = camera.position.toArray();
  }
}
frame();
