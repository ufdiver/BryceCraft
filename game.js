import * as THREE from 'three';
import { state, STAND_HEIGHT, CROUCH_HEIGHT, GRAVITY, CELL, GRID_SIZE } from './state.js';
import { sfx, audioCtx, ambient } from './audio.js';
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

// --- ITEM MODELS ---
state.itemModels = {};

const metalMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });

// Gun Model (Modern SMG with Holographic Sight)
const gun = new THREE.Group();
const receiver = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 12), metalMat);
receiver.rotation.x = Math.PI / 2;
receiver.position.set(0, 0, -0.4);
const scope = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.3), metalMat);
scope.position.set(0, 0.12, -0.2);
const lens = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.01), new THREE.MeshStandardMaterial({ color: 0x44ff44, transparent: true, opacity: 0.4, emissive: 0x44ff44, emissiveIntensity: 0.5 }));
lens.position.set(0, 0.12, -0.355);
const fSight = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 8, 12), metalMat);
fSight.position.set(0, 0.09, -0.85);
const fGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.35, 8), metalMat);
fGrip.position.set(0, -0.18, -0.6);
gun.add(receiver, scope, lens, fSight, fGrip);
state.itemModels.gun = gun;

// Shovel Model (Flipped: Blade at the front)
const shovel = new THREE.Group();
const shHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8), woodMat);
const shBlade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.4), new THREE.MeshStandardMaterial({ color: 0xCCCCCC, metalness: 0.9, roughness: 0.1 }));
shBlade.position.set(0, 0.5, 0); shBlade.rotation.x = Math.PI / 2; // Blade at top (front)
const shTop = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 12, Math.PI), woodMat);
shTop.position.set(0, -0.5, 0); // Handle at bottom (back)
shTop.rotation.x = Math.PI;
shovel.add(shHandle, shBlade, shTop);
shovel.rotation.x = -Math.PI / 3;
state.itemModels.shovel = shovel;

// Pickaxe Model (Flipped: Head at the front)
const pickaxe = new THREE.Group();
const piHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8), woodMat);
const piHeadLeft = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 8), metalMat);
piHeadLeft.position.set(-0.2, 0.5, 0); piHeadLeft.rotation.z = Math.PI / 2;
const piHeadRight = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 8), metalMat);
piHeadRight.position.set(0.2, 0.5, 0); piHeadRight.rotation.z = -Math.PI / 2;
pickaxe.add(piHandle, piHeadLeft, piHeadRight);
pickaxe.rotation.x = -Math.PI / 3;
state.itemModels.pickaxe = pickaxe;

// Grenade Model (held in hand)
const grenade = new THREE.Group();
const gBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshStandardMaterial({ color: 0x2d4a1e }));
grenade.add(gBody);
state.itemModels.grenade = grenade;

// Bomb Model (held in hand)
const bomb = new THREE.Group();
const bBody = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
bomb.add(bBody);
state.itemModels.bomb = bomb;

// Pellet Model (held in hand)
const pellet = new THREE.Group();
const pBody = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 1 }));
pellet.add(pBody);
state.itemModels.pellet = pellet;

// Add all to camera and position them
Object.keys(state.itemModels).forEach(key => {
    if (key === 'gun') {
        state.itemModels[key].position.set(0.1, -0.22, -0.4); // More centered ADS-style position
    } else {
        state.itemModels[key].position.set(0.5, -0.5, -1.0);
    }
    state.itemModels[key].visible = false;
    state.camera.add(state.itemModels[key]);
});

// --- BUILDING SELECTOR MESH ---
const selectGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
const selectMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.5 });
state.selectorMesh = new THREE.Mesh(selectGeo, selectMat);
state.selectorMesh.visible = false;
state.scene.add(state.selectorMesh);

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
        state.grenades += 3; updateHUD(); showMsg("+3 GRENADES!"); sfx.win();
    } else if (choice === 2) {
        state.bombs += 2; updateHUD(); showMsg("+2 BOMBS!"); sfx.win();
    } else if (choice === 3) {
        if (state.currentLevel === 1) {
            state.currentLevel++; updateHUD(); showMsg("SKIPPING TO LEVEL 2!"); sfx.levelUp();
            setTimeout(startLevel, 1500);
        } else {
            state.gold += 500; updateHUD(); showMsg("+500 GOLD!"); sfx.win();
        }
    }

    if (choice !== 0 && state.currentMentorObj) {
        const root = state.currentMentorObj.userData.root || state.currentMentorObj;
        state.scene.remove(root); state.interactables = state.interactables.filter(i => i !== root);
        state.currentMentorObj = null;
    }
};

