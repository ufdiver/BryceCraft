import * as THREE from 'three';
import { state, CELL, GRID_SIZE, STAND_HEIGHT, CROUCH_HEIGHT, JUMP_FORCE } from './state.js';
import { sfx } from './audio.js';
import { updateHUD, showMsg } from './ui.js';
import { startLevel } from './world.js';

export const keysDown = {};

function createBlockTexture(baseColor, type) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const colorStr = '#' + baseColor.toString(16).padStart(6, '0');
    
    // Fill background
    ctx.fillStyle = colorStr;
    ctx.fillRect(0, 0, 128, 128);

    // Apply patterns
    ctx.globalAlpha = 0.3;
    if (type === 'Dirt') {
        for (let i = 0; i < 200; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
            ctx.fillRect(Math.random() * 128, Math.random() * 128, 4 + Math.random() * 8, 4 + Math.random() * 8);
        }
    } else if (type === 'Rock') {
        ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
        for (let i = 0; i < 15; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 128, Math.random() * 128);
            ctx.lineTo(Math.random() * 128, Math.random() * 128);
            ctx.stroke();
        }
    } else if (type === 'Wood') {
        ctx.fillStyle = '#000';
        for (let i = 0; i < 128; i += 16) {
            ctx.fillRect(0, i, 128, 2);
            for (let j = 0; j < 5; j++) {
                ctx.globalAlpha = 0.1;
                ctx.fillRect(Math.random() * 128, i, Math.random() * 64, 16);
            }
        }
    } else if (type === 'Grass') {
        ctx.fillStyle = '#2E7D32';
        for (let i = 0; i < 500; i++) {
            ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 8);
        }
    } else if (type === 'Metal') {
        ctx.strokeStyle = '#fff'; ctx.globalAlpha = 0.5; ctx.lineWidth = 4;
        ctx.strokeRect(5, 5, 118, 118);
        ctx.fillStyle = '#fff';
        [10, 118].forEach(x => [10, 118].forEach(y => ctx.fillRect(x-4, y-4, 8, 8)));
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

const BLOCK_TYPES = [
    { name: 'Dirt',  color: 0x8B5E3C, map: createBlockTexture(0x8B5E3C, 'Dirt') },
    { name: 'Rock',  color: 0x787878, map: createBlockTexture(0x787878, 'Rock') },
    { name: 'Wood',  color: 0x6B3A2A, map: createBlockTexture(0x6B3A2A, 'Wood') },
    { name: 'Grass', color: 0x4CAF50, map: createBlockTexture(0x4CAF50, 'Grass') },
    { name: 'Metal', color: 0x90A4AE, map: createBlockTexture(0x90A4AE, 'Metal') },
];
let selectedBlockIdx = 0;

window.addEventListener('keydown', e => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyB", "KeyE", "KeyF", "KeyC", "KeyX", "KeyV", "KeyG", "KeyT", "ShiftLeft", "ShiftRight", "KeyP", "Tab"].includes(e.code)) e.preventDefault();
    keysDown[e.code] = true;

    if (e.code === 'Tab' && !state.isMathActive && !state.isDead) handleCycleItem();
    if (e.code === 'KeyG' && !state.isMathActive && !state.isDead) handleCycleBlock();
    if (e.code === 'Escape' && !state.isMathActive && !state.isDead) {
        state.selectedItemIdx = 0;
        updateItemVisuals();
        updateHUD();
    }
    
    if (e.code === 'KeyF' && state.isAdmin && !state.isMathActive && !state.isDead) {
        state.isFlying = !state.isFlying;
        if (state.isFlying) {
            const yOffset = state.currentLevel === 5 ? 5 : 0;
            state.camera.position.y = yOffset + CELL + 3.0; // Place above maze
            showMsg("ADMIN FLIGHT: ON");
        } else {
            showMsg("ADMIN FLIGHT: OFF");
        }
    }

    if (e.code === 'Space' && !state.isMathActive && !state.isDead) {
        if (state.isFlying) {
            state.isFlying = false;
            state.jumpVelocity = -0.5;
            showMsg("DROPPING!");
        } else {
            const item = state.inventoryTypes[state.selectedItemIdx];
            if (item === 'hand') handleGrab();
            else if (item === 'gun') handleShoot();
            else if (item === 'shovel') handlePlace();
            else if (item === 'pickaxe') handleDestroy();
            else if (item === 'grenade') handleGrenade();
            else if (item === 'bomb') handleBomb();
            else if (item === 'pellet') handleUsePellet();
        }
    }

    if (e.code === 'KeyX' && !state.isMathActive && !state.isDead && state.jumpVelocity === 0 && !state.isCrouching && !state.isFlying) {
        if (state.launchPlate) {
            const lp = state.launchPlate;
            const onPlate = Math.abs(state.camera.position.x - lp.userData.cx) < lp.userData.hx + 0.3 &&
                            Math.abs(state.camera.position.z - lp.userData.cz) < lp.userData.hz + 0.3;
            state.jumpVelocity = onPlate ? 1.0 : JUMP_FORCE;
        } else {
            state.jumpVelocity = JUMP_FORCE;
        }
    }
});
window.addEventListener('keyup', e => keysDown[e.code] = false);

