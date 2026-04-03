import * as THREE from 'three';
import { state, STAND_HEIGHT, CROUCH_HEIGHT, GRAVITY, CELL, GRID_SIZE } from './state.js';
import { sfx, audioCtx } from './audio.js';
import { updateHUD, showMsg, toggleMap, showHowTo, hideHowTo, showAdmin, hideAdmin } from './ui.js';
import { startLevel } from './world.js';
import { keysDown, handleDeath, spawnBulletHole } from './player.js';

// --- THREE.JS SCENE SETUP ---
state.scene = new THREE.Scene();
state.scene.background = new THREE.Color(0x87CEEB);
state.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
state.renderer = new THREE.WebGLRenderer({ antialias: false });
state.renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(state.renderer.domElement);

state.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(10, 20, 10);
state.scene.add(sun);

// --- THE HAND ---
state.handGroup = new THREE.Group();
const skinMat = new THREE.MeshStandardMaterial({ color: 0xdbac82 });
const palm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.4), skinMat);
state.handGroup.add(palm);
for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.3), skinMat);
    f.position.set(-0.18 + (i * 0.12), 0.05, -0.3);
    state.fingers.push(f);
    state.handGroup.add(f);
}
state.handGroup.position.set(0.6, -0.6, -1.2);
state.handGroup.visible = false;
state.camera.add(state.handGroup);
state.scene.add(state.camera);

// --- WINDOW GLOBALS (called from HTML onclick attributes) ---
window.toggleMap = toggleMap;
window.showHowTo = showHowTo;
window.hideHowTo = hideHowTo;
window.showAdmin = showAdmin;
window.hideAdmin = hideAdmin;

window.mentorChoice = (choice) => {
    document.getElementById('mentor-ui').style.display = 'none';
    state.isMathActive = false;

    if (choice === 1) {
        sfx.levelUp();
        state.currentLevel++; state.lives++; showMsg("SKIPPED TO LEVEL " + state.currentLevel);
        setTimeout(startLevel, 1500);
    } else if (choice === 2) {
        state.bombs += 2; updateHUD(); showMsg("+2 BOMBS!"); sfx.win();
    } else if (choice === 3) {
        state.gold += 500; updateHUD(); showMsg("+500 GOLD!"); sfx.win();
    }

    if (choice !== 0 && state.currentMentorObj) {
        const root = state.currentMentorObj.userData.root || state.currentMentorObj;
        state.scene.remove(root); state.interactables = state.interactables.filter(i => i !== root);
        state.currentMentorObj = null;
    }
};

window.startAdminGame = () => {
    const lvl = parseInt(document.getElementById('admin-lvl-input').value) || 1;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    state.gold = 1000; state.lives = 3; state.bombs = 3; state.currentLevel = lvl; state.inventory = [];
    state.hasGun = true; state.ammo = 5;
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('how-to-screen').style.display = 'none';
    document.getElementById('admin-screen').style.display = 'none';
    if (!state.isGameStarted) {
        state.isGameStarted = true;
        updateHUD(); startLevel(); animate();
    } else {
        updateHUD(); startLevel();
    }
};

window.startGame = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    document.getElementById('landing-page').style.display = 'none';
    if (!state.isGameStarted) {
        state.isGameStarted = true;
        updateHUD(); startLevel(); animate();
    } else {
        state.gold = 0; state.lives = 3; state.bombs = 0; state.currentLevel = 1; state.inventory = [];
        state.hasGun = false; state.ammo = 0;
        updateHUD(); startLevel();
    }
};

