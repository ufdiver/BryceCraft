import { state, GRID_SIZE, CELL } from './state.js';

export function updateHUD() {
    document.getElementById('lvl-val').innerText = state.currentLevel;
    document.getElementById('gold-val').innerText = state.gold;
    document.getElementById('lives-val').innerText = state.lives;
    document.getElementById('bomb-val').innerText = state.bombs;
    document.getElementById('keys-val').innerText = state.inventory.length ? state.inventory.join(", ") : "Empty";

    const item = state.inventoryTypes[state.selectedItemIdx];
    let available = true;
    if (item === 'gun') available = state.hasGun && state.ammo > 0;
    else if (item === 'grenade') available = state.grenades > 0;
    else if (item === 'bomb') available = state.bombs > 0;
    else if (item === 'pellet') available = state.invinciblePellets > 0;
    
    document.getElementById('item-name').innerText = available ? item.toUpperCase() : "HAND";

    const gunHUD = document.getElementById('gun-hud');
    if (state.hasGun) {
        gunHUD.style.display = 'block';
        document.getElementById('ammo-val').innerText = state.ammo;
    } else {
        gunHUD.style.display = 'none';
    }

    const grenadeHUD = document.getElementById('grenade-hud');
    if (state.grenades > 0) {
        grenadeHUD.style.display = 'block';
        document.getElementById('grenade-val').innerText = state.grenades;
    } else {
        grenadeHUD.style.display = 'none';
    }

    const pelletHUD = document.getElementById('pellet-hud');
    if (state.invinciblePellets > 0) {
        pelletHUD.style.display = 'block';
        document.getElementById('pellet-val').innerText = state.invinciblePellets;
    } else {
        pelletHUD.style.display = 'none';
    }

    const invHUD = document.getElementById('invincible-hud');
    if (state.invincibleTime > 0) {
        invHUD.style.display = 'block';
        document.getElementById('inv-time').innerText = Math.ceil(state.invincibleTime);
    } else {
        invHUD.style.display = 'none';
    }
}

export function showMsg(t) {
    const m = document.getElementById('msg');
    m.innerText = t;
    setTimeout(() => { if (m.innerText === t) m.innerText = ""; }, 2500);
}

export function drawMap() {
    const canvas = document.getElementById('map-canvas');
    const ctx = canvas.getContext('2d');
    const s = canvas.width / GRID_SIZE;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 300, 300);
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (state.explored[y][x]) {
                const isWall = state.collidables.some(w => Math.round(w.position.x / CELL) === x && Math.round(w.position.z / CELL) === y);
                ctx.fillStyle = isWall ? "#444" : "#fff";
                ctx.fillRect(x * s, y * s, s, s);
            }
        }
    }
    const px = (state.camera.position.x / CELL) * s;
    const py = (state.camera.position.z / CELL) * s;
    const ang = state.camera.rotation.y;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ang);
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(-s / 1.5, s / 1.5);
    ctx.lineTo(s / 1.5, s / 1.5);
    ctx.fill();
    ctx.restore();
}

export function toggleMap() {
    const m = document.getElementById('map-overlay');
    m.style.display = (m.style.display === 'block') ? 'none' : 'block';
    if (m.style.display === 'block') drawMap();
}

export function showHowTo() { document.getElementById('how-to-screen').style.display = 'flex'; }
export function hideHowTo() { document.getElementById('how-to-screen').style.display = 'none'; }
export function showAdmin() { document.getElementById('admin-screen').style.display = 'flex'; }
export function hideAdmin() { document.getElementById('admin-screen').style.display = 'none'; }
