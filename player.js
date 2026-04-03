import * as THREE from 'three';
import { state, CELL, GRID_SIZE, STAND_HEIGHT, CROUCH_HEIGHT, JUMP_FORCE } from './state.js';
import { sfx } from './audio.js';
import { updateHUD, showMsg } from './ui.js';
import { startLevel } from './world.js';

export const keysDown = {};

const BLOCK_TYPES = [
    { name: 'Dirt',  color: 0x8B5E3C },
    { name: 'Rock',  color: 0x787878 },
    { name: 'Wood',  color: 0x6B3A2A },
    { name: 'Grass', color: 0x4CAF50 },
    { name: 'Metal', color: 0x90A4AE },
];
let selectedBlockIdx = 0;

window.addEventListener('keydown', e => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyB", "KeyF", "KeyC", "KeyX", "KeyV", "KeyG", "KeyT"].includes(e.code)) e.preventDefault();
    keysDown[e.code] = true;
    if (e.code === 'Space' && !state.isMathActive) handleGrab();
    if (e.code === 'KeyB' && !state.isMathActive) handleBomb();
    if (e.code === 'KeyF' && !state.isMathActive) handleShoot();
    if (e.code === 'KeyT' && !state.isMathActive) handleGrenade();
    if (e.code === 'KeyV' && !state.isMathActive && !state.isDead) handlePlace();
    if (e.code === 'KeyG' && !state.isMathActive && !state.isDead) handleCycleBlock();
    if (e.code === 'KeyX' && !state.isMathActive && !state.isDead && state.jumpVelocity === 0 && !state.isCrouching) {
        state.jumpVelocity = JUMP_FORCE;
    }
});
window.addEventListener('keyup', e => keysDown[e.code] = false);

export function handleShoot() {
    if (!state.hasGun || state.ammo <= 0) {
        if (state.hasGun && state.ammo <= 0) showMsg("OUT OF AMMO!");
        return;
    }
    state.ammo--; sfx.shoot(); updateHUD();

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
    if (state.isDead) return;
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
            else if (d.id === 'Pistol') { state.hasGun = true; state.ammo += 5; }
            else state.inventory.push(d.id);
            const root = obj.userData.root || obj;
            state.scene.remove(root); state.interactables = state.interactables.filter(i => i !== root);
            showMsg("PURCHASED " + d.id.toUpperCase()); updateHUD();
        } else showMsg("NEED " + (d.price - state.gold) + " MORE GOLD!");
    } else if (d.type === 'mentor_choice') {
        state.isMathActive = true;
        state.currentMentorObj = obj;
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

    const { color, name } = BLOCK_TYPES[selectedBlockIdx];
    const mat = new THREE.MeshStandardMaterial({ color });
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

export function handleGrenade() {
    if (state.grenades <= 0) { showMsg("NO GRENADES!"); return; }
    state.grenades--;
    updateHUD();

    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), state.camera);
    const hits = ray.intersectObjects(state.collidables);

    const explodePos = hits.length > 0 && hits[0].distance < 20
        ? hits[0].point.clone()
        : state.camera.position.clone().addScaledVector(
            (() => { const d = new THREE.Vector3(); state.camera.getWorldDirection(d); return d; })(), 8
          );

    // Flash
    const flash = new THREE.PointLight(0xff6600, 12, 18);
    flash.position.copy(explodePos);
    state.scene.add(flash);
    setTimeout(() => state.scene.remove(flash), 200);

    // Destroy destructible walls within radius
    const RADIUS = 6;
    const toRemove = state.collidables.filter(w =>
        w.userData.type === 'destructible' && w.position.distanceTo(explodePos) < RADIUS
    );
    toRemove.forEach(w => {
        state.scene.remove(w);
        state.collidables = state.collidables.filter(c => c !== w);
    });

    showMsg("GRENADE! BOOM!");
    sfx.shoot();
}