window.startAdminGame = () => {
    state.isAdmin = true;
    const lvl = parseInt(document.getElementById('admin-lvl-input').value) || 1;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    state.gold = 1000; state.lives = 3; state.bombs = 3; state.grenades = 3; state.currentLevel = lvl; state.inventory = [];
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

            // Auto-enter fly mode when a launch-pad super-jump clears the maze walls (upward only)
            if (!state.isFlying && state.launchPlate && state.jumpVelocity > 0 && state.camera.position.y > CELL + playerHeight + 2) {
                state.isFlying = true;
                state.jumpVelocity = 0;
                showMsg("FLYING! PRESS SPACE TO LAND");
            }

            // Find the highest placed block or maze floor directly underfoot to use as dynamic floor
            const worldMax = 150;
            const mazeCenter = (GRID_SIZE * CELL) / 2 - (CELL / 2);
            const distFromCenter = Math.max(
                Math.abs(state.camera.position.x - mazeCenter),
                Math.abs(state.camera.position.z - mazeCenter)
            );
            const isOnMap = distFromCenter <= worldMax + 5;
            
            let floorY = isOnMap ? 0 : -500; // Default to abyss if off map
            if (!state.isFlying && state.jumpVelocity <= 0) {
                // Check all entities for floor-like surfaces
                for (const ent of state.entities) {
                    if (ent.userData && (ent.userData.type === 'placed' || ent.userData.type === 'floor')) {
                        const top = ent.userData.type === 'placed' ? ent.position.y + 0.5 : ent.userData.yTop;
                        const worldPos = new THREE.Vector3();
                        ent.getWorldPosition(worldPos);
                        // Slightly larger radius (0.8) for blocks to ensure overlap when walking across a horizontal row
                        const hx = ent.userData.type === 'floor' ? (ent.userData.hx || 2.5) : 0.8;
                        const hz = ent.userData.type === 'floor' ? (ent.userData.hz || 2.5) : 0.8;
                        
                        const feetY = state.camera.position.y - (state.isCrouching ? 0.85 : 2.0);
                        const heightDiff = top - feetY;

                        // STRICTOR CHECK: Allow stepping up 1 block, but also allow walking on same level or dropping down
                        if (heightDiff <= 1.1) {
                            if (Math.abs(state.camera.position.x - worldPos.x) < hx &&
                                Math.abs(state.camera.position.z - worldPos.z) < hz) {
                                floorY = Math.max(floorY, top);
                            }
                        }
                    }
                }
            }
            const baseY = floorY + playerHeight;

            // Jump physics — override Y lerp while airborne; skip entirely while flying
            if (state.isFlying) {
                // Flying vertical movement: X=Up, C=Down
                if (keysDown['KeyX']) state.camera.position.y += 0.15;
                if (keysDown['KeyC']) state.camera.position.y -= 0.15;
            } else if (state.jumpVelocity !== 0) {
                state.camera.position.y += state.jumpVelocity;
                state.jumpVelocity -= GRAVITY;
                if (state.camera.position.y <= baseY) {
                    state.camera.position.y = baseY;
                    state.jumpVelocity = 0;
                }
            } else if (state.camera.position.y > baseY + 0.1) {
                // Walked off a ledge: initiate gravity fall
                state.jumpVelocity = -0.01;
            } else {
                // Grounded or stepping up: use smooth lerp
                state.camera.position.y += (baseY - state.camera.position.y) * 0.15;
            }

            // --- INVINCIBILITY EFFECT ---
            if (state.invincibleTime > 0) {
                state.invincibleTime -= 0.0166; // approx 60fps
                if (state.invincibleTime <= 0) {
                    state.invincibleTime = 0;
                    showMsg("SHIELD EXPIRED!");
                }
                updateHUD();
                const pulse = (Math.sin(Date.now() * 0.01) + 1) / 2;
                state.handGroup.children.forEach(c => {
                    if (c.material) {
                        c.material.emissive.setHex(0xffff00);
                        c.material.emissiveIntensity = 0.3 + pulse * 0.7;
                    }
                });
                const overlay = document.getElementById('shield-overlay');
                if (overlay) overlay.style.boxShadow = `inset 0 0 ${100 + pulse * 150}px rgba(255, 255, 0, ${0.1 + pulse * 0.3})`;
            } else {
                const overlay = document.getElementById('shield-overlay');
                if (overlay) overlay.style.boxShadow = `inset 0 0 0px rgba(255, 255, 0, 0)`;
                state.handGroup.children.forEach(c => {
                    if (c.material && c.material.emissive) {
                        c.material.emissive.setHex(0x000000);
                        c.material.emissiveIntensity = 0;
                    }
                });
            }

            // --- ITEM SWING ANIMATION ---
            const currentItem = state.inventoryTypes[state.selectedItemIdx];
            if (state.itemSwingTime > 0) {
                state.itemSwingTime -= 0.08;
                const progress = 1.0 - state.itemSwingTime;
                const swingAngle = Math.sin(progress * Math.PI) * 1.2;
                if (state.itemModels[currentItem]) {
                    const baseRot = currentItem === 'gun' ? 0 : -Math.PI / 3;
                    state.itemModels[currentItem].rotation.x = baseRot - swingAngle;
                }
            } else {
                state.itemSwingTime = 0;
                if (state.itemModels[currentItem]) {
                    const baseRot = currentItem === 'gun' ? 0 : -Math.PI / 3;
                    state.itemModels[currentItem].rotation.x = baseRot;
                }
            }

            if (!state.isPlayerOnBoat) {
                const isSprinting = (keysDown['ShiftLeft'] || keysDown['ShiftRight']) && !state.isCrouching;
                const baseSpeed = state.isCrouching ? 0.07 : 0.13;
                const moveSpeed = isSprinting ? baseSpeed * 2.0 : baseSpeed;

                if (keysDown['ArrowUp'] || keysDown['KeyW'] || keysDown['ArrowDown'] || keysDown['KeyS']) {
                    if (state.isSafeStart) { state.isSafeStart = false; state.invincibleTime = 3.0; }
                }
                if (keysDown['ArrowUp'] || keysDown['KeyW']) state.camera.translateZ(-moveSpeed);
                if (keysDown['ArrowDown'] || keysDown['KeyS']) state.camera.translateZ(moveSpeed);
                if (keysDown['ArrowLeft'] || keysDown['KeyA'] || keysDown['ArrowRight'] || keysDown['KeyD']) {
                    if (state.isSafeStart) { state.isSafeStart = false; state.invincibleTime = 3.0; }
                }
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

                if (!state.isFlying && !state.isSafeStart && Date.now() - state.lastHit > 1000 && (distXZ < 1.8 || playerBB.intersectsBox(enBB))) {
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
                // Also check if user is at the same elevation as the water
                const atWaterLevel = Math.abs(state.camera.position.y - state.boatMesh.position.y) < 3.0;
                if (dist > state.waterBounds.in && dist < state.waterBounds.out && atWaterLevel) {
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

            // --- SKY PORTAL CHECK ---
            if (state.skyPortal) {
                const sp = state.skyPortal.position;
                const dx = state.camera.position.x - sp.x;
                const dy = state.camera.position.y - sp.y;
                const dz = state.camera.position.z - sp.z;
                if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 2.5) {
                    sfx.levelUp();
                    state.currentLevel++;
                    state.lives++;
                    state.skyPortal = null;
                    showMsg("PORTAL! LEVEL " + state.currentLevel + "!");
                    setTimeout(startLevel, 1500);
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
        if (i.userData.type === 'sky_portal') {
            i.rotation.y += 0.02;
            const pulse = 0.2 + Math.abs(Math.sin(Date.now() * 0.003)) * 0.35;
            if (i.children[2]) i.children[2].material.opacity = pulse; // glow pulses
            return;
        }
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

    // --- GRENADE PROJECTILE LOOP ---
    for (let i = state.grenadeProjectiles.length - 1; i >= 0; i--) {
        const g = state.grenadeProjectiles[i];
        const gd = g.userData;
        gd.life++;

        // Arc physics
        gd.vy -= GRAVITY;
        g.position.addScaledVector(gd.dir, gd.speed);
        g.position.y += gd.vy;
        g.rotation.x += 0.25;
        g.rotation.z += 0.15;

        // Check collision with collidables or ground
        let hitGround = g.position.y <= 0.18;
        let hitWall = false;
        if (!hitGround) {
            for (const w of state.collidables) {
                if (new THREE.Box3().setFromObject(w).containsPoint(g.position)) { hitWall = true; break; }
            }
        }

        const expired = gd.life >= gd.maxLife;
        if (hitGround || hitWall || expired) {
            const explodePos = g.position.clone();
            state.scene.remove(g);
            state.grenadeProjectiles.splice(i, 1);

            // Flash light
            const flash = new THREE.PointLight(0xff6600, 20, 22);
            flash.position.copy(explodePos);
            state.scene.add(flash);
            const flash2 = new THREE.PointLight(0xffcc00, 10, 14);
            flash2.position.copy(explodePos).add(new THREE.Vector3(0, 1, 0));
            state.scene.add(flash2);
            setTimeout(() => { state.scene.remove(flash); state.scene.remove(flash2); }, 250);

            const RADIUS = 6;

            // Destroy destructible walls
            const wallsToRemove = state.collidables.filter(w =>
                w.userData.type === 'destructible' && w.position.distanceTo(explodePos) < RADIUS
            );
            wallsToRemove.forEach(w => {
                state.scene.remove(w);
                state.collidables = state.collidables.filter(c => c !== w);
            });

            // Kill enemies
            for (let j = state.enemies.length - 1; j >= 0; j--) {
                const en = state.enemies[j];
                if (en.position.distanceTo(explodePos) < RADIUS) {
                    state.scene.remove(en);
                    state.entities = state.entities.filter(e => e !== en);
                    state.enemies.splice(j, 1);
                }
            }

            showMsg("BOOM!");
            sfx.shoot();
        }
    }

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

    // --- CROSSHAIR TARGETING (Matches Bullet Logic) ---
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        let targetAcquired = false;
        const isGun = state.inventoryTypes[state.selectedItemIdx] === 'gun';
        
        if (isGun && state.enemies.length > 0) {
            const ray = new THREE.Ray();
            ray.origin.copy(state.camera.position);
            state.camera.getWorldDirection(ray.direction);
            
            let nearestDist = 40;
            
            // Check Walls first for blockage
            for (const w of state.collidables) {
                const wBox = new THREE.Box3().setFromObject(w);
                const wallHit = ray.intersectBox(wBox, new THREE.Vector3());
                if (wallHit) {
                    const d = state.camera.position.distanceTo(wallHit);
                    if (d < nearestDist) nearestDist = d;
                }
            }
            
            // Check Enemies if they are closer than any wall
            for (const en of state.enemies) {
                const eCenter = new THREE.Vector3(en.position.x, en.position.y + 1.2, en.position.z);
                const eBox = new THREE.Box3().setFromCenterAndSize(eCenter, new THREE.Vector3(1.8, 2.8, 1.8));
                const enemyHit = ray.intersectBox(eBox, new THREE.Vector3());
                if (enemyHit) {
                    const d = state.camera.position.distanceTo(enemyHit);
                    if (d < nearestDist) {
                        targetAcquired = true;
                        break;
                    }
                }
            }
        }
        crosshair.style.borderColor = targetAcquired ? '#ff0000' : '#ffffff';
        crosshair.style.backgroundColor = targetAcquired ? 'rgba(255, 0, 0, 0.4)' : 'transparent';
        crosshair.style.boxShadow = targetAcquired ? '0 0 15px #ff0000' : 'none';
        crosshair.style.transform = targetAcquired ? 'translate(-50%, -50%) scale(1.4)' : 'translate(-50%, -50%) scale(1)';
    }

    // --- AMBIENT AUDIO PROXIMITY ---
    let lavaDist = 50, laserDist = 50, waterDist = 50;
    state.lavaPatches.forEach(lp => {
        const d = state.camera.position.distanceTo(new THREE.Vector3(lp.userData.cx, lp.userData.cy || 0, lp.userData.cz));
        if (d < lavaDist) lavaDist = d;
    });
    state.laserBeams.forEach(lb => {
        const d = state.camera.position.distanceTo(new THREE.Vector3(lb.userData.cx, lb.userData.cy || 0, lb.userData.cz));
        if (d < laserDist) laserDist = d;
    });
    if (state.waterBounds) {
        const dx = state.camera.position.x - state.waterBounds.center;
        const dz = state.camera.position.z - state.waterBounds.center;
        const d = Math.abs(Math.sqrt(dx*dx + dz*dz) - (state.waterBounds.in + state.waterBounds.out)/2);
        if (d < waterDist) waterDist = d;
    }
    ambient.lava.setVol(Math.max(0, Math.min(0.2, 0.6 - lavaDist / 12)));
    ambient.laser.setVol(Math.max(0, Math.min(0.15, 0.5 - laserDist / 10)));
    ambient.water.setVol(Math.max(0, Math.min(0.15, 0.4 - waterDist / 15)));
    
    // --- ABYSS FALL CHECK ---
    const worldMax = 150; // Half of world size 300
    const mazeCenter = (GRID_SIZE * CELL) / 2 - (CELL / 2);
    const distFromCenter = Math.max(
        Math.abs(state.camera.position.x - mazeCenter),
        Math.abs(state.camera.position.z - mazeCenter)
    );
    const isBeyondEdge = distFromCenter > worldMax + 5;
    
    // If we fly or walk off the edge, we lose flight and start the fall
    if (isBeyondEdge && !state.isFallingOffMap && !state.isPlayerOnBoat) {
        if (state.isFlying) {
            state.isFlying = false;
            showMsg("FLIGHT STALLED! THE ABYSS CONSUMES YOU!");
        }
        if (state.camera.position.y < -2) {
            state.isFallingOffMap = true;
            state.lastFallTime = Date.now();
        }
    }

    if (state.isFallingOffMap) {
        const elapsed = (Date.now() - state.lastFallTime) / 1000;
        state.camera.position.y -= elapsed * 1.5; // Gain speed
        if (ambient.wind) ambient.wind.setVol(Math.min(0.6, elapsed * 0.15));
        
        if (elapsed > 5.0) {
            state.isFallingOffMap = false;
            if (ambient.wind) ambient.wind.setVol(0);
            state.scene.background = new THREE.Color(0xff0000); // Lava floor
            handleDeath("FELL INTO THE LAVA DEPTHS!");
            setTimeout(() => { state.scene.background = new THREE.Color(0x87CEEB); }, 2000);
        }
    } else {
        if (ambient.wind) ambient.wind.setVol(0);
    }
    
    state.renderer.render(state.scene, state.camera);

    // --- ANIMATE CLOUDS ---
    if (state.clouds) {
        state.clouds.forEach(c => {
            c.position.x += c.userData.speed;
            if (c.position.x > 450) c.position.x = -450;
        });
    }

    // --- ANIMATE SELECTOR ---
    if (state.selectorMesh) {
        const item = state.inventoryTypes[state.selectedItemIdx];
        if (item === 'shovel' || item === 'pickaxe') {
            const dir = new THREE.Vector3();
            state.camera.getWorldDirection(dir);
            dir.y = 0; dir.normalize();
            
            if (item === 'shovel') {
                const reach = 3;
                const bx = Math.round(state.camera.position.x + dir.x * reach);
                const bz = Math.round(state.camera.position.z + dir.z * reach);
                let stackTop = 0;
                for (const w of state.collidables) {
                    if (w.userData.type === 'placed' && Math.abs(w.position.x - bx) < 0.1 && Math.abs(w.position.z - bz) < 0.1) {
                        stackTop = Math.max(stackTop, w.position.y + 0.5);
                    }
                }
                state.selectorMesh.position.set(bx, stackTop + 0.5, bz);
                state.selectorMesh.scale.set(1, 1, 1);
                state.selectorMesh.visible = true;
            } else {
                const ray = new THREE.Raycaster();
                ray.setFromCamera(new THREE.Vector2(0, 0), state.camera);
                const placed = state.collidables.filter(b => b.userData.type === 'placed');
                const hits = ray.intersectObjects(placed);
                if (hits.length > 0 && hits[0].distance < 4.5) {
                    state.selectorMesh.position.copy(hits[0].object.position);
                    state.selectorMesh.scale.set(1.1, 1.1, 1.1);
                    state.selectorMesh.visible = true;
                } else {
                    state.selectorMesh.visible = false;
                }
            }
        } else {
            state.selectorMesh.visible = false;
        }
    }
}
