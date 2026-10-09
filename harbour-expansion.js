import * as THREE from 'three';
import { createGeometryBatch, openQuayRailing } from './harbour-modeling.js';
import { HARBOUR_BUILDINGS, HARBOUR_PLATFORMS, WALKING_ROUTES, FERRIS_WHEEL, buildingHeight } from './harbour-layout.js';

export function connectHarbourExpansion(root) {
  openQuayRailing(root, {
    names: ['Quay railing horizontal.004', 'Quay railing horizontal.005'],
    axis: 'x', fixed: 2.65, min: -6.3, max: -5.1, label: 'Market stairs',
  });
  openQuayRailing(root, {
    names: ['Quay railing horizontal.010', 'Quay railing horizontal.011'],
    axis: 'x', fixed: 1.55, min: 10.6, max: 11.9, label: 'Working dock stairs',
  });
  const buoyParts = [];
  const position = new THREE.Vector3();
  root.traverse(obj => {
    if (!obj.isMesh || !/^(Buoy_|Conical_navigation_buoy)/.test(obj.name)) return;
    obj.getWorldPosition(position);
    if (Math.hypot(position.x + 6, position.z - 7.6) < 0.2) buoyParts.push(obj);
  });
  if (buoyParts.length !== 4) throw new Error('Cannot move the market-side buoy: expected four model parts');
  for (const part of buoyParts) {
    part.getWorldPosition(position);
    position.x -= 1.3;
    position.z += 5;
    part.position.copy(part.parent.worldToLocal(position));
  }
}