export function handleShoot() {
    if (!state.hasGun || state.ammo <= 0) {
        if (state.hasGun && state.ammo <= 0) showMsg("OUT OF AMMO!");
        return;
    }
    state.ammo--; sfx.shoot(); updateHUD();
    updateItemVisuals();
    state.itemSwingTime = 0.3; // recoil kick

    // --- MUZZLE FLASH ---
    const flash = new THREE.PointLight(0xff8800, 6, 8);
    flash.position.copy(state.camera.position);
    state.scene.add(flash);
    setTimeout(() => state.scene.remove(flash), 80);

    // --- SPAWN BULLET PROJECTILE ---
    const dir = new THREE.Vector3();
    state.camera.getWorldDirection(dir);

    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffee44 });
    const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), bulletMat);
    bullet.position.copy(state.camera.position).addScaledVector(dir, 1.8);
    bullet.userData = { dir: dir.clone(), speed: 2.0, life: 0, maxLife: 180 };
    state.scene.add(bullet);
    state.bullets.push(bullet);

    // Bullet trail glow (short-lived line)
    const trailGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.2, 5);
    const trailMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.6 });
    const trail = new THREE.Mesh(trailGeo, trailMat);
    trail.position.copy(bullet.position).addScaledVector(dir, -0.6);
    trail.quaternion.copy(state.camera.quaternion);
    trail.rotateX(Math.PI / 2);
    state.scene.add(trail);
    setTimeout(() => state.scene.remove(trail), 80);
}

export function spawnBulletHole(pos, wall) {
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.14, 8), holeMat);
    const wPos = wall.position;
    const dx = pos.x - wPos.x, dz = pos.z - wPos.z;
    // Clamp Y so the hole stays on the visible wall face
    const hy = Math.max(0.2, Math.min(CELL - 0.2, pos.y));
    if (Math.abs(dx) >= Math.abs(dz)) {
        // East / West face
        hole.position.set(wPos.x + Math.sign(dx) * (CELL / 2 + 0.03), hy, pos.z);
        hole.rotation.y = Math.PI / 2;
    } else {
        // North / South face
        hole.position.set(pos.x, hy, wPos.z + Math.sign(dz) * (CELL / 2 + 0.03));
    }
    // Dark scorch ring
    const scorchMat = new THREE.MeshBasicMaterial({ color: 0x2a1a0a, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const scorch = new THREE.Mesh(new THREE.CircleGeometry(0.28, 8), scorchMat);
    scorch.position.copy(hole.position);
    scorch.rotation.copy(hole.rotation);
    scorch.position.addScaledVector(scorch.getWorldDirection(new THREE.Vector3()), -0.01);
    state.scene.add(scorch);
    state.scene.add(hole);
    state.entities.push(hole);
    state.entities.push(scorch);
}

export function handleGrab() {
    // DISEMBARK LOGIC
    if (state.isPlayerOnBoat && state.atShore && state.waterBounds) {
        state.isPlayerOnBoat = false; state.boatState = 'stopped';
        state.lastDisembark = Date.now();
        const dir = state.atShore === 'inner' ? -5 : 5; // Long jump to safety
        const dx = state.camera.position.x - state.waterBounds.center;
        const dz = state.camera.position.z - state.waterBounds.center;
        const angle = Math.atan2(dz, dx);
        state.camera.position.x += Math.cos(angle) * dir;
        state.camera.position.z += Math.sin(angle) * dir;
        showMsg("DISEMBARKED");
        return;
    }

    state.handGroup.visible = true; state.handGroup.position.z = -1.8;
    state.fingers.forEach(f => f.rotation.x = -Math.PI / 3);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), state.camera);
    const hits = ray.intersectObjects(state.interactables, true);
    if (hits.length > 0 && hits[0].distance < 4.5) {
        let obj = hits[0].object;
        let interactTarget = null;
        while (obj) {
            if (obj.userData && obj.userData.type) { interactTarget = obj; break; }
            obj = obj.parent;
        }
        if (interactTarget) processLogic(interactTarget);
    }
    setTimeout(() => {
        state.handGroup.visible = false;
        state.handGroup.position.z = -1.2;
        state.fingers.forEach(f => f.rotation.x = 0);
    }, 300);
}

