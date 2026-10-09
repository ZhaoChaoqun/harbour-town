import * as THREE from 'three';

const materialStyles = {
  'Sage painted plaster': { color: '#c3c5b5', roughness: 0.91 },
  'Warm grey plaster': { color: '#c9bda5', roughness: 0.92 },
  'Pale stone trim': { color: '#d6ccb6', roughness: 0.86 },
  'Old faded blue mint boarding': { color: '#8d9c9b', roughness: 0.82 },
  'Weathered quay concrete': { color: '#879397', roughness: 0.94 },
  'Slate green roof': { color: '#3e6362', roughness: 0.62, metalness: 0.08 },
  'Muted clay red roof tiles': { color: '#786b5d', roughness: 0.78 },
  'Old dock timber': { color: '#a18560', roughness: 0.78 },
  'Ochre crane steel': { color: '#927848', roughness: 0.42, metalness: 0.42 },
  'Charcoal teal iron': { color: '#344749', roughness: 0.34, metalness: 0.58 },
  'Faded blue shutters': { color: '#627f80', roughness: 0.79 },
  'Ivory cafe canvas': { color: '#dfd0b3', roughness: 0.95 },
  'Soft linen curtains': { color: '#b3a68e', roughness: 0.96 },
  'Unlit blue green glass': { color: '#456978', roughness: 0.18, metalness: 0.18 },
};
const emissionLevels = {
  'Dim golden residential windows': { dusk: 0.42, day: 0.18 },
  'Soft amber illuminated windows': { dusk: 0.9, day: 0.4 },
  'Warm illuminated windows': { dusk: 1.2, day: 0.58 },
  'Bright amber shop windows': { dusk: 1.65, day: 0.9 },
  'Green navigation light': { dusk: 1.3, day: 0.65 },
  'Red navigation light': { dusk: 1.3, day: 0.65 },
};

export function createHarbourLighting({ renderer, scene, ambient, sun, rim, bloom, water }) {
  function makeSky(top, horizon, ground) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
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
  const skies = {
    day: makeSky('#5e839d', '#b9c8ce', '#376679'),
    dusk: makeSky('#203c56', '#758791', '#1f4857'),
  };
  const generator = new THREE.PMREMGenerator(renderer);
  const environments = {
    day: generator.fromEquirectangular(skies.day),
    dusk: generator.fromEquirectangular(skies.dusk),
  };
  generator.dispose();
  const emissions = new Map();
  const warehouseMaterials = new Map();
  const lamps = [];

  function styleMaterial(material) {
    const profile = materialStyles[material.name];
    if (profile) {
      const { color, ...response } = profile;
      material.color.set(color);
      Object.assign(material, response);
    }
    const emission = emissionLevels[material.name];
    if (emission) {
      emissions.set(material, emission);
      if (/windows/.test(material.name)) {
        material.color.multiplyScalar(0.65);
        material.roughness = 0.27;
      }
    }
    if (/linen|canvas|wings|bunting/i.test(material.name)) material.side = THREE.DoubleSide;
  }
  function warehouseMaterial(material) {
    if (warehouseMaterials.has(material)) return warehouseMaterials.get(material);
    const restrained = material.clone();
    restrained.name = `${material.name} (warehouse)`;
    if (material.name === 'Sage painted plaster') restrained.color.set('#929e9e');
    else restrained.color.multiplyScalar(0.94);
    if (emissions.has(material)) {
      const emission = emissions.get(material);
      emissions.set(restrained, { dusk: emission.dusk * 0.72, day: emission.day * 0.8 });
    }
    warehouseMaterials.set(material, restrained);
    return restrained;
  }
  function registerClone(original, clone) {
    if (emissions.has(original)) emissions.set(clone, emissions.get(original));
  }
  function registerLamp(light, intensity) {
    lamps.push({ light, intensity });
  }

  const reflectionHook = 'vec3( 0.1 ) + reflectionSample * 0.9';
  const distanceHook = 'vec3 outgoingLight = albedo;';
  const skyHook = 'uniform vec3 waterColor;';
  const fogHook = '#include <fog_fragment>';
  if (![reflectionHook, distanceHook, skyHook, fogHook].every(hook => water.material.fragmentShader.includes(hook))) {
    throw new Error('Three.js water shader no longer exposes the expected harbour lighting hooks');
  }
  water.material.uniforms.harbourSky = { value: skies.dusk };
  water.material.uniforms.harbourViewport = { value: renderer.getDrawingBufferSize(new THREE.Vector2()) };
  water.material.fragmentShader = water.material.fragmentShader.replace(
    reflectionHook, 'vec3(0.025) + reflectionSample * 0.85'
  ).replace(
    skyHook, `${skyHook}\n uniform sampler2D harbourSky;\n uniform vec2 harbourViewport;`
  ).replace(
    distanceHook,
    `vec3 distantSky = texture2D(harbourSky, vec2(0.5, gl_FragCoord.y / harbourViewport.y)).rgb;
    vec3 outgoingLight = mix(albedo, distantSky,
      smoothstep(60.0, 230.0, length(worldPosition.xz)));`
  ).replace(fogHook, '');

  function apply(dusk) {
    const mode = dusk ? 'dusk' : 'day';
    scene.background = skies[mode];
    scene.environment = environments[mode].texture;
    scene.environmentIntensity = dusk ? 0.28 : 0.32;
    scene.fog.color.set(dusk ? '#758791' : '#b9c8ce');
    ambient.intensity = dusk ? 0.48 : 0.92;
    sun.color.set(dusk ? '#ffcf9b' : '#ffe1bd');
    sun.intensity = dusk ? 1.45 : 2.4;
    sun.position.set(dusk ? -19 : -18, dusk ? 15 : 22, dusk ? 13 : 15);
    rim.intensity = dusk ? 0.5 : 0.58;
    renderer.toneMappingExposure = dusk ? 1.03 : 1.0;
    bloom.strength = dusk ? 0.26 : 0.14;
    water.material.uniforms.sunDirection.value.copy(sun.position).sub(sun.target.position).normalize();
    water.material.uniforms.sunColor.value.copy(sun.color).multiplyScalar(dusk ? 0.65 : 0.82);
    water.material.uniforms.waterColor.value.set(dusk ? '#123f50' : '#215d69');
    water.material.uniforms.harbourSky.value = skies[mode];
    for (const [material, emission] of emissions) material.emissiveIntensity = emission[mode];
    lamps.forEach(({ light, intensity }) => { light.intensity = intensity * (dusk ? 1 : 0.62); });
  }
  return { apply, styleMaterial, warehouseMaterial, registerClone, registerLamp, emissions, lamps };
}
