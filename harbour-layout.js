export const FERRIS_WHEEL = Object.freeze({
  x: -15.4, z: 8, yaw: 0,
  radius: 3, hubHeight: 5.85, deckHeight: 1.7,
  gondolas: 10, revolutionSeconds: 120,
  entranceX: -13, entranceMinZ: -0.15, entranceMaxZ: 1.2,
});

export const HARBOUR_BUILDINGS = Object.freeze([
  { name: 'Harbour bakery', x: -9.7, z: -8.8, width: 2.7, depth: 3.1, floors: 3, roof: 'pitched', color: '#dbc8a6', roofColor: '#496b70', awning: true },
  { name: 'Canal apartments', x: -5.6, z: -8.9, width: 3.3, depth: 3, floors: 5, roof: 'terrace', color: '#b6c5bf', roofColor: '#476e70', setback: 3, balconies: true },
  { name: 'Lantern lane house', x: -2.65, z: -9.1, width: 1.55, depth: 2.8, floors: 4, floorHeight: 1.04, roof: 'pitched', color: '#b99f8e', roofColor: '#617965' },
  { name: 'Copper roof apartments', x: -9.3, z: -14.4, width: 3.2, depth: 3.5, floors: 6, roof: 'pitched', color: '#bda98f', roofColor: '#758972', balconies: true },
  { name: 'West terrace house', x: -4.9, z: -14.8, width: 3.4, depth: 3.4, floors: 7, roof: 'stepped', color: '#aac0b7', roofColor: '#466a70', setback: 5, equipment: 'pergola' },
  { name: 'Canal corner house', x: 3.2, z: -8.9, width: 2.5, depth: 3, floors: 4, roof: 'terrace', color: '#d2c9b2', roofColor: '#7b6854', setback: 2, awning: true },
  { name: 'Sailmakers loft', x: 7.3, z: -9.1, width: 3.4, depth: 3.3, floors: 3, floorHeight: 1.24, roof: 'pitched', color: '#afa991', roofColor: '#426571', equipment: 'monitor' },
  { name: 'Rear hotel', x: 3.7, z: -14.4, width: 3, depth: 3.8, floors: 7, floorHeight: 1.18, roof: 'stepped', color: '#bcc1c3', roofColor: '#456b70', setback: 4, equipment: 'tank' },
  { name: 'Civic clock house', x: 7.5, z: -15.4, width: 2.8, depth: 3.8, floors: 6, roof: 'clock', color: '#d1bd9d', roofColor: '#806552' },
  { name: 'Harbour printworks', x: 10.15, z: -12.8, width: 1.85, depth: 2.7, floors: 5, floorHeight: 1.04, roof: 'terrace', color: '#bba194', roofColor: '#486b71', balconies: true },
]);

export const HARBOUR_PLATFORMS = Object.freeze([
  { name: 'West neighbourhood', x: -6.65, z: -12.15, width: 10.3, depth: 11.5, height: 1.7 },
  { name: 'East neighbourhood', x: 6.5, z: -12.6, width: 10, depth: 12.4, height: 1.7 },
  { name: 'Market pier', x: -3.5, z: 7.7, width: 6, depth: 6, height: 1.05 },
  { name: 'Working dock', x: 12.1, z: 3.6, width: 4.8, depth: 3.6, height: 1.3 },
]);

export const WALKING_ROUTES = Object.freeze([
  { name: 'Market browsing', height: 1.05, points: [[-5.7, 7.9], [-1.3, 7.9], [-1.3, 8.3], [-5.7, 8.3]], speed: 0.25 },
  { name: 'West lantern lane', height: 1.7, points: [[-10.4, -11.5], [-3, -11.5], [-3, -11.1], [-10.4, -11.1]], speed: 0.3 },
  { name: 'East street', height: 1.7, points: [[3.1, -11.5], [8.4, -11.5], [8.4, -11.1], [3.1, -11.1]], speed: 0.28 },
  { name: 'Canal crossing', height: 1.7, points: [[-2.5, -11.4], [2.5, -11.4]], speed: 0.24 },
  { name: 'Dock porter', height: 1.3, points: [[10.3, 4.35], [13.5, 4.35], [13.5, 4.7], [10.3, 4.7]], speed: 0.22 },
  { name: 'Market arrival', height: 1.05, points: [[-6.28, 5.2], [-6.28, 7.6], [-6.19, 7.6], [-6.19, 5.2]], speed: 0.23 },
]);