export function handleBomb() {
    if (state.bombs <= 0) { showMsg("OUT OF BOMBS!"); return; }
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), state.camera);
    const hits = ray.intersectObjects(state.collidables);
    if (hits.length > 0 && hits[0].distance < 6) {
        const wall = hits[0].object;
        if (wall.userData.type === 'destructible') {
            state.bombs--; updateHUD();
            updateItemVisuals();
            const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
            b.position.copy(hits[0].point); state.scene.add(b);
            setTimeout(() => {
                state.scene.remove(b); state.scene.remove(wall);
                state.collidables = state.collidables.filter(w => w !== wall);
                showMsg("BOOM!");
            }, 1500);
        }
    }
}

export function handleDeath(msg = "TOUCHED ENEMY! -1 LIFE") {
    if (state.isDead || state.invincibleTime > 0) return;
    state.isDead = true; state.isPlayerOnBoat = false;
    state.lives--; updateHUD();
    showMsg(msg);
    sfx.hurt();

    const overlay = document.getElementById('death-overlay');
    const txt = document.getElementById('death-text');
    overlay.style.opacity = 1;
    overlay.style.background = 'rgba(180, 0, 0, 0.7)';
    txt.style.transform = 'scale(1.5)';

    setTimeout(() => {
        if (state.lives <= 0) {
            document.getElementById('landing-page').style.display = 'flex';
            overlay.style.opacity = 0;
            txt.style.transform = 'scale(0.5)';
            state.isDead = false;
        } else {
            state.camera.position.set(CELL, 2, CELL);
            state.camera.rotation.set(0, state.startRotation + Math.PI, 0);
            state.isDead = false;
            overlay.style.opacity = 0;
            overlay.style.background = 'rgba(180, 0, 0, 0)';
            txt.style.transform = 'scale(0.5)';
        }
    }, 2500);
}