// --- MAIN LOOP ---
function animate() {
    requestAnimationFrame(animate);
    if (!state.isMathActive) {
        if (state.isDead) {
            state.camera.rotation.z += 0.01;
            state.camera.position.y -= 0.01;
        } else {
            const old = state.camera.position.clone();
            // Hold C to crouch, release to stand (disabled mid-air)
            state.isCrouching = !!keysDown['KeyC'] && !state.isDead && state.jumpVelocity === 0;
            document.getElementById('crouch-hud').style.display = state.isCrouching ? 'block' : 'none';
            const playerHeight = state.isCrouching ? CROUCH_HEIGHT : STAND_HEIGHT;

            // Find the highest placed block directly underfoot to use as dynamic floor
            let floorY = 0;
            if (state.jumpVelocity <= 0) {
                for (const block of state.collidables) {
                    if (block.userData.type !== 'placed') continue;
                    const blockTop = block.position.y + 0.5;
                    if (Math.abs(state.camera.position.x - block.position.x) < 1.1 &&
                        Math.abs(state.camera.position.z - block.position.z) < 1.1) {
                        floorY = Math.max(floorY, blockTop);
                    }
                }
            }
            const baseY = floorY + playerHeight;

            // Jump physics — override Y lerp while airborne
            if (state.jumpVelocity !== 0) {
                state.camera.position.y += state.jumpVelocity;
                state.jumpVelocity -= GRAVITY;
                if (state.camera.position.y <= baseY) {
                    state.camera.position.y = baseY;
                    state.jumpVelocity = 0;
                }
            } else {
                state.camera.position.y += (baseY - state.camera.position.y) * 0.15;
            }

            if (!state.isPlayerOnBoat) {
                const moveSpeed = state.isCrouching ? 0.07 : 0.13;
                if (keysDown['ArrowUp'] || keysDown['KeyW']) state.camera.translateZ(-moveSpeed);
                if (keysDown['ArrowDown'] || keysDown['KeyS']) state.camera.translateZ(moveSpeed);
                if (keysDown['ArrowLeft'] || keysDown['KeyA']) state.camera.rotation.y += 0.045;
                if (keysDown['ArrowRight'] || keysDown['KeyD']) state.camera.rotation.y -= 0.045;
            }

            const playerBB = new THREE.Box3(
                new THREE.Vector3(state.camera.position.x - 0.6, state.camera.position.y - playerHeight, state.camera.position.z - 0.6),
                new THREE.Vector3(state.camera.position.x + 0.6, state.camera.position.y + 0.5, state.camera.position.z + 0.6)
            );
            for (let w of state.collidables) {
                if (playerBB.intersectsBox(new THREE.Box3().setFromObject(w))) { state.camera.position.copy(old); break; }
            }

            state.enemies.forEach(en => {
                const d = en.userData;
                en.position.add(d.dir.clone().multiplyScalar(d.speed));
                const enBB = new THREE.Box3().setFromCenterAndSize(en.position, new THREE.Vector3(1, 1, 1));

                // --- PLAYER COLLISION CHECK ---
                const pPos = new THREE.Vector2(state.camera.position.x, state.camera.position.z);
                const ePos = new THREE.Vector2(en.position.x, en.position.z);
                const distXZ = pPos.distanceTo(ePos);

                if (Date.now() - state.lastHit > 1000 && (distXZ < 1.8 || playerBB.intersectsBox(enBB))) {
                    state.lastHit = Date.now();
                    handleDeath("TOUCHED ENEMY! -1 LIFE");
                }

                // Enemy wall bounce
                let hit = false;
                for (let w of state.collidables) {
                    if (enBB.intersectsBox(new THREE.Box3().setFromObject(w))) { hit = true; break; }
                }
                if (hit) {
                    en.position.sub(d.dir.clone().multiplyScalar(d.speed));
                    const dirs = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)];
                    d.dir = dirs[Math.floor(Math.random() * dirs.length)];
                }
            });

            const gx = Math.round(state.camera.position.x / CELL), gy = Math.round(state.camera.position.z / CELL);
            if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
                state.explored[gy][gx] = true;
            }

            // --- MOAT CHECK ---
            if (state.waterBounds && Date.now() - state.lastHit > 1000 && !state.isPlayerOnBoat) {
                const dx = state.camera.position.x - state.waterBounds.center;
                const dz = state.camera.position.z - state.waterBounds.center;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist > state.waterBounds.in && dist < state.waterBounds.out) {
                    state.lastHit = Date.now();
                    handleDeath("FELL IN THE MOAT! -1 LIFE");
                }
            }

            // --- LAVA DAMAGE CHECK ---
            if (state.lavaPatches.length > 0 && Date.now() - state.lastHit > 1200 && state.jumpVelocity === 0) {
                // Only hurt if player is on the ground (not jumping)
                const groundedY = state.isCrouching ? CROUCH_HEIGHT : STAND_HEIGHT;
                if (state.camera.position.y < groundedY + 0.35) {
                    for (const lp of state.lavaPatches) {
                        const ldx = state.camera.position.x - lp.userData.cx;
                        const ldz = state.camera.position.z - lp.userData.cz;
                        if (Math.abs(ldx) < lp.userData.hx && Math.abs(ldz) < lp.userData.hz) {
                            state.lastHit = Date.now();
                            handleDeath("BURNED BY LAVA! -1 LIFE");
                            break;
                        }
                    }
                }
            }

            // --- LASER DAMAGE CHECK ---
            if (state.laserBeams.length > 0 && Date.now() - state.lastHit > 1200) {
                for (const lb of state.laserBeams) {
                    const ldx = state.camera.position.x - lb.userData.cx;
                    const ldz = state.camera.position.z - lb.userData.cz;
                    if (Math.abs(ldx) < lb.userData.hx && Math.abs(ldz) < lb.userData.hz) {
                        let bodyBottom = state.camera.position.y - (state.isCrouching ? CROUCH_HEIGHT : STAND_HEIGHT);
                        let bodyTop = state.camera.position.y;
                        // Collision if laser cy is within the player's Y bounds
                        if (lb.userData.cy > bodyBottom - 0.2 && lb.userData.cy < bodyTop + 0.2) {
                            state.lastHit = Date.now();
                            handleDeath("ZAPPED BY LASER! -1 LIFE");
                            break;
                        }
                    }
                }
            }
        }
    }

    // Boat Animation & Movement
    if (state.boatMesh && state.waterBounds) {
        const oldBoatX = state.boatMesh.position.x;
        const oldBoatZ = state.boatMesh.position.z;

        if (state.boatState === 'patrol') {
            state.boatAngle += 0.0007;
        } else if (state.boatState === 'drifting') {
            let diff = (state.ferrymanAngle - state.boatAngle) % (Math.PI * 2);
            if (diff < -Math.PI) diff += Math.PI * 2;
            if (diff > Math.PI) diff -= Math.PI * 2;
            if (Math.abs(diff) < 0.01) {
                state.boatState = 'stopped';
                state.boatRadius = state.waterBounds.in + 1.2;
                showMsg("THE BOAT HAS ARRIVED! BOARD TO SAIL.");
            } else {
                state.boatAngle += Math.sign(diff) * 0.005;
            }
        }

        // Sailing Input
        if (state.isPlayerOnBoat) {
            if (keysDown['ArrowLeft'] || keysDown['KeyA']) state.boatAngle -= 0.01;
            if (keysDown['ArrowRight'] || keysDown['KeyD']) state.boatAngle += 0.01;
            if (keysDown['ArrowUp'] || keysDown['KeyW']) state.boatRadius += 0.2;
            if (keysDown['ArrowDown'] || keysDown['KeyS']) state.boatRadius -= 0.2;

            state.boatRadius = Math.max(state.waterBounds.in + 1.2, Math.min(state.waterBounds.out - 1.2, state.boatRadius));

            state.atShore = null;
            if (state.boatRadius > state.waterBounds.out - 2.8) { showMsg("OUTER SHORE - SPACE TO EXIT"); state.atShore = 'outer'; }
            if (state.boatRadius < state.waterBounds.in + 2.8) { showMsg("INNER SHORE - SPACE TO EXIT"); state.atShore = 'inner'; }
        }

        // Position boat
        state.boatMesh.position.x = state.waterBounds.center + Math.cos(state.boatAngle) * state.boatRadius;
        state.boatMesh.position.z = state.waterBounds.center + Math.sin(state.boatAngle) * state.boatRadius;
        state.boatMesh.rotation.y = -state.boatAngle + Math.PI / 2;
        state.boatMesh.position.y = 0.15 + (Math.sin(Date.now() * 0.001) * 0.06);

        // Carrier logic
        const pXZ = new THREE.Vector2(state.camera.position.x, state.camera.position.z);
        const bXZ = new THREE.Vector2(state.boatMesh.position.x, state.boatMesh.position.z);
        const distToBoat = pXZ.distanceTo(bXZ);

        if (!state.isPlayerOnBoat) {
            if ((state.boatState === 'stopped' || state.boatState === 'sailing') && distToBoat < 4.0 && Date.now() - state.lastDisembark > 2000) {
                state.isPlayerOnBoat = true; state.boatState = 'sailing';
                state.camera.position.x = state.boatMesh.position.x;
                state.camera.position.z = state.boatMesh.position.z;
            }
        } else {
            state.camera.position.x += (state.boatMesh.position.x - oldBoatX);
            state.camera.position.z += (state.boatMesh.position.z - oldBoatZ);
        }
    }

    state.entities.forEach(i => {
        if (i.userData.type === 'lava') {
            // Pulsing orange-red glow
            const pulse = 0.8 + Math.sin(Date.now() * 0.004 + i.position.x) * 0.4;
            i.material.emissiveIntensity = pulse;
            i.material.color.setHSL(0.04 - pulse * 0.02, 1, 0.4 + pulse * 0.1);
            i.position.y = 0.03 + Math.sin(Date.now() * 0.003 + i.position.z) * 0.015;
            return;
        }
        if (i.userData.type === 'exit') i.rotation.y += 0.05;

        // --- IDLE ANIMATIONS ---
        const time = Date.now() * 0.003;
        if (i.userData.head && i.userData.lArm) { // Humanoids
            i.userData.head.rotation.x = Math.sin(time) * 0.1;
            i.userData.lArm.rotation.x = Math.sin(time) * 0.5;
            i.userData.rArm.rotation.x = -Math.sin(time) * 0.5;
        }
        if (i.userData.tail) { // Fox
            i.userData.tail.rotation.y = Math.sin(time * 2) * 0.5;
            i.userData.head.rotation.y = Math.sin(time * 0.5) * 0.2;
        }
        if (i.userData.legs) { // Creeper Slime
            i.userData.legs.forEach((l, idx) => {
                l.rotation.x = Math.sin(time * 3 + idx) * 0.6;
            });
        }
        if (i.userData.type === 'enemy' && !i.userData.legs) { // Ghost
            i.position.y = 1.6 + Math.sin(time) * 0.3;
        }
    });

    // --- BULLET UPDATE LOOP ---
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        const d = b.userData;
        d.life++;
        b.position.addScaledVector(d.dir, d.speed);

        let remove = d.life > d.maxLife;

        if (!remove) {
            // Wall / collidable collision
            for (const w of state.collidables) {
                const wBox = new THREE.Box3().setFromObject(w);
                if (wBox.containsPoint(b.position)) {
                    if (w.userData.type === 'destructible') spawnBulletHole(b.position.clone(), w);
                    remove = true;
                    break;
                }
            }
        }

        if (!remove) {
            // Enemy collision
            for (let j = state.enemies.length - 1; j >= 0; j--) {
                const en = state.enemies[j];
                const eCenter = new THREE.Vector3(en.position.x, en.position.y + 1.2, en.position.z);
                const eBox = new THREE.Box3().setFromCenterAndSize(eCenter, new THREE.Vector3(1.6, 2.6, 1.6));
                if (eBox.containsPoint(b.position)) {
                    state.scene.remove(en);
                    state.enemies.splice(j, 1);
                    state.entities = state.entities.filter(e => e !== en);
                    showMsg("TARGET ELIMINATED!");
                    remove = true;
                    break;
                }
            }
        }

        if (remove) { state.scene.remove(b); state.bullets.splice(i, 1); }
    }

    state.renderer.render(state.scene, state.camera);
}
