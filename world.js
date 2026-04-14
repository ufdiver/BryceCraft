import * as THREE from 'three';
import { state, GRID_SIZE, CELL, KEY_PRICE, BOMB_PRICE, GUN_PRICE, PELLET_PRICE } from './state.js';
import { createHumanNPC, createFerryman, createFoxNPC, createSlimeEnemy, createTree, createGhostEnemy, createBoat } from './entities.js';
import { updateHUD, showMsg } from './ui.js';

export function generateMaze() {
    let maze = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(1));
    state.corridorCells = [];
    function carve(x, y) {
        maze[y][x] = 0;
        let dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]].sort(() => Math.random() - 0.5);
        for (let [dx, dy] of dirs) {
            let nx = x + dx, ny = y + dy;
            if (nx > 0 && nx < GRID_SIZE - 1 && ny > 0 && ny < GRID_SIZE - 1 && maze[ny][nx] === 1) {
                const mx = x + dx / 2, my = y + dy / 2;
                maze[my][mx] = 0;
                state.corridorCells.push({ x: mx, y: my });
                carve(nx, ny);
            }
        }
    }
    carve(1, 1);
    return maze;
}

export function getAccessibleCells(startX, startY, blockX, blockY) {
    let cells = [], queue = [{ x: startX, y: startY }], vis = new Set([`${startX},${startY}`]);
    while (queue.length > 0) {
        let curr = queue.shift();
        cells.push(curr);
        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
            let nx = curr.x + dx, ny = curr.y + dy;
            if (nx > 0 && nx < GRID_SIZE && ny > 0 && ny < GRID_SIZE && state.mazeData[ny][nx] === 0 && !vis.has(`${nx},${ny}`) && !(nx === blockX && ny === blockY)) {
                vis.add(`${nx},${ny}`);
                queue.push({ x: nx, y: ny });
            }
        });
    }
    return cells;
}

export function spawnKeyShop(gx, gy, id, col, yOff = 0) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.4 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), mat); stem.rotation.x = Math.PI / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 16), mat); ring.position.z = 0.35;
    const bit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.06), mat); bit.position.set(0.08, 0, -0.28);
    group.add(stem, ring, bit);
    group.position.set(gx * CELL, 1.5 + yOff, gy * CELL);
    group.userData = { type: 'shop', id, price: KEY_PRICE, color: col };
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.0, 1.5), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.userData = group.userData; hitBox.userData.root = group;
    group.add(hitBox);
    state.scene.add(group); state.interactables.push(group); state.entities.push(group);
}

export function spawnBombShop(gx, gy, yOff = 0) {
    const group = new THREE.Group();
    const bomb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0x884422 }));
    wick.position.y = 0.45;
    group.add(bomb, wick);
    group.position.set(gx * CELL, 1 + yOff, gy * CELL);
    group.userData = { type: 'shop', id: 'Bomb', price: BOMB_PRICE, color: 0x333333 };
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.0, 1.5), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.userData = group.userData; hitBox.userData.root = group;
    group.add(hitBox);
    state.scene.add(group); state.interactables.push(group); state.entities.push(group);
}

export function spawnGunShop(gx, gy, yOff = 0) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.15), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    handle.position.set(-0.15, -0.2, 0); handle.rotation.z = -0.2;
    group.add(body, handle);
    group.position.set(gx * CELL, 1.2 + yOff, gy * CELL);
    group.userData = { type: 'shop', id: 'Pistol', price: GUN_PRICE, color: 0x555555 };
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.0, 1.5), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.userData = group.userData; hitBox.userData.root = group;
    group.add(hitBox);
    state.scene.add(group); state.interactables.push(group); state.entities.push(group);
}

export function spawnPelletShop(gx, gy, yOff = 0) {
    const group = new THREE.Group();
    const pellet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), new THREE.MeshStandardMaterial({ 
        color: 0xffff00, 
        emissive: 0xffff00, 
        emissiveIntensity: 1.5 
    }));
    group.add(pellet);
    group.position.set(gx * CELL, 1.2 + yOff, gy * CELL);
    group.userData = { type: 'shop', id: 'Pellet', price: PELLET_PRICE, color: 0xffff00 };
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.0, 1.5), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.userData = group.userData; hitBox.userData.root = group;
    group.add(hitBox);
    state.scene.add(group); state.interactables.push(group); state.entities.push(group);
}