export function processLogic(obj) {
    const d = obj.userData;
    if (d.type === 'exit') {
        sfx.levelUp();
        state.currentLevel++; state.lives++; showMsg("SUCCESS! LEVEL " + state.currentLevel);
        setTimeout(startLevel, 1500);
    } else if (d.type === 'math') {
        state.isMathActive = true;
        const diff = d.difficulty || 1;
        let a, b, ans, op = 'x';

        if (state.currentLevel === 1) {
            const isAdd = Math.random() > 0.5;
            a = Math.floor(Math.random() * 10) + 1;
            b = Math.floor(Math.random() * 10) + 1;
            if (!isAdd && a < b) [a, b] = [b, a]; // No negative results
            op = isAdd ? '+' : '-';
            ans = isAdd ? a + b : a - b;
        } else if (state.currentLevel === 2) {
            a = Math.floor(Math.random() * 6);
            b = Math.floor(Math.random() * 6);
            ans = a * b;
        } else {
            const rangeMax = diff === 1 ? 6 : (diff === 2 ? 9 : 12);
            const num1 = Math.floor(Math.random() * (rangeMax - 1)) + 2;
            const num2 = Math.floor(Math.random() * (rangeMax - 1)) + 2;

            if (state.currentLevel >= 4 && Math.random() > 0.5) {
                // Level 4+ Division: num1 * num2 = c -> c / num1 = num2
                a = num1 * num2;
                b = num1;
                ans = num2;
                op = '/';
            } else {
                // Level 3+ Multiplication
                a = num1;
                b = num2;
                ans = num1 * num2;
                op = 'x';
            }
        }

        const reward = (20 * state.currentLevel) + (diff * 15);
        document.getElementById('math-problem').innerText = `${a} ${op} ${b} = ?`;
        document.getElementById('math-ui').style.display = 'flex';
        const input = document.getElementById('math-input');
        input.value = ''; input.focus();
        const check = (e) => {
            if (e.key === 'Enter') {
                if (parseInt(input.value) === ans) {
                    state.gold += reward; showMsg("CORRECT! +" + reward + " GOLD"); sfx.win();
                    if (obj.userData.isFerryman) {
                        state.boatState = 'drifting';
                        showMsg("FERRYMAN SUMMONS THE BOAT!");
                    } else {
                        const root = obj.userData.root || obj;
                        state.scene.remove(root); state.interactables = state.interactables.filter(i => i !== root);
                    }
                } else {
                    sfx.fail();
                    handleDeath("WRONG! -1 LIFE");
                }
                state.isMathActive = false; document.getElementById('math-ui').style.display = 'none';
                updateHUD(); window.removeEventListener('keydown', check);
            }
        };
        window.addEventListener('keydown', check);
    } else if (d.type === 'shop') {
        if (state.gold >= d.price) {
            state.gold -= d.price; sfx.buy();
            if (d.id === 'Bomb') state.bombs++;
            else if (d.id === 'Pistol') { state.hasGun = true; state.ammo += 50; }
            else if (d.id === 'Pellet') { state.invinciblePellets++; }
            else state.inventory.push(d.id);
            const root = obj.userData.root || obj;
            state.scene.remove(root); state.interactables = state.interactables.filter(i => i !== root);
            showMsg("PURCHASED " + d.id.toUpperCase()); updateHUD();
        } else showMsg("NEED " + (d.price - state.gold) + " MORE GOLD!");
    } else if (d.type === 'mentor_choice') {
        state.isMathActive = true;
        state.currentMentorObj = obj;
        const btn3 = document.getElementById('mentor-btn-3');
        if (btn3) btn3.textContent = state.currentLevel === 1 ? '3. Skip to Level 2' : '3. Receive 500 gold pieces';
        document.getElementById('mentor-ui').style.display = 'flex';
    } else if (d.type === 'talk') {
        showMsg(d.msg);
    } else if (d.type === 'door') {
        if (state.inventory.includes(d.id)) {
            state.scene.remove(obj); state.collidables = state.collidables.filter(w => w !== obj);
            showMsg("UNLOCKED!");
        } else showMsg("NEED THE " + d.id);
    }
}

export function handlePlace() {
    state.itemSwingTime = 1.0;
    const BLOCK = 1.0; // Minecraft-scale block size

    const dir = new THREE.Vector3();
    state.camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();

    // Place ~3 units ahead, snapped to 1-unit grid
    const reach = 3;
    const bx = Math.round(state.camera.position.x + dir.x * reach);
    const bz = Math.round(state.camera.position.z + dir.z * reach);

    // Restrict to outside the maze boundary
    const mazeMin = -CELL / 2;
    const mazeMax = (GRID_SIZE - 1) * CELL + CELL / 2;
    if (bx > mazeMin && bx < mazeMax && bz > mazeMin && bz < mazeMax) {
        showMsg("CAN'T BUILD INSIDE THE MAZE!");
        return;
    }

    // Find the top of the highest existing placed block at this XZ column
    let stackTop = 0;
    for (const w of state.collidables) {
        if (w.userData.type === 'placed' &&
            Math.abs(w.position.x - bx) < 0.1 &&
            Math.abs(w.position.z - bz) < 0.1) {
            stackTop = Math.max(stackTop, w.position.y + BLOCK / 2);
        }
    }
    const by = stackTop + BLOCK / 2;

    const { color, name, map } = BLOCK_TYPES[selectedBlockIdx];
    const mat = new THREE.MeshStandardMaterial({ color, map });
    const block = new THREE.Mesh(new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK), mat);
    block.position.set(bx, by, bz);
    block.userData = { type: 'placed' };
    state.scene.add(block);
    state.collidables.push(block);
    state.entities.push(block);
}