export function createHarbourExpansion() {
  const group = new THREE.Group();
  group.name = 'Harbour neighbourhoods';
  const material = (name, roughness, metalness = 0) => new THREE.MeshStandardMaterial({
    name, color: '#ffffff', vertexColors: true, roughness, metalness,
  });
  const plaster = material('Warm harbour plaster', 0.88);
  const trim = material('Ivory trim and canvas', 0.8);
  const roof = material('Painted copper and slate', 0.58, 0.28);
  const iron = material('Harbour ironwork', 0.42, 0.45);
  const timber = material('Dock and market timber', 0.93);
  const stone = material('Harbour stonework', 0.95);
  const glass = material('Unlit blue glass', 0.2, 0.3);
  const greenery = material('Salt-tolerant planting', 0.93);
  const windowLevels = [0.2, 0.5, 0.9].map((intensity, i) => new THREE.MeshStandardMaterial({
    name: `Warm interior ${i + 1}`, color: '#e1b978', emissive: '#ffbc78',
    emissiveIntensity: intensity, roughness: 0.28, metalness: 0.08,
  }));
  const glow = new THREE.MeshStandardMaterial({
    name: 'Harbour festoon bulbs', color: '#f6dfb1', emissive: '#ffcb8c',
    emissiveIntensity: 0.5, roughness: 0.7,
  });
  const staticParts = createGeometryBatch(group, 'Harbour city', new Set([glow]));
  const sphere = new THREE.IcosahedronGeometry(1, 0);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
  const pot = new THREE.CylinderGeometry(1, 0.78, 1, 8);
  const cone = new THREE.ConeGeometry(1, 1, 8);
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-0.5, 0); roofShape.lineTo(0.5, 0); roofShape.lineTo(0, 0.5); roofShape.closePath();
  const pitchedRoof = new THREE.ExtrudeGeometry(roofShape, { depth: 1, bevelEnabled: false });
  pitchedRoof.translate(0, 0, -0.5);
  const walls = ['#d2c8b1', '#bcbdb0', '#b2c0bd'];
  const roofs = ['#446b70', '#6a7f6b', '#866d5a'];
  const ironColor = '#3b5159';
  const timberColor = '#a38b68';
  const ivory = '#dfd3b7';
  const lights = [];
  const planting = [];

  function railing(start, end, height) {
    for (const y of [height + 0.29, height + 0.7]) {
      staticParts.rod(iron, [start[0], y, start[1]], [end[0], y, end[1]], 0.018, ironColor);
    }
    const steps = Math.max(1, Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) / 0.75));
    for (let i = 0; i <= steps; i++) {
      const x = THREE.MathUtils.lerp(start[0], end[0], i / steps);
      const z = THREE.MathUtils.lerp(start[1], end[1], i / steps);
      staticParts.rod(iron, [x, height, z], [x, height + 0.7, z], 0.024, ironColor);
    }
  }
  function woodenDeck(x, z, width, depth, height) {
    const planks = Math.ceil(depth / 0.24);
    for (let i = 0; i < planks; i++) {
      staticParts.box(timber, [x, height - 0.06, z - depth / 2 + (i + 0.5) * depth / planks],
        [width, 0.12, depth / planks - 0.016], 0, i % 4 === 0 ? '#af9877' : timberColor);
    }
    for (const side of [-1, 1]) {
      staticParts.box(timber, [x, height - 0.16, z + side * (depth / 2 - 0.1)], [width + 0.1, 0.22, 0.16], 0, timberColor);
    }
    for (const px of [x - width / 2 + 0.22, x, x + width / 2 - 0.22]) {
      for (const pz of [z - depth / 2 + 0.22, z + depth / 2 - 0.22]) {
        staticParts.rod(timber, [px, -0.5, pz], [px, height - 0.12, pz], 0.085, '#887659');
      }
    }
  }
  function stairs(x, width, startZ, endZ, fromHeight, toHeight, steps) {
    for (let i = 0; i < steps; i++) {
      const top = THREE.MathUtils.lerp(fromHeight, toHeight, (i + 1) / steps);
      const z = THREE.MathUtils.lerp(startZ, endZ, (i + 0.5) / steps);
      staticParts.box(timber, [x, top - 0.075, z], [width, 0.15, (endZ - startZ) / steps + 0.01], 0, timberColor);
    }
    for (const side of [-1, 1]) {
      const px = x + side * width / 2;
      staticParts.rod(timber, [px, fromHeight - 0.18, startZ], [px, toHeight - 0.18, endZ], 0.065, timberColor);
      staticParts.rod(iron, [px, fromHeight + 0.7, startZ], [px, toHeight + 0.7, endZ], 0.024, ironColor);
      for (const phase of [0, 0.5, 1]) {
        const z = THREE.MathUtils.lerp(startZ, endZ, phase);
        const y = THREE.MathUtils.lerp(fromHeight, toHeight, phase);
        staticParts.rod(iron, [px, y, z], [px, y + 0.7, z], 0.024, ironColor);
      }
    }
  }
  for (const platform of HARBOUR_PLATFORMS) {
    const { x, z, width, depth, height } = platform;
    if (platform.name.includes('neighbourhood')) {
      staticParts.box(stone, [x, height - 0.28, z], [width, 0.56, depth], 0, '#829397');
      staticParts.box(stone, [x, height - 0.025, z], [width + 0.04, 0.05, depth + 0.04], 0, '#b6b8aa');
      for (const px of [x - width / 2 + 0.35, x, x + width / 2 - 0.35]) {
        for (const pz of [z - depth / 2 + 0.35, z, z + depth / 2 - 0.35]) {
          staticParts.part(cylinder, stone, [px, 0.35, pz], [0.18, 1.5, 0.18], null, '#74868b');
        }
      }
      railing([x - width / 2, z - depth / 2], [x + width / 2, z - depth / 2], height);
      const edge = x < 0 ? x - width / 2 : x + width / 2;
      railing([edge, z - depth / 2], [edge, z + depth / 2], height);
      const canal = x < 0 ? x + width / 2 : x - width / 2;
      railing([canal, z - depth / 2], [canal, -12.05], height);
      railing([canal, -10.75], [canal, -7.6], height);
      staticParts.box(stone, [x, 1.701, -11.3], [width - 0.55, 0.002, 1.1], 0, '#c6bcaa');
    } else woodenDeck(x, z, width, depth, height);
  }
  for (const x of [-10, -3]) {
    staticParts.box(stone, [x, 1.61, -6], [1.4, 0.18, 1.3], 0, '#a4b0ac');
    railing([x - 0.7, -5.35], [x - 0.7, -6.65], 1.7);
    railing([x + 0.7, -5.35], [x + 0.7, -6.65], 1.7);
  }
  for (const z of [-11.4, -7.05]) {
    const width = 3.35, depth = 1.15;
    woodenDeck(0, z, width, depth, 1.7);
    railing([-width / 2, z - depth / 2], [width / 2, z - depth / 2], 1.7);
    railing([-width / 2, z + depth / 2], [width / 2, z + depth / 2], 1.7);
  }
  stairs(-5.7, 1.2, 2.65, 4.75, 1.7, 1.05, 5);
  stairs(11.25, 1.3, 1.55, 2.8, 1.7, 1.3, 4);
  railing([-6.5, 4.7], [-6.3, 4.7], 1.05);
  railing([-5.1, 4.7], [-0.5, 4.7], 1.05);
  railing([-6.5, 4.7], [-6.5, 10.7], 1.05);
  railing([-0.5, 4.7], [-0.5, 10.7], 1.05);
  railing([-6.5, 10.7], [-0.5, 10.7], 1.05);
  railing([9.7, 1.8], [10.6, 1.8], 1.3);
  railing([11.9, 1.8], [14.5, 1.8], 1.3);
  railing([9.7, 1.8], [9.7, 5.4], 1.3);
  railing([14.5, 1.8], [14.5, 5.4], 1.3);
  railing([9.7, 5.4], [14.5, 5.4], 1.3);

  function pane(x, y, z, width, index, face = 0) {
    const brightness = index % 7;
    const surface = brightness < 3 ? glass : windowLevels[Math.min(2, brightness - 3)];
    const color = surface === glass ? '#405d68' : null;
    const yaw = face === 2 ? Math.PI : face * Math.PI / 2;
    staticParts.box(trim, [x, y, z], [width + 0.12, 0.76, 0.06], yaw, ivory);
    const offset = [Math.sin(yaw) * 0.036, 0, Math.cos(yaw) * 0.036];
    staticParts.box(surface, [x + offset[0], y, z + offset[2]], [width, 0.62, 0.025], yaw, color);
    staticParts.box(trim, [x + offset[0] * 1.8, y, z + offset[2] * 1.8], [0.035, 0.64, 0.025], yaw, ivory);
  }
  const buildings = [];
  for (const [index, building] of HARBOUR_BUILDINGS.entries()) {
    const { x, z, width, depth, floors, floorHeight = 1.15 } = building;
    const bodyHeight = floors * floorHeight;
    const top = 1.7 + bodyHeight;
    const bodyColor = building.color;
    const upperColor = new THREE.Color(bodyColor).lerp(new THREE.Color('#ded8c4'), 0.22);
    const upperWidth = building.setback ? width * 0.7 : width;
    const upperDepth = building.setback ? depth * 0.73 : depth;
    const upperX = building.setback ? x + width * 0.035 : x;
    const upperZ = building.setback ? z - depth * 0.12 : z;
    const lowerFloors = building.setback ?? floors;
    const lowerHeight = lowerFloors * floorHeight;
    const roofWidth = upperWidth, roofDepth = upperDepth;
    const roofX = upperX, roofZ = upperZ;
    staticParts.box(stone, [x, 1.77, z], [width + 0.14, 0.14, depth + 0.14], 0, '#8f9892');
    staticParts.box(plaster, [x, 1.7 + lowerHeight / 2, z], [width, lowerHeight, depth], 0, bodyColor);
    if (building.setback) {
      staticParts.box(plaster, [upperX, 1.7 + lowerHeight + (bodyHeight - lowerHeight) / 2, upperZ],
        [upperWidth, bodyHeight - lowerHeight, upperDepth], 0, upperColor);
      staticParts.box(roof, [x, 1.7 + lowerHeight + 0.035, z], [width + 0.18, 0.07, depth + 0.18], 0, building.roofColor);
      const terraceY = 1.7 + lowerHeight + 0.07, frontZ = z + depth / 2 - 0.06;
      staticParts.rod(iron, [x - width / 2, terraceY + 0.45, frontZ],
        [x + width / 2, terraceY + 0.45, frontZ], 0.018, ironColor);
      for (const px of [x - width / 2, x, x + width / 2]) {
        staticParts.rod(iron, [px, terraceY, frontZ], [px, terraceY + 0.45, frontZ], 0.018, ironColor);
      }
      planter(x - width * 0.32, terraceY, z + depth * 0.38);
      planter(x + width * 0.32, terraceY, z + depth * 0.38);
    }
    for (let floor = 1; floor < floors; floor++) {
      const upper = building.setback && floor >= building.setback;
      staticParts.box(trim, [upper ? upperX : x, 1.7 + floor * floorHeight, upper ? upperZ : z],
        [(upper ? upperWidth : width) + 0.11, 0.08, (upper ? upperDepth : depth) + 0.11], 0, ivory);
    }
    for (let floor = 0; floor < floors; floor++) {
      const upper = building.setback && floor >= building.setback;
      const wxCenter = upper ? upperX : x, wzCenter = upper ? upperZ : z;
      const floorWidth = upper ? upperWidth : width, floorDepth = upper ? upperDepth : depth;
      const columns = Math.max(2, Math.floor(floorWidth / 0.85));
      const windowY = 1.7 + floorHeight * (floor + 0.58);
      for (let column = 0; column < columns; column++) {
        const wx = wxCenter + (column - (columns - 1) / 2) * (floorWidth - 0.7) / columns;
        const paneWidth = floorHeight > 1.2 ? 0.48 : index % 2 ? 0.36 : 0.42;
        pane(wx, windowY, wzCenter - floorDepth / 2 - 0.025, paneWidth,
          index * 7 + floor * 3 + column * 2, 2);
        if (floor === 0 && Math.abs(wx - x) < 0.45) continue;
        pane(wx, windowY, wzCenter + floorDepth / 2 + 0.025, paneWidth,
          index * 11 + floor * 5 + column * 3);
        if (building.balconies && floor > 0 && floor % 2 === 0 && column === 0) {
          const by = 1.7 + floor * floorHeight + 0.08, bz = wzCenter + floorDepth / 2 + 0.24;
          staticParts.box(trim, [wx, by, bz], [0.72, 0.07, 0.5], 0, ivory);
          staticParts.rod(iron, [wx - 0.34, by + 0.34, bz + 0.21], [wx + 0.34, by + 0.34, bz + 0.21], 0.018, ironColor);
          for (const side of [-1, 1]) staticParts.rod(iron, [wx + side * 0.34, by, bz + 0.21],
            [wx + side * 0.34, by + 0.34, bz + 0.21], 0.018, ironColor);
        }
      }
      for (const face of [-1, 1]) {
        for (const sideZ of [-0.26, 0.26]) {
          pane(wxCenter + face * (floorWidth / 2 + 0.025), windowY, wzCenter + sideZ * floorDepth, 0.38,
            index * 13 + floor * 3 + (sideZ < 0 ? 1 : 4) + face, face);
        }
      }
    }
    staticParts.box(iron, [x, 2.22, z + depth / 2 + 0.05], [0.52, 1.03, 0.035], 0, ironColor);
    staticParts.box(windowLevels[2], [x, 2.38, z + depth / 2 + 0.075], [0.35, 0.46, 0.025]);
    if (building.roof === 'pitched' || building.roof === 'clock') {
      staticParts.part(pitchedRoof, roof, [roofX, top, roofZ], [roofWidth + 0.28, 1.3, roofDepth + 0.28], null, building.roofColor);
      staticParts.box(trim, [roofX, top, roofZ], [roofWidth + 0.24, 0.09, roofDepth + 0.24], 0, ivory);
    } else {
      staticParts.box(roof, [roofX, top + 0.055, roofZ], [roofWidth + 0.22, 0.11, roofDepth + 0.22], 0, building.roofColor);
      if (!building.equipment) {
        const terraceWidth = roofWidth * 0.35;
        staticParts.box(plaster, [roofX - roofWidth * 0.08, top + 0.21, roofZ - roofDepth * 0.15],
          [terraceWidth, 0.31, roofDepth * 0.43], 0, upperColor);
        staticParts.box(roof, [roofX - roofWidth * 0.08, top + 0.4, roofZ - roofDepth * 0.15],
          [terraceWidth + 0.12, 0.07, roofDepth * 0.43 + 0.12], 0, building.roofColor);
      }
      const front = roofZ + roofDepth / 2 - 0.1;
      staticParts.rod(iron, [roofX - roofWidth / 2, top + 0.5, front], [roofX + roofWidth / 2, top + 0.5, front], 0.018, ironColor);
      for (let post = 0; post < 5; post++) {
        const px = roofX - roofWidth / 2 + roofWidth * post / 4;
        staticParts.rod(iron, [px, top + 0.1, front], [px, top + 0.5, front], 0.018, ironColor);
      }
    }
    if (building.equipment === 'tank') {
      staticParts.part(cylinder, roof, [roofX + 0.55, top + 0.5, roofZ - 0.5], [0.27, 0.65, 0.27], null, '#899b8e');
      staticParts.part(cone, roof, [roofX + 0.55, top + 0.84, roofZ - 0.5], [0.29, 0.12, 0.29], null, '#657c79');
    } else if (building.equipment === 'pergola') {
      for (const dx of [-0.42, 0.42]) for (const dz of [-0.42, 0.42]) {
        staticParts.rod(timber, [roofX + dx, top + 0.1, roofZ + dz], [roofX + dx, top + 1, roofZ + dz], 0.025, timberColor);
      }
      staticParts.box(trim, [roofX, top + 1.04, roofZ], [1.1, 0.06, 1.08], 0, '#bda581');
    } else if (building.equipment === 'monitor') {
      staticParts.box(plaster, [x, top + 0.65, z], [1.35, 0.42, 1.7], 0, upperColor);
      staticParts.box(roof, [x, top + 0.94, z], [1.5, 0.08, 1.85], 0, building.roofColor);
      for (const dx of [-0.4, 0.4]) pane(x + dx, top + 0.67, z + 0.86, 0.32, index + dx * 5);
    }
    if (building.awning) {
      const canopyTilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.13);
      for (let stripe = 0; stripe < 8; stripe++) {
        staticParts.box(trim, [x - width * 0.4 + (stripe + 0.5) * width * 0.1, 2.96, z + depth / 2 + 0.31],
          [width * 0.1, 0.045, 0.8], canopyTilt, stripe % 2 ? '#b47e68' : ivory);
      }
    }
    if (building.roof === 'clock') {
      staticParts.box(plaster, [x, top + 0.7, z], [0.65, 0.85, 0.65], 0, walls[0]);
      staticParts.part(cone, roof, [x, top + 1.23, z], [0.55, 0.34, 0.55], null, roofs[0]);
      staticParts.part(cylinder, trim, [x, top + 0.77, z + 0.34], [0.21, 0.025, 0.21],
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), ivory);
      staticParts.rod(iron, [x, top + 0.77, z + 0.37], [x - 0.13, top + 0.84, z + 0.37], 0.013, ironColor);
      staticParts.rod(iron, [x, top + 0.77, z + 0.37], [x + 0.1, top + 0.91, z + 0.37], 0.013, ironColor);
    }
    buildings.push({ ...building, height: buildingHeight(building) });
  }

  function planter(x, y, z, large = false) {
    const size = large ? 0.32 : 0.2;
    staticParts.part(pot, timber, [x, y + size * 0.45, z], [size, size * 0.9, size], null, '#927654');
    staticParts.rod(timber, [x, y + 0.1, z], [x, y + (large ? 1.55 : 0.6), z], large ? 0.06 : 0.025, '#826a4e');
    const crown = y + (large ? 1.5 : 0.52);
    for (const [dx, dy, dz] of [[0, 0.12, 0], [-0.2, 0, 0.08], [0.18, 0.02, -0.08]]) {
      const radius = large ? 0.43 : 0.2;
      staticParts.part(sphere, greenery, [x + dx * (large ? 1 : 0.5), crown + dy, z + dz],
        [radius, radius * 0.85, radius], null, dx < 0 ? '#67845d' : '#577563');
    }
    planting.push([x, y, z]);
  }
  for (const [x, z] of [[-11.25, -11.9], [-2.15, -15.8], [10.7, -7.2], [10.8, -17.9]]) planter(x, 1.7, z, true);
  for (const [x, y, z] of [[-6.1, 1.05, 10.2], [-0.9, 1.05, 10.2], [-0.9, 1.05, 5.1],
    [-1.9, 1.7, -17.15], [1.9, 1.7, -16.9], [10.05, 1.3, 2.9], [12.1, 1.3, 1.98]]) planter(x, y, z);

  function lantern(x, y, z) {
    staticParts.rod(iron, [x, y, z], [x, y + 2.3, z], 0.027, ironColor);
    staticParts.box(glow, [x, y + 2.16, z], [0.12, 0.19, 0.12]);
    staticParts.box(iron, [x, y + 2.3, z], [0.22, 0.055, 0.22], 0, ironColor);
  }
  function festoon(start, end, bulbs) {
    let previous;
    for (let i = 0; i <= bulbs; i++) {
      const t = i / bulbs;
      const position = start.map((value, axis) => THREE.MathUtils.lerp(value, end[axis], t));
      position[1] -= Math.sin(t * Math.PI) * 0.25;
      if (previous) staticParts.rod(iron, previous, position, 0.009, ironColor);
      if (i > 0 && i < bulbs) staticParts.part(sphere, glow, [position[0], position[1] - 0.04, position[2]], [0.035, 0.045, 0.035]);
      previous = position;
    }
  }
  for (const [x, z] of [[-10.5, -11.1], [-6.1, -11.1], [-2, -11.1], [2, -11.1], [5.6, -11.1], [9, -10.9]]) lantern(x, 1.7, z);
  festoon([-10.5, 4, -11.1], [-6.1, 4, -11.1], 16);
  festoon([-6.1, 4, -11.1], [-2, 4, -11.1], 16);
  festoon([2, 4, -11.1], [5.6, 4, -11.1], 14);
  festoon([5.6, 4, -11.1], [9, 4, -10.9], 14);
  for (const x of [-6.1, -0.95]) lantern(x, 1.05, 6.8);
  festoon([-6.1, 3.35, 6.8], [-0.95, 3.35, 6.8], 20);
  lantern(10.1, 1.3, 5);
  lantern(14.1, 1.3, 2.1);

  function crate(x, y, z, size = 0.43) {
    staticParts.box(timber, [x, y + size / 2, z], [size, size, size], 0, '#ac8b5e');
    for (const dz of [-size / 2 - 0.01, size / 2 + 0.01]) {
      for (const dy of [size * 0.2, size * 0.8]) {
        staticParts.box(timber, [x, y + dy, z + dz], [size + 0.04, 0.035, 0.025], 0, '#d2b58a');
      }
    }
  }
  const stallColors = ['#b47565', '#768f82', '#b39462'];
  for (const [index, x] of [-5.25, -3.45, -1.65].entries()) {
    const z = 6.05;
    staticParts.box(timber, [x, 1.4, z + 0.25], [1.35, 0.7, 0.65], 0, '#9a7c57');
    staticParts.box(trim, [x, 1.78, z + 0.25], [1.47, 0.06, 0.73], 0, ivory);
    for (const px of [x - 0.72, x + 0.72]) {
      for (const pz of [z - 0.42, z + 0.65]) staticParts.rod(iron, [px, 1.05, pz], [px, 2.85, pz], 0.026, ironColor);
    }
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.12);
    for (let stripe = 0; stripe < 8; stripe++) {
      staticParts.box(trim, [x - 0.82 + (stripe + 0.5) * 0.205, 2.83, z + 0.1],
        [0.205, 0.05, 1.35], tilt, stripe % 2 ? stallColors[index] : ivory);
    }
    staticParts.box(trim, [x, 2.72, z + 0.78], [1.64, 0.16, 0.05], 0, stallColors[index]);
    crate(x - 0.5, 1.05, z + 0.92, 0.3);
    for (let basket = 0; basket < 3; basket++) {
      const bx = x - 0.4 + basket * 0.4;
      staticParts.box(timber, [bx, 1.83, z + 0.25], [0.29, 0.07, 0.3], 0, '#b49165');
      for (let item = 0; item < 3; item++) {
        staticParts.part(sphere, plaster, [bx - 0.07 + item * 0.07, 1.91, z + 0.25],
          [0.055, 0.055, 0.055], null, index === 0 ? '#d9aa65' : index === 1 ? '#8caa73' : '#b57363');
      }
    }
  }
  for (const x of [-5, -3.3, -1.6]) {
    staticParts.rod(iron, [x, 1.05, 9.35], [x, 1.52, 9.35], 0.045, ironColor);
    staticParts.part(cylinder, timber, [x, 1.54, 9.35], [0.32, 0.055, 0.32], null, '#b8a180');
    for (const dz of [-0.53, 0.53]) {
      staticParts.box(timber, [x, 1.42, 9.35 + dz], [0.31, 0.05, 0.31], 0, timberColor);
      staticParts.rod(iron, [x, 1.05, 9.35 + dz], [x, 1.42, 9.35 + dz], 0.035, ironColor);
      staticParts.box(timber, [x, 1.65, 9.35 + dz * 1.25], [0.31, 0.25, 0.045], 0, timberColor);
    }
  }
  for (const [x, z, lift] of [[12.55, 3.0, 0], [13.05, 3, 0], [13.55, 3, 0],
    [12.8, 3.5, 0], [13.3, 3.5, 0], [13.05, 3, 0.43]]) crate(x, 1.3 + lift, z);
  for (const [x, z, height] of [[-6.4, 8.8, 1.05], [14.4, 4.1, 1.3]]) {
    staticParts.rod(iron, [x, height, z], [x, height + 0.24, z], 0.07, ironColor);
    staticParts.rod(iron, [x - 0.13, height + 0.22, z], [x + 0.13, height + 0.22, z], 0.045, ironColor);
  }
  staticParts.rod(timber, [-6.4, 1.2, 8.8], [-6.87, 0.55, 8.8], 0.014, '#c3ac80');
  staticParts.rod(timber, [-6.87, 0.55, 8.8], [-7.34, 0.2, 8.8], 0.014, '#c3ac80');
  staticParts.rod(timber, [14.4, 1.45, 4.1], [14.85, 0.23, 4.1], 0.014, '#c3ac80');
  const staticMeshes = staticParts.finish();

  const peopleTemplate = new THREE.Group();
  const person = createGeometryBatch(peopleTemplate, 'Harbour people');
  person.box(plaster, [0, 0.355, 0], [0.16, 0.235, 0.12], 0, '#ffffff');
  for (const side of [-1, 1]) {
    person.rod(plaster, [side * 0.11, 0.43, 0], [side * 0.14, 0.255, 0.015], 0.025, '#ffffff');
    person.rod(iron, [side * 0.045, 0.22, 0], [side * 0.045, 0.04, 0.035], 0.028, '#ffffff');
    person.box(iron, [side * 0.045, 0.02, 0.045], [0.065, 0.04, 0.105], 0, '#ffffff');
  }
  person.part(sphere, trim, [0, 0.57, 0], [0.085, 0.095, 0.085], null, '#ffffff');
  person.part(sphere, iron, [0, 0.63, -0.012], [0.086, 0.045, 0.08], null, '#43555b');
  person.finish();
  const people = [
    [-5.25, 1.05, 5.72, 0, 1], [-3.45, 1.05, 5.72, 0, 1], [-1.65, 1.05, 5.72, 0, 1],
    [-5.15, 1.05, 7.18, Math.PI, 0.96], [-4.65, 1.05, 7.3, Math.PI, 0.95],
    [-3.55, 1.05, 7.12, Math.PI, 1], [-3.1, 1.05, 7.28, Math.PI, 0.78],
    [-1.55, 1.05, 7.18, Math.PI, 1],
    [-5.55, 1.05, 9.2, 1.4, 1], [-4.45, 1.05, 9.25, -1.4, 0.95],
    [-3.9, 1.05, 9.2, 1.4, 0.94], [-2.7, 1.05, 9.25, -1.4, 1],
    [-2.1, 1.05, 9.2, 1.4, 0.92], [-1.1, 1.05, 9.25, -1.4, 1],
    [-9.7, 1.7, -6.85, Math.PI, 1], [-9.2, 1.7, -6.95, -2.5, 0.93],
    [-5.9, 1.7, -6.9, 2.5, 1], [-5.45, 1.7, -6.9, -2.5, 0.9],
    [-2.2, 1.7, -7.15, -1.2, 0.95], [1.95, 1.7, -7.15, 1.2, 1],
    [-7.3, 1.7, -12.1, 1.6, 1], [-6.8, 1.7, -12.1, -1.6, 0.92],
    [5.6, 1.7, -12.1, 1.4, 1], [6.1, 1.7, -12.1, -1.4, 0.97],
    [11.1, 1.3, 3.4, 0.5, 1], [11.5, 1.3, 3.55, -1, 1],
    [14.1, 1.3, 4.55, -1.5, 0.95], [10.15, 1.3, 3.65, 1.5, 0.94],
  ];
  for (const [x, z, scale] of [[0.1, 1.25, 0.92], [-0.3, 1.55, 0.75], [0.32, 1.75, 1], [0.95, 1.6, 1]]) {
    const position = new THREE.Vector3(x, FERRIS_WHEEL.deckHeight, z)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), FERRIS_WHEEL.yaw);
    people.push([position.x + FERRIS_WHEEL.x, position.y, position.z + FERRIS_WHEEL.z, FERRIS_WHEEL.yaw + Math.PI, scale]);
  }
  function walkingCurve(points, height) {
    // Rounded segments stay inside the walkway; interpolating splines can overshoot into stalls.
    const corners = points.map(([x, z]) => new THREE.Vector3(x, height, z));
    const rounded = corners.map((corner, index) => {
      const previous = corners[(index + corners.length - 1) % corners.length];
      const next = corners[(index + 1) % corners.length];
      const incoming = previous.clone().sub(corner), outgoing = next.clone().sub(corner);
      const radius = Math.min(0.16, incoming.length() * 0.25, outgoing.length() * 0.25);
      if (radius <= 0) throw new RangeError('Walking route corners must be distinct');
      return {
        corner, start: corner.clone().addScaledVector(incoming.normalize(), radius),
        end: corner.clone().addScaledVector(outgoing.normalize(), radius),
      };
    });
    const curve = new THREE.CurvePath();
    rounded.forEach(({ corner, start, end }, index) => {
      curve.add(new THREE.QuadraticBezierCurve3(start, corner, end));
      curve.add(new THREE.LineCurve3(end, rounded[(index + 1) % rounded.length].start));
    });
    return curve;
  }
  const walkers = WALKING_ROUTES.map((route, index) => {
    const points = route.points.length === 2
      ? [...route.points, ...[...route.points].reverse().map(([x, z]) => [x, z + 0.16])]
      : route.points;
    const curve = walkingCurve(points, route.height);
    return { ...route, curve, length: curve.getLength(), phase: index * 0.13 };
  });
  const clothing = ['#647f89', '#b37868', '#c6aa72', '#4a6570', '#9daa91', '#dbccb1'].map(color => new THREE.Color(color));
  const skin = ['#cfac8c', '#d7bc99', '#a78569'].map(color => new THREE.Color(color));
  const peopleMeshes = peopleTemplate.children.map(mesh => {
    const instances = new THREE.InstancedMesh(mesh.geometry, mesh.material, people.length + walkers.length);
    instances.name = mesh.name;
    instances.castShadow = instances.receiveShadow = true;
    instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instances.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, -4), 33);
    for (let i = 0; i < instances.count; i++) {
      instances.setColorAt(i, mesh.material === trim ? skin[i % skin.length]
        : mesh.material === plaster ? clothing[i % clothing.length] : new THREE.Color('#55626a'));
    }
    group.add(instances);
    return instances;
  });
  const personTransform = new THREE.Object3D();
  people.forEach(([x, y, z, yaw, scale], index) => {
    personTransform.position.set(x, y, z);
    personTransform.rotation.set(0, yaw, 0);
    personTransform.scale.setScalar(scale);
    personTransform.updateMatrix();
    peopleMeshes.forEach(mesh => mesh.setMatrixAt(index, personTransform.matrix));
  });

  function mooredBoat(name, x, z, yaw, paint, cabin) {
    const boat = new THREE.Group();
    boat.name = `animated_moored_${name}`;
    boat.position.set(x, -0.07, z);
    boat.rotation.y = yaw;
    group.add(boat);
    const parts = createGeometryBatch(boat, name, new Set([glow]));
    const shape = new THREE.Shape();
    shape.moveTo(0, -1.1); shape.lineTo(0.43, -0.62); shape.lineTo(0.43, 0.7);
    shape.lineTo(0.29, 1); shape.lineTo(-0.29, 1); shape.lineTo(-0.43, 0.7); shape.lineTo(-0.43, -0.62); shape.closePath();
    const hull = new THREE.ExtrudeGeometry(shape, {
      depth: 0.24, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.025, bevelSegments: 1, steps: 1,
    });
    hull.rotateX(-Math.PI / 2).translate(0, -0.1, 0);
    parts.part(hull, roof, [0, 0, 0], [1, 1, 1], null, paint);
    parts.box(timber, [0, 0.16, 0], [0.69, 0.035, 1.58], 0, timberColor);
    for (const bz of [-0.53, 0.42]) parts.box(timber, [0, 0.25, bz], [0.64, 0.055, 0.16], 0, '#c5ac81');
    if (cabin) {
      parts.box(plaster, [0, 0.41, -0.25], [0.52, 0.48, 0.62], 0, walls[2]);
      parts.box(roof, [0, 0.69, -0.25], [0.64, 0.07, 0.8], 0, paint);
      parts.box(windowLevels[1], [0, 0.47, 0.075], [0.35, 0.24, 0.025]);
    } else {
      parts.rod(timber, [0, 0.18, -0.15], [0, 1.9, -0.15], 0.022, '#a18a63');
      parts.box(trim, [0, 1.25, -0.15], [0.7, 0.04, 0.6], 0, ivory);
    }
    parts.rod(iron, [0.23, 0.18, -0.5], [0.23, 1.15, -0.5], 0.018, ironColor);
    parts.box(glow, [0.23, 1.1, -0.5], [0.075, 0.09, 0.075]);
    parts.finish();
    hull.dispose();
    return { group: boat, x, z, yaw, phase: cabin ? 1.2 : 0.3 };
  }
  const boats = [
    mooredBoat('Market_skiff', -7.75, 8.8, 0.03, '#a87961', false),
    mooredBoat('Harbour_courier', 15.3, 3.8, 0.08, '#638780', true),
  ];
  for (const [x, y, z, intensity, distance] of [[-3.7, 3.2, 7.7, 8, 6.5], [-5.2, 4.5, -11.4, 12, 8],
    [1, 3.3, -8, 9, 7], [12, 3.4, 3.8, 5, 5.5]]) {
    const light = new THREE.PointLight('#ffc182', intensity, distance, 2);
    light.name = 'Neighbourhood gathering light';
    light.position.set(x, y, z);
    group.add(light);
    lights.push({ light, intensity });
  }
  const walkerPosition = new THREE.Vector3();
  const walkerDirection = new THREE.Vector3();
  function update(time) {
    if (!Number.isFinite(time) || time < 0) throw new RangeError('Harbour time must be finite and nonnegative');
    walkers.forEach((walker, index) => {
      const phase = (time * walker.speed / walker.length + walker.phase) % 1;
      walker.curve.getPointAt(phase, walkerPosition);
      walker.curve.getTangentAt(phase, walkerDirection);
      personTransform.position.copy(walkerPosition);
      personTransform.position.y += (Math.sin(time * 3 + index) + 1) * 0.003;
      personTransform.rotation.set(0, Math.atan2(walkerDirection.x, walkerDirection.z), 0);
      personTransform.scale.setScalar(0.95);
      personTransform.updateMatrix();
      peopleMeshes.forEach(mesh => mesh.setMatrixAt(people.length + index, personTransform.matrix));
    });
    peopleMeshes.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
    boats.forEach(boat => {
      boat.group.position.y = -0.07 + Math.sin(time * 0.85 + boat.phase) * 0.018;
      boat.group.rotation.set(Math.sin(time * 0.7 + boat.phase) * 0.009, boat.yaw,
        Math.sin(time * 0.85 + boat.phase) * 0.012);
    });
  }
  function setDusk(dusk) {
    windowLevels.forEach((window, index) => {
      window.emissiveIntensity = (dusk ? [0.45, 0.95, 1.65] : [0.2, 0.5, 0.9])[index];
    });
    glow.emissiveIntensity = dusk ? 1.45 : 0.5;
    lights.forEach(({ light, intensity }) => { light.intensity = intensity * (dusk ? 1 : 0.55); });
  }
  for (const geometry of [sphere, cylinder, pot, cone, pitchedRoof]) geometry.dispose();
  update(0);
  return {
    group, buildings, platforms: HARBOUR_PLATFORMS, walkers, people, boats, lights,
    staticMeshes, peopleMeshes, planting, windowLevels, update, setDusk,
  };
}