export function spawnDoor(gx, gy, id, col, yOff = 0) {
    // Check cross-neighbors to see where the walls are to bridge them
    const hasLeftWall = gx > 0 && state.mazeData[gy][gx - 1] === 1;
    const hasRightWall = gx < GRID_SIZE - 1 && state.mazeData[gy][gx + 1] === 1;
    const hasTopWall = gy > 0 && state.mazeData[gy - 1][gx] === 1;
    const hasBotWall = gy < GRID_SIZE - 1 && state.mazeData[gy + 1][gx] === 1;

    // Door is BoxGeometry(Width, Height, Depth). Default is spanning X.
    const d = new THREE.Mesh(
        new THREE.BoxGeometry(CELL * 2.2, CELL, 0.8), // Even wider to ensure bridge
        new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.6 })
    );
    d.position.set(gx * CELL, (CELL / 2) + yOff, gy * CELL);

    // Logic: Identify which axis the walls are on.
    // If walls are at Top/Bottom, corridor is East/West. Door must span Z (North/South).
    if (hasTopWall && hasBotWall) {
        d.rotation.y = Math.PI / 2;
    } else if (hasLeftWall && hasRightWall) {
        // Walls are Left/Right, corridor is North/South. Door spans X.
        d.rotation.y = 0;
    } else {
        // Corner or T-junction: prefer blocking the narrower path or default
        if (hasTopWall || hasBotWall) d.rotation.y = Math.PI / 2;
    }

    d.userData = { type: 'door', id, color: col };
    state.scene.add(d); state.interactables.push(d); state.collidables.push(d);
}