export function handleCycleBlock() {
    selectedBlockIdx = (selectedBlockIdx + 1) % BLOCK_TYPES.length;
    const { name } = BLOCK_TYPES[selectedBlockIdx];
    showMsg(`BLOCK: ${name} (${selectedBlockIdx + 1}/${BLOCK_TYPES.length})`);
}

export function handleDestroy() {
    state.itemSwingTime = 1.0;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), state.camera);

    const placedBlocks = state.collidables.filter(b => b.userData.type === 'placed');
    const hits = ray.intersectObjects(placedBlocks);
    if (hits.length === 0 || hits[0].distance > 4) return;

    const target = hits[0].object;
    const tx = target.position.x;
    const ty = target.position.y;
    const tz = target.position.z;

    // Remove the destroyed block
    state.scene.remove(target);
    state.collidables = state.collidables.filter(b => b !== target);
    state.entities = state.entities.filter(b => b !== target);

    // Drop all placed blocks above the removed block in the same column down by one unit
    for (const block of state.collidables) {
        if (block.userData.type === 'placed' &&
            Math.abs(block.position.x - tx) < 0.1 &&
            Math.abs(block.position.z - tz) < 0.1 &&
            block.position.y > ty) {
            block.position.y -= 1.0;
        }
    }

    showMsg("BLOCK DESTROYED!");
}

export function handleGrenade() {
    if (state.grenades <= 0) { showMsg("NO GRENADES!"); return; }
    state.grenades--;
    updateHUD();
    updateItemVisuals();
    sfx.shoot();

    const dir = new THREE.Vector3();
    state.camera.getWorldDirection(dir);

    // Small dark green sphere
    const grenadeMat = new THREE.MeshStandardMaterial({ color: 0x2d4a1e, roughness: 0.8 });
    const grenade = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), grenadeMat);
    grenade.position.copy(state.camera.position).addScaledVector(dir, 1.2);
    grenade.position.y -= 0.3;
    grenade.userData = {
        dir: new THREE.Vector3(dir.x, 0.15, dir.z).normalize(), // arc slightly upward
        speed: 0.35,
        vy: 0.15,          // initial upward velocity
        life: 0,
        maxLife: 90        // auto-explode after ~1.5s if no collision
    };
    state.scene.add(grenade);
    state.grenadeProjectiles.push(grenade);
}

export function handleUsePellet() {
    if (state.invinciblePellets <= 0) { showMsg("NO PELLETS!"); return; }
    if (state.invincibleTime > 0) { showMsg("ALREADY INVINCIBLE!"); return; }
    state.invinciblePellets--;
    state.invincibleTime = 15; // 15 seconds
    sfx.levelUp(); // use level up sound as a "power up"
    showMsg("INVINCIBILITY ACTIVATED!");
    updateHUD();
    updateItemVisuals();
}

export function handleCycleItem() {
    state.selectedItemIdx = (state.selectedItemIdx + 1) % state.inventoryTypes.length;
    updateItemVisuals();
}

export function updateItemVisuals() {
    const item = state.inventoryTypes[state.selectedItemIdx];
    
    // Check availability
    let actualItem = item;
    let available = true;
    if (item === 'gun') available = state.hasGun && state.ammo > 0;
    else if (item === 'grenade') available = state.grenades > 0;
    else if (item === 'bomb') available = state.bombs > 0;
    else if (item === 'pellet') available = state.invinciblePellets > 0;
    
    if (!available) actualItem = 'hand';
    
    // Hide all hand meshes first, then show if needed
    state.handGroup.visible = (actualItem === 'hand' || actualItem === 'grenade' || actualItem === 'bomb' || actualItem === 'pellet');
    
    // Position hand based on whether it's holding something small
    if (actualItem === 'hand') state.handGroup.position.set(0.6, -0.6, -1.2);
    else state.handGroup.position.set(0.5, -0.6, -1.0); 

    Object.keys(state.itemModels).forEach(k => {
        state.itemModels[k].visible = (k === actualItem);
    });
    
    const displayNames = {
        hand: "HAND (INTERACT)",
        gun: "PISTOL",
        shovel: "SHOVEL (BUILD)",
        pickaxe: "PICKAXE (DESTROY)",
        grenade: "GRENADE",
        bomb: "BOMB",
        pellet: "SHIELD PELLET"
    };
    showMsg(`SELECTED: ${displayNames[actualItem] || actualItem.toUpperCase()}`);
    updateHUD();
}