export const GULL_LAYERS = Object.freeze({
  rear: { minY: 12.4, maxY: 15.8, minZ: -22, maxZ: -9 },
  middle: { minY: 6.1, maxY: 9.1, minZ: 1.4, maxZ: 5.4 },
  front: { minY: 4.1, maxY: 7.9, minZ: 6, maxZ: 14 },
});

export const GULL_OBSTACLES = Object.freeze([
  { x: 5.1, z: -1.8, height: 12.2, warning: 6.5 },
  { x: 13.8, z: -1.2, height: 6.9, warning: 7.5 },
  { x: FERRIS_WHEEL.x, z: FERRIS_WHEEL.z, height: 9.3, warning: 6.8 },
]);

export function buildingHeight(building) {
  const roof = building.roof === 'clock' ? 1.4 : building.roof === 'pitched' ? 0.65 : 0.52;
  const equipment = building.equipment === 'pergola' ? 1.08 : building.equipment === 'tank' ? 0.9
    : building.equipment === 'monitor' ? 0.98 : 0;
  return 1.7 + building.floors * (building.floorHeight ?? 1.15) + Math.max(roof, equipment);
}

export function architecturePoints(includeOriginal = true) {
  const boxes = [
    [-18.65, -12.1, -0.55, 2.95, 5.8, 10.6],
    [-14.3, -12.9, 1.4, 2.45, -0.15, 5.9],
    [14.75, 15.95, -0.2, 1.8, 2.6, 5.05],
  ];
  if (includeOriginal) boxes.push(
    [-13, 13.1, 0, 2.45, -6.4, 2.65],
    [-12.9, -9.2, 1.7, 4.1, -4.4, 1.55],
    [-10.4, -9.8, 3.4, 8.05, -2.75, -2.05],
    [-8.7, -6.3, 1.7, 7.4, -4.6, -1.7],
    [-5.2, 0.9, 1.7, 8.5, -4.3, -0.2],
    [1, 4.1, 1.7, 4.65, -1.3, 1.2],
    [6.9, 12.7, 1.7, 4.95, -6.5, -2.2],
    [4.45, 5.75, 1.7, 12.5, -2.5, -1.1],
    [12.1, 15.9, 1.3, 6.9, -3.5, 1],
  );
  HARBOUR_BUILDINGS.forEach(building => boxes.push([
    building.x - building.width / 2 - 0.18, building.x + building.width / 2 + 0.18,
    1.7, buildingHeight(building), building.z - building.depth / 2 - 0.18, building.z + building.depth / 2 + 0.18,
  ]));
  HARBOUR_PLATFORMS.forEach(platform => boxes.push([
    platform.x - platform.width / 2, platform.x + platform.width / 2,
    0, platform.name === 'Market pier' ? 3.4 : platform.height + 0.8,
    platform.z - platform.depth / 2, platform.z + platform.depth / 2,
  ]));
  const points = [];
  for (const [minX, maxX, minY, maxY, minZ, maxZ] of boxes) {
    for (const x of [minX, maxX]) for (const y of [minY, maxY]) for (const z of [minZ, maxZ]) points.push([x, y, z]);
  }
  for (let i = 0; i < 20; i++) {
    const angle = i / 20 * Math.PI * 2;
    points.push([FERRIS_WHEEL.x + Math.cos(angle) * 3.32,
      FERRIS_WHEEL.hubHeight + Math.sin(angle) * 3.05, FERRIS_WHEEL.z]);
  }
  return points;
}