export function startLevel() {
    state.isDead = false;
    document.getElementById('death-overlay').style.opacity = 0;
    document.getElementById('death-overlay').style.background = 'rgba(180, 0, 0, 0)';
    document.getElementById('death-text').style.transform = 'scale(0.5)';

    // Clean up old scene
    state.entities.forEach(e => state.scene.remove(e));
    state.collidables.forEach(w => state.scene.remove(w));
    state.enemies.forEach(e => state.scene.remove(e));
    state.interactables = []; state.entities = []; state.collidables = []; state.enemies = [];
    state.lavaPatches = []; state.laserBeams = []; state.skyPortal = null; state.grenadeProjectiles = [];
    state.isFlying = false; state.launchPlate = null;

    // Refresh Lights for safety
    state.scene.children.filter(c => c.isLight).forEach(l => {
        l.intensity = (l instanceof THREE.AmbientLight) ? 0.6 : 0.8;
    });
    
    state.inventory = []; state.discoveredItems = [];
    state.explored = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
    
    const yOffset = state.currentLevel === 5 ? 5 : 0;
    state.mazeData = generateMaze();
    
    // Level 5 Entrance - Open the outer wall so player can enter from sky
    if (state.currentLevel === 5) state.mazeData[1][0] = 0;

    // Level 5 Sky Ground
    if (state.currentLevel === 5) {
        const gGeo = new THREE.PlaneGeometry(1000, 1000);
        const gMat = new THREE.MeshStandardMaterial({ color: 0x228B22 }); // Grass Green
        const g = new THREE.Mesh(gGeo, gMat);
        g.rotation.x = -Math.PI / 2;
        g.position.y = 0;
        state.scene.add(g); state.entities.push(g);
        
        // Player starts outside maze on ground
        state.camera.position.set(-15, 2, -15);
        state.camera.rotation.set(0, 0, 0); 
        state.camera.lookAt(0, 2, 0); // Look at the floating maze base
    } else {
        // Standard levels: Spawn inside and look toward center
        const mazeCenter = (GRID_SIZE * CELL) / 2;
        state.camera.position.set(CELL, 2, CELL);
        state.camera.rotation.set(0, 0, 0);
        state.camera.lookAt(mazeCenter, 2, mazeCenter); 
    }
    const occupied = new Set(["1,1"]);

    // Critical Path Calculation
    let q = [{ x: 1, y: 1, path: [] }], vis = new Set(["1,1"]), mainPath = [];
    while (q.length > 0) {
        let curr = q.shift();
        if (curr.path.length > mainPath.length) mainPath = curr.path;
        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
            let nx = curr.x + dx, ny = curr.y + dy;
            if (nx > 0 && nx < GRID_SIZE && ny > 0 && ny < GRID_SIZE && state.mazeData[ny][nx] === 0 && !vis.has(`${nx},${ny}`)) {
                vis.add(`${nx},${ny}`); q.push({ x: nx, y: ny, path: [...curr.path, { x: nx, y: ny }] });
            }
        });
    }

    // Helper to find a "straight" corridor segment for better door bridging
    const findStraightSegment = (path, targetIdx) => {
        for (let offset = 0; offset < 5; offset++) {
            for (let dir of [1, -1]) {
                const idx = targetIdx + (offset * dir);
                if (idx < 0 || idx >= path.length) continue;
                const p = path[idx];
                const hasLeftWall = p.x > 0 && state.mazeData[p.y][p.x - 1] === 1;
                const hasRightWall = p.x < GRID_SIZE - 1 && state.mazeData[p.y][p.x + 1] === 1;
                const hasTopWall = p.y > 0 && state.mazeData[p.y - 1][p.x] === 1;
                const hasBotWall = p.y < GRID_SIZE - 1 && state.mazeData[p.y + 1][p.x] === 1;
                if ((hasLeftWall && hasRightWall) || (hasTopWall && hasBotWall)) return p;
            }
        }
        return path[targetIdx]; // Fallback if no straight segment found
    };

    // Place doors on straight corridor segments near 35% and 70% mark
    const rDoor = findStraightSegment(mainPath, Math.floor(mainPath.length * 0.35));
    const bDoor = findStraightSegment(mainPath, Math.floor(mainPath.length * 0.70));
    const trophy = mainPath[mainPath.length - 1];
    occupied.add(`${rDoor.x},${rDoor.y}`);
    occupied.add(`${bDoor.x},${bDoor.y}`);
    occupied.add(`${trophy.x},${trophy.y}`);

    // Build Zones
    const zone1 = getAccessibleCells(1, 1, rDoor.x, rDoor.y);
    const zone2 = getAccessibleCells(rDoor.x, rDoor.y, bDoor.x, bDoor.y);

    // Spawns
    spawnDoor(rDoor.x, rDoor.y, "Red Key", 0xff0000, yOffset);
    spawnDoor(bDoor.x, bDoor.y, "Blue Key", 0x0000ff, yOffset);

    const getUnoccupied = (zone) => {
        const filtered = zone.filter(p => !occupied.has(`${p.x},${p.y}`));
        return filtered[Math.floor(Math.random() * filtered.length)];
    };

    if (zone1.length > 0) {
        const rk = getUnoccupied(zone1);
        if (rk) { spawnKeyShop(rk.x, rk.y, "Red Key", 0xff0000, yOffset); occupied.add(`${rk.x},${rk.y}`); }
        const bs1 = getUnoccupied(zone1);
        if (bs1) { spawnBombShop(bs1.x, bs1.y, yOffset); occupied.add(`${bs1.x},${bs1.y}`); }
    }
    if (zone2.length > 0) {
        const bk = getUnoccupied(zone2);
        if (bk) { spawnKeyShop(bk.x, bk.y, "Blue Key", 0x0000ff, yOffset); occupied.add(`${bk.x},${bk.y}`); }

        // LEVEL 2+ EXCLUSIVE: PISTOL SHOP
        if (state.currentLevel >= 2) {
            const gunCell = getUnoccupied(zone2);
            if (gunCell) { spawnGunShop(gunCell.x, gunCell.y, yOffset); occupied.add(`${gunCell.x},${gunCell.y}`); }
        }

        // LEVEL 3+ EXCLUSIVE: PELLET SHOP
        if (state.currentLevel >= 3) {
            const pelletCell = getUnoccupied(zone2);
            if (pelletCell) { spawnPelletShop(pelletCell.x, pelletCell.y, yOffset); occupied.add(`${pelletCell.x},${pelletCell.y}`); }
        }
    }

    // Visual World
    const tex = new THREE.TextureLoader();
    const wallHue = (state.currentLevel * 60) % 360;
    const wallMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(`hsl(${wallHue}, 40%, 40%)`),
        map: tex.load('https://threejs.org/examples/textures/brick_diffuse.jpg')
    });
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x228B22, // Fallback Green
        map: tex.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg') 
    });

    // Maze Floor & Walls
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            // Thick Platform Floor (instead of plane)
            const f = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.4, CELL), floorMat);
            f.position.set(x * CELL, yOffset - 0.2, y * CELL);
            f.userData = { type: 'floor', yTop: yOffset };
            state.scene.add(f); state.entities.push(f);

            if (state.mazeData[y][x] === 1) {
                const w = new THREE.Mesh(new THREE.BoxGeometry(CELL, CELL, CELL), wallMat);
                w.position.set(x * CELL, (CELL / 2) + yOffset, y * CELL);
                w.userData = { type: 'destructible' };
                state.scene.add(w); state.collidables.push(w);
            }
        }
    }

    // --- LAVA PATCHES (level 2+) ---
    if (state.currentLevel >= 2) {
        const lavaCount = 6 + state.currentLevel * 2;
        let placed = 0, attempts = 0;
        while (placed < lavaCount && attempts < 500) {
            attempts++;
            const gx = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
            const gy = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
            if (state.mazeData[gy][gx] !== 0) continue;
            if (Math.abs(gx - 1) + Math.abs(gy - 1) < 4) continue;

            // Only place in corridors (walls on 2 opposite sides)
            const wL = state.mazeData[gy][gx - 1] === 1;
            const wR = state.mazeData[gy][gx + 1] === 1;
            const wU = state.mazeData[gy - 1][gx] === 1;
            const wD = state.mazeData[gy + 1][gx] === 1;

            let wSize = 0, hSize = 0;
            if (wL && wR && !wU && !wD) {
                // Corridor runs North-South, span East-West
                wSize = CELL; hSize = 1.6;
            } else if (wU && wD && !wL && !wR) {
                // Corridor runs East-West, span North-South
                wSize = 1.6; hSize = CELL;
            } else {
                continue; // Invalid, not a corridor
            }

            const wx = gx * CELL, wz = gy * CELL;
            const lavaMat = new THREE.MeshStandardMaterial({
                color: 0xff3300,
                emissive: new THREE.Color(0xff4400),
                emissiveIntensity: 1.2,
                roughness: 0.9
            });
            const lava = new THREE.Mesh(new THREE.BoxGeometry(wSize, 0.06, hSize), lavaMat);
            lava.position.set(wx, 0.04 + yOffset, wz);
            lava.userData = { type: 'lava', cx: wx, cz: wz, hx: (wSize / 2) - 0.15, hz: (hSize / 2) - 0.15 };
            state.scene.add(lava);
            state.entities.push(lava);
            state.lavaPatches.push(lava);
            placed++;
        }
    }

    // --- LASER BEAMS (level 3+) ---
    if (state.currentLevel >= 3) {
        const laserCount = 4 + state.currentLevel * 2;
        let placed = 0, attempts = 0;
        while (placed < laserCount && attempts < 500) {
            attempts++;
            const gx = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
            const gy = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
            const posKey = `${gx},${gy}`;
            
            if (state.mazeData[gy][gx] !== 0) continue;
            if (Math.abs(gx - 1) + Math.abs(gy - 1) < 4) continue;

            // Don't place on top of lava or existing traps/lasers
            if (occupied.has(posKey)) continue;
            if (state.lavaPatches.some(lp => lp.userData.cx === gx * CELL && lp.userData.cz === gy * CELL)) continue;

            const wL = state.mazeData[gy][gx - 1] === 1;
            const wR = state.mazeData[gy][gx + 1] === 1;
            const wU = state.mazeData[gy - 1][gx] === 1;
            const wD = state.mazeData[gy + 1][gx] === 1;

            let wSize = 0, hSize = 0, hx = 0, hz = 0;
            if (wL && wR && !wU && !wD) {
                wSize = CELL; hSize = 0.15;
                hx = (CELL / 2) - 0.15; hz = 0.3;
            } else if (wU && wD && !wL && !wR) {
                wSize = 0.15; hSize = CELL;
                hx = 0.3; hz = (CELL / 2) - 0.15;
            } else {
                continue;
            }

            const isHigh = Math.random() > 0.5;
            const wx = gx * CELL, wz = gy * CELL;

            if (isHigh) {
                // High laser fence (blocks jumps, but allows crouching under y=1.5)
                [1.5, 3.0, 4.5].forEach(yPos => {
                    const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.8 });
                    const lb = new THREE.Mesh(new THREE.BoxGeometry(wSize, 0.1, hSize), mat);
                    lb.position.set(wx, yPos + yOffset, wz);
                    lb.userData = { type: 'laser', cx: wx, cz: wz, cy: yPos + yOffset, hx, hz };
                    const glow = new THREE.Mesh(new THREE.BoxGeometry(wSize * 1.1, 0.25, hSize * 1.1), new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.4 }));
                    lb.add(glow);
                    state.scene.add(lb); state.entities.push(lb); state.laserBeams.push(lb);
                });
            } else {
                // Low laser (must jump over, y=0.5)
                const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
                const lb = new THREE.Mesh(new THREE.BoxGeometry(wSize, 0.1, hSize), mat);
                lb.position.set(wx, 0.5 + yOffset, wz);
                lb.userData = { type: 'laser', cx: wx, cz: wz, cy: 0.5 + yOffset, hx, hz };
                const glow = new THREE.Mesh(new THREE.BoxGeometry(wSize * 1.1, 0.25, hSize * 1.1), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 }));
                lb.add(glow);
                state.scene.add(lb); state.entities.push(lb); state.laserBeams.push(lb);
            }
            occupied.add(posKey);
            placed++;
        }
    }

    // --- LAUNCH PLATE (level 3 only) ---
    if (state.currentLevel === 3) {
        const shuffled = [...state.corridorCells].sort(() => Math.random() - 0.5);
        let plateCell = null;
        for (const cell of shuffled) {
            if (!occupied.has(`${cell.x},${cell.y}`) && Math.abs(cell.x - 1) + Math.abs(cell.y - 1) > 6) {
                plateCell = cell;
                break;
            }
        }
        if (plateCell) {
            occupied.add(`${plateCell.x},${plateCell.y}`);
            const px = plateCell.x * CELL, pz = plateCell.y * CELL;
            const plateMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.25, emissive: new THREE.Color(0x334455), emissiveIntensity: 0.4 });
            const plate = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.75, 0.1, CELL * 0.75), plateMat);
            plate.position.set(px, 0.06, pz);
            plate.userData = { type: 'launch_plate', cx: px, cz: pz, hx: (CELL * 0.75) / 2, hz: (CELL * 0.75) / 2 };
            state.scene.add(plate);
            state.entities.push(plate);
            state.launchPlate = plate;
        }
    }

    // Outside Area & Moat
    const worldSize = 300;
    const mazeCenter = (GRID_SIZE * CELL) / 2 - (CELL / 2);
    const worldPlane = new THREE.Mesh(new THREE.PlaneGeometry(worldSize, worldSize), floorMat);
    worldPlane.rotation.x = -Math.PI / 2; worldPlane.position.set(mazeCenter, -0.05, mazeCenter);
    state.scene.add(worldPlane); state.entities.push(worldPlane);

    const moatIn = (GRID_SIZE * CELL) / 2 + 25; // More grass space!
    const moatOut = moatIn + 20;
    state.waterBounds = { in: moatIn, out: moatOut, center: mazeCenter };

    // Moat
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x0044ff, transparent: true, opacity: 0.7 });
    const waterGeom = new THREE.RingGeometry(moatIn, moatOut, 64);
    const moat = new THREE.Mesh(waterGeom, waterMat);
    moat.rotation.x = -Math.PI / 2; moat.position.set(mazeCenter, 0.1, mazeCenter);
    state.scene.add(moat); state.entities.push(moat);
    state.waterBounds = { center: mazeCenter, in: moatIn, out: moatOut };

    // Boat
    state.boatMesh = createBoat();
    state.boatAngle = Math.random() * Math.PI * 2;
    state.boatRadius = (moatIn + moatOut) / 2;
    state.boatState = 'patrol';
    state.scene.add(state.boatMesh); state.entities.push(state.boatMesh);

    // Ferryman at Moat Edge
    state.ferrymanAngle = Math.PI * 0.75;
    const fx = mazeCenter + Math.cos(state.ferrymanAngle) * (moatIn - 1.5);
    const fz = mazeCenter + Math.sin(state.ferrymanAngle) * (moatIn - 1.5);
    const ferryman = createFerryman();
    ferryman.position.set(fx, 0, fz);
    ferryman.rotation.y = -state.ferrymanAngle + Math.PI;
    Object.assign(ferryman.userData, { type: 'math', difficulty: 2, isFerryman: true });
    state.scene.add(ferryman); state.interactables.push(ferryman); state.entities.push(ferryman);

    // Master Mentor on Outer Shore (Beyond the Moat)
    const mentorAngle = state.ferrymanAngle + Math.PI; // Opposite side
    const mx = mazeCenter + Math.cos(mentorAngle) * (moatOut + 5);
    const mz = mazeCenter + Math.sin(mentorAngle) * (moatOut + 5);
    const mentor = createHumanNPC(3); // Red shirt to stand out
    mentor.position.set(mx, 0, mz);
    mentor.rotation.y = -mentorAngle + Math.PI;
    Object.assign(mentor.userData, { type: 'mentor_choice' });
    state.scene.add(mentor); state.interactables.push(mentor); state.entities.push(mentor);

    // Trees
    for (let i = 0; i < 120; i++) {
        const angle = Math.random() * Math.PI * 2;
        const mazeBox = (GRID_SIZE * CELL) / 2 + 5;
        const distIn = mazeBox + Math.random() * (moatIn - mazeBox - 5);
        const distOut = moatOut + 10 + Math.random() * 60;
        const dist = Math.random() > 0.4 ? distOut : distIn;

        const tx = mazeCenter + Math.cos(angle) * dist;
        const tz = mazeCenter + Math.sin(angle) * dist;

        // Final safety check: skip if somehow inside the actual maze square
        if (Math.abs(tx - mazeCenter) < mazeBox && Math.abs(tz - mazeCenter) < mazeBox) { i--; continue; }

        const tree = createTree();
        tree.position.set(tx, 0, tz);
        state.scene.add(tree); state.entities.push(tree);
    }

    // NPCs
    const allWalkable = [...zone1, ...zone2, ...mainPath];
    allWalkable.forEach(p => {
        const distToSpawn = Math.abs(p.x - 1) + Math.abs(p.y - 1);
        const posKey = `${p.x},${p.y}`;
        if (Math.random() < 0.12 && distToSpawn > 2 && !occupied.has(posKey)) {
            occupied.add(posKey);
            const diff = distToSpawn < 8 ? 1 : (distToSpawn < 15 ? 2 : 3);
            const npc = Math.random() > 0.4 ? createHumanNPC(diff) : createFoxNPC(diff);
            npc.position.set(p.x * CELL, yOffset, p.y * CELL);
            Object.assign(npc.userData, { type: 'math', difficulty: diff });
            state.scene.add(npc); state.interactables.push(npc); state.entities.push(npc);
        }
    });

    // Enemies (Scaled by level)
    const baseCount1 = state.currentLevel === 1 ? 1 : (state.currentLevel === 2 ? 2 : 4);
    const baseCount2 = state.currentLevel === 1 ? 2 : (state.currentLevel === 2 ? 4 : 6);

    const targetZones = [
        { zone: zone1.length > 0 ? zone1 : mainPath, count: baseCount1 },
        { zone: zone2.length > 0 ? zone2 : mainPath, count: baseCount2 }
    ];

    targetZones.forEach(({ zone, count }) => {
        if (zone.length === 0) return;
        for (let i = 0; i < count; i++) {
            const p = zone[Math.floor(Math.random() * zone.length)];
            const distToSpawn = Math.abs(p.x - 1) + Math.abs(p.y - 1);
            const posKey = `${p.x},${p.y}`;
            if (distToSpawn < 10 || occupied.has(posKey)) { i--; continue; }
            occupied.add(posKey);
            const enemy = Math.random() > 0.5 ? createSlimeEnemy() : createGhostEnemy();
            enemy.position.set(p.x * CELL, yOffset, p.y * CELL);
            enemy.userData = { type: 'enemy', dir: new THREE.Vector3(1, 0, 0), speed: 0.04 + Math.random() * 0.04 };
            state.scene.add(enemy);
            state.enemies.push(enemy);
        }
    });
    console.log("Level", state.currentLevel, "Enemies spawned:", state.enemies.length);

    const exit = new THREE.Mesh(new THREE.TorusKnotGeometry(0.4, 0.12), new THREE.MeshStandardMaterial({ color: 0xffd700 }));
    exit.position.set(trophy.x * CELL, 1.5 + yOffset, trophy.y * CELL);
    exit.userData = { type: 'exit', color: 0xffd700 };
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 1.5), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.userData = exit.userData; hitBox.userData.root = exit; exit.add(hitBox);
    state.scene.add(exit); state.interactables.push(exit); state.entities.push(exit);

    state.camera.position.set(CELL, 2, CELL);

    // Dynamic Rotation: Face the first path step
    if (mainPath.length > 0) {
        const firstStep = mainPath[0];
        state.startRotation = Math.atan2((firstStep.x * CELL) - (1 * CELL), (firstStep.y * CELL) - (1 * CELL));
        state.camera.rotation.set(0, state.startRotation + Math.PI, 0);
    } else {
        state.camera.rotation.set(0, Math.PI, 0);
    }

    // --- SKY PORTAL (level 2+) — shortcut to next level ---
    if (state.currentLevel >= 2) {
        const portalAngle = Math.random() * Math.PI * 2;
        // Place just outside the maze walls, well above wall height (walls = CELL = 4)
        const portalDist = (GRID_SIZE * CELL) / 2 + 8;
        const px = mazeCenter + Math.cos(portalAngle) * portalDist;
        const pz = mazeCenter + Math.sin(portalAngle) * portalDist;

        const portalGroup = new THREE.Group();

        const ringMat = new THREE.MeshBasicMaterial({ color: 0xaa00ff, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.2, 16, 64), ringMat);

        const innerMat = new THREE.MeshBasicMaterial({ color: 0x7b1fa2, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
        const inner = new THREE.Mesh(new THREE.CircleGeometry(1.5, 64), innerMat);

        const glowMat = new THREE.MeshBasicMaterial({ color: 0xe040fb, transparent: true, opacity: 0.25 });
        const glow = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.35, 16, 64), glowMat);

        portalGroup.add(ring, inner, glow);
        const portalY = state.currentLevel === 2 ? 7.5 : 16; // level 2: requires stacking ≥1 block to reach; level 3+: high and unreachable
        portalGroup.position.set(px, portalY, pz);
        portalGroup.userData = { type: 'sky_portal' };

        state.scene.add(portalGroup);
        state.entities.push(portalGroup);
        state.skyPortal = portalGroup;
    }

    updateHUD();
    showMsg("LEVEL " + state.currentLevel + ": FIND GOLD FOR RED KEY");
}
